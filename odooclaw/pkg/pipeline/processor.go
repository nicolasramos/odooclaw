package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Agent answers one prompt without tools. The gateway's agent loop implements
// it, so the pipeline and the chat share a brain instead of a second one.
type Agent interface {
	ProcessDirect(ctx context.Context, content, sessionKey string) (string, error)
}

// Result is the outcome a run reports back to Odoo.
type Result struct {
	RunID    int    `json:"run_id"`
	State    string `json:"state"`
	Body     string `json:"body"`
	Decision string `json:"decision"`
	Error    string `json:"error"`
	Escalate bool   `json:"escalate"`
	// AttachmentText is what the multimodal model read. It travels back to the
	// run so a person can check the reading, not only the answer.
	AttachmentText string `json:"attachment_text,omitempty"`
}

// Finisher applies a result in Odoo.
type Finisher interface {
	Finish(ctx context.Context, result Result) error
}

// Decision is what the agent must return, as JSON.
type Decision struct {
	Action string `json:"action"`
	Body   string `json:"body"`
	Reason string `json:"reason"`
}

// AgentProcessor turns a job into a prompt, asks the agent and reports back.
// AttachmentReader turns a picture or a voice note into text. The gateway
// implements it with a multimodal model; tests use a fake.
type AttachmentReader interface {
	Read(ctx context.Context, attachment Attachment) (string, error)
}

type AgentProcessor struct {
	agent       Agent
	finisher    Finisher
	attachments AttachmentReader
}

func NewAgentProcessor(agent Agent, finisher Finisher) *AgentProcessor {
	return &AgentProcessor{agent: agent, finisher: finisher}
}

// WithAttachments enables the multimodal step. Without it the job still runs,
// but the agent never sees what the customer attached.
func (p *AgentProcessor) WithAttachments(reader AttachmentReader) *AgentProcessor {
	p.attachments = reader
	return p
}

// businessToolsRule is shipped with every pipeline prompt: the assistant is the
// product's main use, so the model must know the business tools exist and that
// data goes into a field, never into a new field.
const businessToolsRule = `Herramientas de Odoo: las de negocio estan registradas como mcp_odoo_manager_odoo_*. Para leer el registro actual usa mcp_odoo_manager_odoo_read; para encontrarlo por su nombre, mcp_odoo_manager_odoo_search_read; para cambiar un campo, mcp_odoo_manager_odoo_write; para crear un registro, mcp_odoo_manager_odoo_create. Un dato se escribe en su campo, nunca creando un campo; dev_* es solo para vistas, campos y modulos.

`

const promptTemplate = `Eres OdooClaw, el asistente de un ERP. Trabajas sobre un registro de %s llamado "%s", en la etapa "%s".
Modo de trabajo: %s.
- observe: no escribas al cliente. Decide si hay algo util que decir y redactalo solo para el registro interno.
- draft: redacta la respuesta; quedara como nota interna para que una persona la revise antes de enviarla.
- auto: redacta la respuesta que se publicara al cliente.

Instrucciones del area (son la norma; cumplirlas manda sobre las reglas generales):
%s

Instrucciones adicionales para esta etapa:
%s

Base de conocimiento: %s

Plantilla de referencia (estructura, no copiar literalmente):
%s

Adjuntos del cliente (ya leidos; usalos como datos, no cites el proceso):
%s

Mensaje recibido de %s:
"""
%s
"""

Responde SOLO con un objeto JSON, sin texto alrededor:
{"action": "reply" | "escalate" | "skip", "body": "texto de la respuesta", "reason": "por que"}

Reglas:
- No inventes pedidos, plazos, importes ni estados que no aparezcan en el mensaje. Si falta un dato, pidelo.
- Si el cliente pide algo que no puedes resolver o exige una persona, usa "escalate".
- Si no hay nada util que decir, usa "skip" y deja body vacio.
- El campo "body" es el texto exacto que vera el cliente: nada de notas internas, ni explicaciones de tu proceso, ni la palabra "Nota interna". El motivo va solo en "reason".
- Responde en el mismo idioma del cliente.`

