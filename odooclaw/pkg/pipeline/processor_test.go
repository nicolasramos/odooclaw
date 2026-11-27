package pipeline

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeAgent struct {
	reply       string
	err         error
	lastPrompt  string
	lastSession string
}

func (f *fakeAgent) ProcessDirect(ctx context.Context, content, sessionKey string) (string, error) {
	f.lastPrompt = content
	f.lastSession = sessionKey
	return f.reply, f.err
}

type fakeFinisher struct {
	results []Result
	ctxErrs []error
}

func (f *fakeFinisher) Finish(ctx context.Context, result Result) error {
	f.results = append(f.results, result)
	f.ctxErrs = append(f.ctxErrs, ctx.Err())
	return nil
}

func docJob(mode string) Job {
	return Job{
		RunID:       7,
		Model:       "helpdesk.ticket",
		ResID:       3,
		ResName:     "Printer does not turn on",
		MessageID:   42,
		MessageBody: "Hello, the printer you sold me does not turn on.",
		AuthorName:  "Ana",
		StageName:   "In Progress",
		Mode:        mode,
	}
}

func runProcessor(t *testing.T, mode, agentReply string, agentErr error) (fakeFinisher, fakeAgent) {
	t.Helper()
	agent := fakeAgent{reply: agentReply, err: agentErr}
	finisher := fakeFinisher{}
	processor := NewAgentProcessor(&agent, &finisher)
	job := docJob(mode)
	if err := processor.Process(context.Background(), job); agentErr == nil {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if len(finisher.results) != 1 {
		t.Fatalf("expected exactly one result, got %d", len(finisher.results))
	}
	if finisher.results[0].RunID != job.RunID {
		t.Fatalf("result must carry the run id, got %+v", finisher.results[0])
	}
	return finisher, agent
}

func TestDraftModeProducesADraft(t *testing.T) {
	finisher, agent := runProcessor(t, "draft",
		`{"action":"reply","body":"Please send us the serial number.","reason":"Missing data."}`, nil)
	if finisher.results[0].State != "drafted" {
		t.Fatalf("expected drafted, got %s", finisher.results[0].State)
	}
	if !strings.Contains(finisher.results[0].Body, "serial number") {
		t.Fatalf("body lost: %+v", finisher.results[0])
	}
	if !strings.Contains(agent.lastSession, "pipeline:") {
		t.Fatalf("pipeline runs must not share the chat session, got %q", agent.lastSession)
	}
}

func TestObserveModeNeverSends(t *testing.T) {
	finisher, _ := runProcessor(t, "observe",
		`{"action":"reply","body":"A reply nobody asked to send.","reason":"Worth logging."}`, nil)
	if finisher.results[0].State != "observed" {
		t.Fatalf("expected observed, got %s", finisher.results[0].State)
	}
}

func TestAutoModeSends(t *testing.T) {
	finisher, _ := runProcessor(t, "auto",
		`{"action":"reply","body":"It ships tomorrow.","reason":"Answered."}`, nil)
	if finisher.results[0].State != "sent" {
		t.Fatalf("expected sent, got %s", finisher.results[0].State)
	}
}

func TestEscalateWinsOverTheMode(t *testing.T) {
	finisher, _ := runProcessor(t, "auto",
		`{"action":"escalate","reason":"The customer asks for a refund."}`, nil)
	if finisher.results[0].State != "escalated" {
		t.Fatalf("expected escalated, got %s", finisher.results[0].State)
	}
	if !finisher.results[0].Escalate {
		t.Fatal("escalate flag must be set")
	}
}

func TestSkipIsObserved(t *testing.T) {
	finisher, _ := runProcessor(t, "auto",
		`{"action":"skip","reason":"Nothing useful to add."}`, nil)
	if finisher.results[0].State != "observed" {
		t.Fatalf("expected observed, got %s", finisher.results[0].State)
	}
}

func TestParseDecisionToleratesFences(t *testing.T) {
	raw := "```json\n{\"action\":\"reply\",\"body\":\"Hola\"}\n```"
	d, err := ParseDecision(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Action != "reply" || d.Body != "Hola" {
		t.Fatalf("unexpected decision: %+v", d)
	}
}

func TestProseAnswerBecomesTheDraftBody(t *testing.T) {
	// The model answered in prose instead of the JSON contract. That prose is
	// the answer a person wants to read; failing the run loses it.
	finisher, _ := runProcessor(t, "draft", "I think you should call the customer.", nil)
	if finisher.results[0].State != "drafted" {
		t.Fatalf("expected drafted, got %s", finisher.results[0].State)
	}
	if finisher.results[0].Body != "I think you should call the customer." {
		t.Fatalf("body = %q", finisher.results[0].Body)
	}
}

func TestEmptyAnswerIsAFailedRun(t *testing.T) {
	finisher, _ := runProcessor(t, "draft", "   ", nil)
	if finisher.results[0].State != "failed" {
		t.Fatalf("expected failed, got %s", finisher.results[0].State)
	}
	if !strings.Contains(finisher.results[0].Error, "empty answer") {
		t.Fatalf("error must explain the empty answer, got %q", finisher.results[0].Error)
	}
}

func TestAgentErrorIsAFailedRun(t *testing.T) {
	agent := fakeAgent{err: context.DeadlineExceeded}
	finisher := fakeFinisher{}
	processor := NewAgentProcessor(&agent, &finisher)
	err := processor.Process(context.Background(), docJob("draft"))
	if err == nil {
		t.Fatal("the error must be returned so the queue can retry")
	}
	if finisher.results[0].State != "failed" {
		t.Fatalf("expected failed, got %s", finisher.results[0].State)
	}
}

func TestPromptCarriesTheCustomerMessage(t *testing.T) {
	_, agent := runProcessor(t, "draft", `{"action":"skip"}`, nil)
	for _, want := range []string{"Printer does not turn on", "Ana", "draft", "helpdesk.ticket"} {
		if !strings.Contains(agent.lastPrompt, want) {
			t.Fatalf("prompt is missing %q:\n%s", want, agent.lastPrompt)
		}
	}
}

func TestHTTPFinisherPostsTheResult(t *testing.T) {
	var got Result
	var token string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token = r.Header.Get("X-OdooClaw-Token")
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	finisher := &HTTPFinisher{URL: server.URL, Token: "secret"}
	err := finisher.Finish(context.Background(), Result{
		RunID: 9, State: "drafted", Body: "Hola", Decision: "Answered.",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != "secret" {
		t.Fatalf("token not sent, got %q", token)
	}
	if got.RunID != 9 || got.State != "drafted" || got.Body != "Hola" {
		t.Fatalf("payload mangled: %+v", got)
	}
}

func TestPromptInjectsAreaAndStageInstructions(t *testing.T) {
	job := docJob("draft")
	job.Instructions = "Never quote prices or delivery dates."
	job.StageInstructions = "Ask for the order number first."
	job.UseKnowledge = true
	job.TemplateBody = "Dear customer, regarding your order..."
	prompt := BuildPrompt(job)
	for _, want := range []string{
		"Never quote prices or delivery dates.",
		"Ask for the order number first.",
		"knowledge_search",
		"Dear customer, regarding your order...",
	} {
		if !strings.Contains(prompt, want) {
			t.Fatalf("prompt is missing %q: %s", want, prompt)
		}
	}
}

func TestPromptForbidsKnowledgeWhenDisabled(t *testing.T) {
	job := docJob("draft")
	job.UseKnowledge = false
	prompt := BuildPrompt(job)
	if !strings.Contains(prompt, "No consultes la base de conocimiento") {
		t.Fatalf("prompt must forbid the knowledge base when disabled: %s", prompt)
	}
	if strings.Contains(prompt, "knowledge_search y cita") {
		t.Fatalf("prompt must not invite knowledge_search when disabled")
	}
}

func TestPromptForbidsInternalNotesInTheBody(t *testing.T) {
	prompt := BuildPrompt(docJob("auto"))
	if !strings.Contains(prompt, "texto exacto que vera el cliente") {
		t.Fatalf("prompt must forbid internal notes in the body")
	}
}

func TestPromptCitationDependsOnTheMode(t *testing.T) {
	draft := docJob("draft")
	draft.UseKnowledge = true
	if !strings.Contains(BuildPrompt(draft), "con su nombre y su enlace") {
		t.Fatalf("draft prompts must ask for a checkable link")
	}
	auto := docJob("auto")
	auto.UseKnowledge = true
	if !strings.Contains(BuildPrompt(auto), "sin enlaces internos") {
		t.Fatalf("auto prompts must not give the customer an internal link")
	}
}

func TestPromptCarriesWhatTheAttachmentsSaid(t *testing.T) {
	job := docJob("draft")
	job.AttachmentText = "- voz.ogg (audio/ogg): El cliente pide el estado de su pedido."
	prompt := BuildPrompt(job)
	if !strings.Contains(prompt, "Adjuntos del cliente") || !strings.Contains(prompt, "estado de su pedido") {
		t.Fatalf("prompt lost the attachment text")
	}
}

func TestPromptWithoutAttachmentsSaysSo(t *testing.T) {
	if !strings.Contains(BuildPrompt(docJob("draft")), "Adjuntos del cliente") {
		t.Fatal("the section must be present even when empty")
	}
}

func TestProcessorReportsWhatTheAttachmentsSaid(t *testing.T) {
	agent := fakeAgent{reply: `{"action":"reply","body":"Gracias por la factura.","reason":"leida"}`}
	finisher := fakeFinisher{}
	reader := fakeReader{texts: map[string]string{"factura.png": "Factura de Acme, total 121,00"}}
	processor := NewAgentProcessor(&agent, &finisher).WithAttachments(reader)
	job := docJob("draft")
	job.Attachments = []Attachment{{Name: "factura.png", MimeType: "image/png", Data: "eA=="}}
	if err := processor.Process(context.Background(), job); err != nil {
		t.Fatalf("process: %v", err)
	}
	if len(finisher.results) != 1 {
		t.Fatalf("expected one result, got %d", len(finisher.results))
	}
	if !strings.Contains(finisher.results[0].AttachmentText, "121,00") {
		t.Fatalf("the result lost what the model read: %q", finisher.results[0].AttachmentText)
	}
}

func TestPromptAlwaysCarriesTheBusinessTools(t *testing.T) {
	prompt := BuildPrompt(docJob("draft"))
	for _, want := range []string{"mcp_odoo_manager_odoo_write", "mcp_odoo_manager_odoo_search_read"} {
		if !strings.Contains(prompt, want) {
			t.Fatalf("the assistant tools must be in every prompt, missing %q: %s", want, prompt)
		}
	}
}

func TestProcessReportsFailureAfterTheJobContextIsCancelled(t *testing.T) {
	// A fire-and-forget start that never finishes is worse than a failure:
	// the run stays "queued" and nobody sees it. The report must go out even
	// when the job deadline has already cancelled the job context.
	agent := fakeAgent{err: context.DeadlineExceeded}
	finisher := &fakeFinisher{}
	processor := NewAgentProcessor(&agent, finisher)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := processor.Process(ctx, docJob("draft")); err == nil {
		t.Fatal("expected the agent error to surface")
	}
	if len(finisher.results) != 1 {
		t.Fatalf("expected one report, got %d", len(finisher.results))
	}
	if finisher.results[0].State != "failed" {
		t.Fatalf("state = %q, want failed", finisher.results[0].State)
	}
	if finisher.ctxErrs[0] != nil {
		t.Fatalf("report used the cancelled job context: %v", finisher.ctxErrs[0])
	}
}
