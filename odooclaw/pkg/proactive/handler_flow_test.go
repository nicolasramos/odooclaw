package proactive

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// The three routes exist because the proactive loop has three distinct
// moments: decide (signal), deliver and persist (ack), and consent (optin).
// Before the ack and optin routes existed the invitation was never burned and
// the opt-in had no caller at all, so the assistant invited the user on every
// view open and could never say anything else. These tests pin the loop.

const helpdeskSignalBody = `{"user_id":7,"area":"helpdesk","model":"helpdesk.ticket",` +
	`"counters":{"new_tickets":3},"user":{"id":7,"is_internal":true,"is_active":true}}`

func newFlowHandler() *Handler {
	engine := NewEngine(DefaultPlaybooks(), DefaultPolicy(), NewMemoryStore())
	engine.SetClock(func() time.Time {
		return time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	})
	return NewHandler(NewService(engine, nil, nil), "", true)
}

func flowPost(t *testing.T, h *Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

func TestAckBurnsTheInvitation(t *testing.T) {
	h := newFlowHandler()

	w := flowPost(t, h, SignalPath, helpdeskSignalBody)
	if w.Code != http.StatusOK {
		t.Fatalf("signal: %d %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"invitation":true`) {
		t.Fatalf("the first signal must be an invitation, got %s", w.Body.String())
	}

	// Odoo posted the message and acks it. Only now does the invitation count.
	if w := flowPost(t, h, AckPath, `{"user_id":7,"area":"helpdesk","invitation":true}`); w.Code != http.StatusOK {
		t.Fatalf("ack: %d %s", w.Code, w.Body.String())
	}

	w = flowPost(t, h, SignalPath, helpdeskSignalBody)
	if strings.Contains(w.Body.String(), `"speak":true`) {
		t.Fatalf("the invitation repeated after the ack: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "ya se le invit") {
		t.Fatalf("unexpected silence reason after the ack: %s", w.Body.String())
	}
}

func TestWithoutAckTheInvitationIsNotBurned(t *testing.T) {
	h := newFlowHandler()

	if w := flowPost(t, h, SignalPath, helpdeskSignalBody); !strings.Contains(w.Body.String(), `"invitation":true`) {
		t.Fatalf("first signal: %s", w.Body.String())
	}
	// No ack: the host failed to post, so the user must be asked again rather
	// than lose the only invitation the assistant will ever send.
	w := flowPost(t, h, SignalPath, helpdeskSignalBody)
	if !strings.Contains(w.Body.String(), `"invitation":true`) {
		t.Fatalf("an unacked invitation was considered burned: %s", w.Body.String())
	}
}

func TestOptInMakesThePlaybookSpeak(t *testing.T) {
	h := newFlowHandler()

	if w := flowPost(t, h, SignalPath, helpdeskSignalBody); !strings.Contains(w.Body.String(), `"invitation":true`) {
		t.Fatalf("first signal: %s", w.Body.String())
	}
	if w := flowPost(t, h, AckPath, `{"user_id":7,"area":"helpdesk","invitation":true}`); w.Code != http.StatusOK {
		t.Fatalf("ack: %d %s", w.Code, w.Body.String())
	}
	if w := flowPost(t, h, OptInPath, `{"user_id":7}`); w.Code != http.StatusOK {
		t.Fatalf("optin: %d %s", w.Code, w.Body.String())
	}

	w := flowPost(t, h, SignalPath, helpdeskSignalBody)
	if w.Code != http.StatusOK {
		t.Fatalf("signal after optin: %d %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"speak":true`) {
		t.Fatalf("an opted-in user with helpdesk tickets was not spoken to: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "helpdesk.new_tickets") {
		t.Fatalf("the helpdesk playbook did not resolve: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "ticket") {
		t.Fatalf("the rendered offer is missing the counter text: %s", w.Body.String())
	}
}

func TestAckRecordsTheAreaCooldown(t *testing.T) {
	h := newFlowHandler()

	flowPost(t, h, SignalPath, helpdeskSignalBody)
	flowPost(t, h, AckPath, `{"user_id":7,"area":"helpdesk","invitation":true}`)
	flowPost(t, h, OptInPath, `{"user_id":7}`)

	if w := flowPost(t, h, SignalPath, helpdeskSignalBody); !strings.Contains(w.Body.String(), `"speak":true`) {
		t.Fatalf("the first intervention must speak: %s", w.Body.String())
	}
	// Odoo posts it and acks with the playbook (not an invitation).
	ack := `{"user_id":7,"area":"helpdesk","playbook_id":"helpdesk.new_tickets","invitation":false}`
	if w := flowPost(t, h, AckPath, ack); w.Code != http.StatusOK {
		t.Fatalf("ack: %d %s", w.Code, w.Body.String())
	}

	w := flowPost(t, h, SignalPath, helpdeskSignalBody)
	if strings.Contains(w.Body.String(), `"speak":true`) {
		t.Fatalf("the same area spoke again inside the cooldown: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "cooldown") {
		t.Fatalf("unexpected reason instead of the cooldown: %s", w.Body.String())
	}
}
