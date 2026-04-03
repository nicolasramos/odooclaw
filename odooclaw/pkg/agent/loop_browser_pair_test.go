package agent

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/bus"
)

func TestHandleCommandBrowserPairReturnsCode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/browser-copilot/pairing/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"code":"ABC123","expires_at":"2026-03-27T16:00:00Z","channel":"odoo","chat_id":"res.partner_42"}`))
	}))
	defer server.Close()

	oldURL := os.Getenv("BROWSER_COPILOT_INTERNAL_URL")
	oldToken := os.Getenv("BROWSER_COPILOT_TOKEN")
	t.Cleanup(func() {
		_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", oldURL)
		_ = os.Setenv("BROWSER_COPILOT_TOKEN", oldToken)
	})
	_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", server.URL)
	_ = os.Setenv("BROWSER_COPILOT_TOKEN", "test-token")

	al := &AgentLoop{}
	response, handled := al.handleCommand(context.Background(), bus.InboundMessage{
		Channel:  "odoo",
		ChatID:   "res.partner_42",
		SenderID: "18",
		Content:  "/browser-pair",
	})

	if !handled {
		t.Fatal("expected /browser-pair to be handled")
	}
	if !strings.Contains(response, "ABC123") {
		t.Fatalf("expected pairing code in response, got: %s", response)
	}
}

func TestProcessMessageAnswersVisibleOrderDeterministically(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/browser-copilot/context/resolve" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"found":true,"page_title":"(1) S00026","visible_text_summary":"Importe base: $50.000,00 Impuesto 15 %: $3.000,00 Total: $53.000,00","app":{"detected":"odoo","probable_record_name":"S00026","confidence":0.9}}`))
	}))
	defer server.Close()

	oldURL := os.Getenv("BROWSER_COPILOT_INTERNAL_URL")
	oldToken := os.Getenv("BROWSER_COPILOT_TOKEN")
	t.Cleanup(func() {
		_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", oldURL)
		_ = os.Setenv("BROWSER_COPILOT_TOKEN", oldToken)
	})
	_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", server.URL)
	_ = os.Setenv("BROWSER_COPILOT_TOKEN", "test-token")

	al := &AgentLoop{}
	response, err := al.processMessage(context.Background(), bus.InboundMessage{
		Channel:  "odoo",
		ChatID:   "discuss.channel_100",
		SenderID: "2",
		Content:  "qué pedido tengo en pantalla",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(response, "S00026") {
		t.Fatalf("expected visible record in response, got: %s", response)
	}
	if !strings.Contains(response, "pedido") {
		t.Fatalf("expected order label in response, got: %s", response)
	}
	if !strings.Contains(response, "$53.000,00") {
		t.Fatalf("expected visible total in response, got: %s", response)
	}
}

func TestProcessMessageAnswersVisibleTotalDeterministically(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/browser-copilot/context/resolve" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"found":true,"visible_text_summary":"Importe base: $50.000,00 Impuesto 15 %: $3.000,00 Total: $53.000,00","app":{"detected":"odoo","probable_record_name":"S00026","confidence":0.9}}`))
	}))
	defer server.Close()

	oldURL := os.Getenv("BROWSER_COPILOT_INTERNAL_URL")
	oldToken := os.Getenv("BROWSER_COPILOT_TOKEN")
	t.Cleanup(func() {
		_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", oldURL)
		_ = os.Setenv("BROWSER_COPILOT_TOKEN", oldToken)
	})
	_ = os.Setenv("BROWSER_COPILOT_INTERNAL_URL", server.URL)
	_ = os.Setenv("BROWSER_COPILOT_TOKEN", "test-token")

	al := &AgentLoop{}
	response, err := al.processMessage(context.Background(), bus.InboundMessage{
		Channel:  "odoo",
		ChatID:   "discuss.channel_100",
		SenderID: "2",
		Content:  "suma el total de lo que tengo en pantalla",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(response, "$53.000,00") {
		t.Fatalf("expected visible total in response, got: %s", response)
	}
}
