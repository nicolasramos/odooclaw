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
type AgentProcessor struct {
	agent    Agent
	finisher Finisher
}

func NewAgentProcessor(agent Agent, finisher Finisher) *AgentProcessor {
	return &AgentProcessor{agent: agent, finisher: finisher}
}

const promptTemplate = `Eres OdooClaw, el asistente de un ERP. Trabajas sobre un registro de %s llamado "%s", en la etapa "%s".
Modo de trabajo: %s.
- observe: no escribas al cliente. Decide si hay algo útil que decir y redáctalo solo para el registro interno.
- draft: redacta la respuesta; quedará como nota interna para que una persona la revise antes de enviarla.
- auto: redacta la respuesta que se publicará al cliente.

Mensaje recibido de %s:
"""
%s
"""

Responde SOLO con un objeto JSON, sin texto alrededor:
{"action": "reply" | "escalate" | "skip", "body": "texto de la respuesta", "reason": "por qué"}

Reglas:
- No inventes pedidos, plazos, importes ni estados que no aparezcan en el mensaje. Si falta un dato, pídelo.
- Si el cliente pide algo que no puedes resolver o exige una persona, usa "escalate".
- Si no hay nada útil que decir, usa "skip" y deja body vacío.
- Responde en el mismo idioma del cliente.`

// BuildPrompt is exported for tests and for operators who want to see exactly
// what the model receives.
func BuildPrompt(job Job) string {
	return fmt.Sprintf(
		promptTemplate,
		job.Model,
		job.ResName,
		job.StageName,
		job.Mode,
		job.AuthorName,
		job.MessageBody,
	)
}

func (p *AgentProcessor) Process(ctx context.Context, job Job) error {
	out, err := p.agent.ProcessDirect(ctx, BuildPrompt(job), "pipeline:"+job.Key())
	if err != nil {
		_ = p.finisher.Finish(ctx, Result{
			RunID:    job.RunID,
			State:    "failed",
			Error:    err.Error(),
			Decision: "The agent could not produce a reply.",
		})
		return err
	}
	decision, perr := ParseDecision(out)
	result := Result{RunID: job.RunID, Escalate: job.Escalate}
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