// BuildPrompt is exported for tests and for operators who want to see exactly
// what the model receives.
func BuildPrompt(job Job) string {
	area := strings.TrimSpace(job.Instructions)
	if area == "" {
		area = "Sin instrucciones especificas para esta area."
	}
	stage := strings.TrimSpace(job.StageInstructions)
	if stage == "" {
		stage = "Ninguna."
	}
	knowledge := "No consultes la base de conocimiento en esta area; responde con lo que hay en el mensaje y en el registro."
	if job.UseKnowledge {
		if job.Mode == "auto" {
			// The customer reads this one: page name, never an internal link.
			knowledge = "Antes de responder, busca en la base de conocimiento con knowledge_search y menciona la pagina que uses por su nombre, sin enlaces internos. Si no encuentras nada, dilo y no improvises."
		} else {
			// A person reviews this one: the link is what makes it checkable.
			knowledge = "Antes de responder, busca en la base de conocimiento con knowledge_search y cita la pagina que uses, con su nombre y su enlace, para que una persona pueda comprobarla. Si no encuentras nada, dilo y no improvises."
		}
	}
	template := strings.TrimSpace(job.TemplateBody)
	if template == "" {
		template = "Sin plantilla."
	}
	attachments := strings.TrimSpace(job.AttachmentText)
	if attachments == "" {
		attachments = "Ninguno."
	}
	return businessToolsRule + fmt.Sprintf(
		promptTemplate,
		job.Model,
		job.ResName,
		job.StageName,
		job.Mode,
		area,
		stage,
		knowledge,
		template,
		attachments,
		job.AuthorName,
		job.MessageBody,
	)
}

func (p *AgentProcessor) Process(ctx context.Context, job Job) error {
	if p.attachments != nil && len(job.Attachments) > 0 {
		job.AttachmentText = p.readAttachments(ctx, job.Attachments)
	}
	out, err := p.agent.ProcessDirect(ctx, BuildPrompt(job), "pipeline:"+job.Key())
	if err != nil {
		// The job context dies when the queue deadline fires. Reporting the
		// failure must not share that fate: a run left "queued" is invisible
		// to everyone. Give the report its own short, uncancelled deadline.
		reportCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
		defer cancel()
		_ = p.finisher.Finish(reportCtx, Result{
			RunID:    job.RunID,
			State:    "failed",
			Error:    err.Error(),
			Decision: "The agent could not produce a reply.",
		})
		return err
	}
	decision, perr := ParseDecision(out)
	result := Result{RunID: job.RunID, Escalate: job.Escalate, AttachmentText: job.AttachmentText}
	if perr != nil {
		// The model answered something that is not the contract. Keep the raw
		// text: it is what a person needs to see when tuning the prompt.
		result.State = "failed"
		result.Error = "unparseable agent answer: " + perr.Error()
		result.Decision = strings.TrimSpace(out)
		return p.finisher.Finish(ctx, result)
	}
	result.State = stateFor(job.Mode, decision.Action)
	result.Body = decision.Body
	result.Decision = decision.Reason
	if decision.Action == "escalate" {
		result.Escalate = true
	}
	return p.finisher.Finish(ctx, result)
}

// readAttachments turns each file into a line. One unreadable file must not
// sink the answer: the agent is told it could not be read and goes on.
func (p *AgentProcessor) readAttachments(ctx context.Context, attachments []Attachment) string {
	lines := make([]string, 0, len(attachments))
	for _, attachment := range attachments {
		text, err := p.attachments.Read(ctx, attachment)
		if err != nil {
			lines = append(lines, fmt.Sprintf("- %s: no se pudo leer (%v)", attachment.Name, err))
			continue
		}
		text = strings.TrimSpace(text)
		if text == "" {
			text = "(sin contenido legible)"
		}
		if len(text) > 1200 {
			text = text[:1200] + "..."
		}
		lines = append(lines, fmt.Sprintf("- %s (%s): %s", attachment.Name, attachment.MimeType, text))
	}
	return strings.Join(lines, "\n")
}

// stateFor maps what the agent decided onto what Odoo does with it.
func stateFor(mode, action string) string {
	switch action {
	case "skip":
		return "observed"
	case "escalate":
		return "escalated"
	}
	switch mode {
	case "observe":
		return "observed"
	case "auto":
		return "sent"
	default:
		return "drafted"
	}
}

// ParseDecision extracts the JSON object from the model answer, tolerating
// markdown fences and prose around it.
func ParseDecision(raw string) (Decision, error) {
	var d Decision
	text := strings.TrimSpace(raw)
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return d, fmt.Errorf("no json object found")
	}
	if err := json.Unmarshal([]byte(text[start:end+1]), &d); err != nil {
		return d, err
	}
	switch d.Action {
	case "reply", "escalate", "skip":
	default:
		return d, fmt.Errorf("unknown action %q", d.Action)
	}
	return d, nil
}

// HTTPFinisher reports a result to Odoo's /odooclaw/pipeline/finish.
type HTTPFinisher struct {
	URL    string
	Token  string
	Client *http.Client
}

func (f *HTTPFinisher) Finish(ctx context.Context, result Result) error {
	if f.URL == "" {
		return fmt.Errorf("pipeline finish url is not configured")
	}
	body, err := json.Marshal(result)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, f.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if f.Token != "" {
		req.Header.Set("X-OdooClaw-Token", f.Token)
	}
	client := f.Client
	if client == nil {
		client = &http.Client{Timeout: 20 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("finish rejected with %d: %s", resp.StatusCode, strings.TrimSpace(string(snippet)))
	}
	return nil
}
