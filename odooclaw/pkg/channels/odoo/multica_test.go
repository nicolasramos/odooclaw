package odoo

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

// multicaTestServer records every creation request the cable sends.
type multicaTestServer struct {
	server    *httptest.Server
	creations chan multicaRecord
	mu        sync.Mutex
	attempts  int
	statusFor func(attempt int) int // attempt is 1-based; default 200
}

type multicaRecord struct {
	Auth        string
	Title       string
	Description string
	ProjectID   string
}

func newMulticaTestServer(t *testing.T) *multicaTestServer {
	t.Helper()
	ms := &multicaTestServer{creations: make(chan multicaRecord, 16)}
	ms.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/issues" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		ms.mu.Lock()
		ms.attempts++
		attempt := ms.attempts
		status := http.StatusOK
		if ms.statusFor != nil {
			status = ms.statusFor(attempt)
		}
		ms.mu.Unlock()

		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("multica test server: bad JSON: %v", err)
		}
		rec := multicaRecord{
			Auth:        r.Header.Get("Authorization"),
			Title:       body["title"],
			Description: body["description"],
			ProjectID:   body["project_id"],
		}
		if status == http.StatusOK {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"id":"01a1dead","identifier":"NRA-9001","number":9001}`))
		} else {
			w.WriteHeader(status)
			w.Write([]byte(`{"error":"boom"}`))
		}
		ms.creations <- rec
	}))
	t.Cleanup(ms.server.Close)
	return ms
}

func (ms *multicaTestServer) wait(t *testing.T, timeout time.Duration) (multicaRecord, bool) {
	t.Helper()
	select {
	case rec := <-ms.creations:
		return rec, true
	case <-time.After(timeout):
		return multicaRecord{}, false
	}
}

func (ms *multicaTestServer) count() int {
	ms.mu.Lock()
	defer ms.mu.Unlock()
	return ms.attempts
}

func multicaEnabledConfig(url string) config.MulticaConfig {
	return config.MulticaConfig{
		Enabled:   true,
		BaseURL:   url,
		Token:     "mat_cable_test",
		ProjectID: "proj-client-1",
	}
}

const discussPayload = `{"message_id":501,"model":"discuss.channel","res_id":77,"author_id":5,"author_user_id":6,"author_name":"Alba Client","body":"necesito un informe semanal de ventas","is_dm":true,"reply_token":"tok-501"}`

func postDiscuss(t *testing.T, channel *OdooChannel) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(discussPayload))
	w := httptest.NewRecorder()
	channel.ServeHTTP(w, req)
	return w
}

// Acceptance 1 + 2: one message creates exactly one Multica issue carrying the
// literal text, the sender and the channel; resending the same message creates
// no second issue.
func TestMulticaCableCreatesExactlyOneIssuePerMessage(t *testing.T) {
	ms := newMulticaTestServer(t)
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{TargetDB: "clientdb"}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	channel.SetMultica(multicaEnabledConfig(ms.server.URL))

	w := postDiscuss(t, channel)
	if w.Code != http.StatusOK {
		t.Fatalf("first ServeHTTP() status = %d, want 200", w.Code)
	}
	consumeInbound(t, messageBus)

	rec, ok := ms.wait(t, 2*time.Second)
	if !ok {
		t.Fatal("expected one Multica creation, got none")
	}
	if rec.Auth != "Bearer mat_cable_test" {
		t.Errorf("Authorization = %q", rec.Auth)
	}
	if rec.ProjectID != "proj-client-1" {
		t.Errorf("project_id = %q, want proj-client-1", rec.ProjectID)
	}
	if !strings.Contains(rec.Description, "necesito un informe semanal de ventas") {
		t.Errorf("description must carry the literal message text, got %q", rec.Description)
	}
	if !strings.Contains(rec.Description, "Alba Client") {
		t.Errorf("description must name the sender, got %q", rec.Description)
	}
	if !strings.Contains(rec.Description, "discuss.channel") || !strings.Contains(rec.Description, "77") {
		t.Errorf("description must name the channel (model + res_id), got %q", rec.Description)
	}

	// Same message again: must not create a second issue.
	w = postDiscuss(t, channel)
	if w.Code != http.StatusOK {
		t.Fatalf("second ServeHTTP() status = %d, want 200", w.Code)
	}
	consumeInbound(t, messageBus)

	if _, unexpected := ms.wait(t, 300*time.Millisecond); unexpected {
		t.Fatal("resending the same message created a second Multica issue")
	}
	if got := ms.count(); got != 1 {
		t.Fatalf("creation count = %d, want 1", got)
	}
}

// Acceptance 3: when Multica rejects the request (invalid token), the webhook
// still answers 200, the conversation keeps going, and the failure is logged.
func TestMulticaCableFailureKeepsConversation(t *testing.T) {
	ms := newMulticaTestServer(t)
	ms.statusFor = func(int) int { return http.StatusUnauthorized }

	capture := &recordingHandler{}
	restore := slog.Default()
	slog.SetDefault(slog.New(capture))
	defer slog.SetDefault(restore)

	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	channel.SetMultica(multicaEnabledConfig(ms.server.URL))

	w := postDiscuss(t, channel)
	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want 200 even when Multica fails", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"status":"ok"`) {
		t.Errorf("body = %q, want the normal ok response", w.Body.String())
	}

	// The conversation continues: the message still reaches the bus.
	consumeInbound(t, messageBus)

	// The attempt happened and failed.
	if _, attempted := ms.wait(t, 2*time.Second); !attempted {
		t.Fatal("expected the cable to attempt creation")
	}

	// The failure was logged by the engine.
	deadline := time.Now().Add(2 * time.Second)
	for {
		if capture.hasContaining("multica") {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("expected a log line about the multica failure")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// A failed attempt must not burn the dedupe mark: resending the same message
// after Multica recovers creates the issue exactly once.
func TestMulticaCableRetriesSameMessageAfterFailure(t *testing.T) {
	ms := newMulticaTestServer(t)
	ms.statusFor = func(attempt int) int {
		if attempt == 1 {
			return http.StatusInternalServerError
		}
		return http.StatusOK
	}

	capture := &recordingHandler{}
	restore := slog.Default()
	slog.SetDefault(slog.New(capture))
	defer slog.SetDefault(restore)

	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	channel.SetMultica(multicaEnabledConfig(ms.server.URL))

	postDiscuss(t, channel)
	consumeInbound(t, messageBus)
	if _, attempted := ms.wait(t, 2*time.Second); !attempted {
		t.Fatal("expected first attempt")
	}
	// Wait until the failure has been fully handled (dedupe mark released)
	// before resending, so the retry is deterministic.
	if !capture.waitContaining(t, 2*time.Second, "could not file client request") {
		t.Fatal("expected the first attempt to be logged as failed")
	}

	postDiscuss(t, channel)
	consumeInbound(t, messageBus)
	if _, ok := ms.wait(t, 2*time.Second); !ok {
		t.Fatal("expected second attempt to succeed after Multica recovered")
	}
	// No third creation.
	if _, extra := ms.wait(t, 300*time.Millisecond); extra {
		t.Fatal("unexpected extra creation")
	}
}

// With the cable disabled (no config), nothing is sent and the conversation
// is untouched.
func TestMulticaCableDisabledSendsNothing(t *testing.T) {
	ms := newMulticaTestServer(t)
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	postDiscuss(t, channel)
	consumeInbound(t, messageBus)
	if _, unexpected := ms.wait(t, 300*time.Millisecond); unexpected {
		t.Fatal("disabled cable must not call Multica")
	}
}

func consumeInbound(t *testing.T, messageBus *bus.MessageBus) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()
	if _, ok := messageBus.ConsumeInbound(ctx); !ok {
		t.Fatal("expected the message to reach the bus (conversation must continue)")
	}
}

// recordingHandler collects slog records so tests can assert failure logging.
type recordingHandler struct {
	mu      sync.Mutex
	records []slog.Record
}

func (h *recordingHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h *recordingHandler) Handle(_ context.Context, r slog.Record) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.records = append(h.records, r.Clone())
	return nil
}

func (h *recordingHandler) WithAttrs([]slog.Attr) slog.Handler { return h }
func (h *recordingHandler) WithGroup(string) slog.Handler      { return h }

func (h *recordingHandler) hasContaining(sub string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, r := range h.records {
		if strings.Contains(strings.ToLower(r.Message), strings.ToLower(sub)) {
			return true
		}
	}
	return false
}

func (h *recordingHandler) waitContaining(t *testing.T, timeout time.Duration, sub string) bool {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for {
		if h.hasContaining(sub) {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(10 * time.Millisecond)
	}
}
