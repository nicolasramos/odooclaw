package proactive

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// newHandlerTest builds a handler wired to an engine with no opt-in, which is
// the state of a user who has never been asked anything.
func newHandlerTest(t *testing.T, token string) (*Handler, *time.Time) {
	t.Helper()
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	pol := DefaultPolicy()
	e := NewEngine(DefaultPlaybooks(), pol, NewMemoryStore())
	e.SetClock(func() time.Time { return now })
	svc := NewService(e, nil, nil)
	return NewHandler(svc, token, true), &now
}

func postSignal(t *testing.T, h *Handler, body string, token string) (int, SignalResponse) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, SignalPath, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("X-OdooClaw-Token", token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var resp SignalResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response was not JSON (%d): %s", rec.Code, rec.Body.String())
	}
	return rec.Code, resp
}

// TestHandlerAcceptsTheWireFormatOdooActuallySends guards the contract between
// controllers/proactive.py and this handler. If the field names drift, every
// request becomes a silent no-op: Odoo logs nothing wrong, the user is simply
// never helped, and the payload looks fine in isolation.
func TestHandlerAcceptsTheWireFormatOdooActuallySends(t *testing.T) {
	h, _ := newHandlerTest(t, "")

	// Byte-for-byte the shape Odoo posts: snake_case, counters as an object and
	// the classification nested under "user".
	body := `{
		"user_id": 7,
		"area": "contabilidad",
		"model": "account.move",
		"view_id": 123,
		"counters": {"unposted_invoices": 12},
		"user": {"id": 7, "is_internal": true, "is_active": true}
	}`

	code, resp := postSignal(t, h, body, "")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %+v)", code, resp)
	}
	if !resp.Speak {
		t.Fatalf("Odoo's real payload was not understood: %q", resp.Reason)
	}
	if !resp.Invitation {
		t.Fatal("first contact should be an invitation")
	}
	if resp.Area != "contabilidad" {
		t.Fatalf("area = %q, want contabilidad", resp.Area)
	}
	if resp.Message == "" {
		t.Fatal("a speaking decision must carry a message")
	}
}

func TestHandlerRejectsBadToken(t *testing.T) {
	h, _ := newHandlerTest(t, "s3cret")
	body := `{"user_id": 7, "area": "contabilidad", "user": {"id": 7, "is_internal": true, "is_active": true}}`

	code, _ := postSignal(t, h, body, "wrong")
	if code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401 with a wrong token", code)
	}

	// And the right token must work, so the check cannot pass by refusing all.
	code, _ = postSignal(t, h, body, "s3cret")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 with the right token", code)
	}
}

func TestHandlerRejectsNonPost(t *testing.T) {
	h, _ := newHandlerTest(t, "")
	req := httptest.NewRequest(http.MethodGet, SignalPath, nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

func TestHandlerRejectsMalformedJSONAndMissingUser(t *testing.T) {
	h, _ := newHandlerTest(t, "")

	if code, _ := postSignal(t, h, `{"user_id":`, ""); code != http.StatusBadRequest {
		t.Fatalf("malformed JSON: status = %d, want 400", code)
	}
	if code, _ := postSignal(t, h, `{"area":"contabilidad"}`, ""); code != http.StatusBadRequest {
		t.Fatalf("missing user_id: status = %d, want 400", code)
	}
}

// TestHandlerFailsClosedWithoutClassification is the security-relevant one. The
// classification is optional on the wire so an older Odoo keeps working, but a
// request without it must NOT be assumed internal — that would offer business
// figures to whoever the caller forgot to classify.
func TestHandlerFailsClosedWithoutClassification(t *testing.T) {
	h, _ := newHandlerTest(t, "")

	body := `{"user_id": 7, "area": "contabilidad", "counters": {"unposted_invoices": 12}}`
	code, resp := postSignal(t, h, body, "")

	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (silence is a 200)", code)
	}
	if resp.Speak {
		t.Fatal("spoke to an unclassified user; classification must fail closed")
	}
	if resp.Reason == "" {
		t.Fatal("a silence must carry an accountable reason")
	}
}

func TestHandlerSilentForPortalUser(t *testing.T) {
	h, _ := newHandlerTest(t, "")
	body := `{"user_id": 8, "area": "contabilidad",
		"counters": {"unposted_invoices": 12},
		"user": {"id": 8, "is_internal": false, "is_active": true}}`

	_, resp := postSignal(t, h, body, "")
	if resp.Speak {
		t.Fatal("offered help to a portal user, who is outside the DU audience")
	}
}

func TestHandlerSilentWhenDisabled(t *testing.T) {
	// A deployment can mount the route but keep the feature off. It must answer
	// 200 with a reason, not 404/500: Odoo treats a transport error as a real
	// failure and logs it, which would be noise on every single view open.
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	e := NewEngine(DefaultPlaybooks(), DefaultPolicy(), NewMemoryStore())
	e.SetClock(func() time.Time { return now })
	h := NewHandler(NewService(e, nil, nil), "", false)

	body := `{"user_id": 7, "area": "contabilidad", "user": {"id": 7, "is_internal": true, "is_active": true}}`
	code, resp := postSignal(t, h, body, "")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200 when disabled", code)
	}
	if resp.Speak {
		t.Fatal("spoke while disabled")
	}
}

func TestHandlerWithoutEngineRefusesCleanly(t *testing.T) {
	// A misconfigured deployment must degrade to silence, never to a 500: a view
	// open must not break because the assistant is missing.
	h := NewHandler(nil, "", true)
	body := `{"user_id": 7, "area": "contabilidad"}`

	code, resp := postSignal(t, h, body, "")
	if code != http.StatusOK {
		t.Fatalf("status = %d, want 200", code)
	}
	if resp.Speak || resp.Reason == "" {
		t.Fatalf("expected a silent decision with a reason, got %+v", resp)
	}
}

// TestHandlerDecidesButDoesNotDeliver pins the split that keeps this route safe:
// the handler must be able to answer without a deliverer configured at all.
// Odoo posts the message itself, inside the triggering user's request scope.
func TestHandlerDecidesButDoesNotDeliver(t *testing.T) {
	h, _ := newHandlerTest(t, "") // NewService(e, nil, nil): no deliverer
	body := `{"user_id": 7, "area": "contabilidad",
		"counters": {"unposted_invoices": 12},
		"user": {"id": 7, "is_internal": true, "is_active": true}}`

	code, resp := postSignal(t, h, body, "")
	if code != http.StatusOK || !resp.Speak {
		t.Fatalf("handler needed a deliverer to decide (code=%d, resp=%+v)", code, resp)
	}
	if resp.PlaybookID == "" {
		t.Fatal("a speaking decision must name the playbook that fired")
	}
}

// TestHandlerCarriesTheInvitationFlag ensures Odoo can tell the first contact
// apart from an intervention: the enable-suggestions affordance belongs only on
// the invitation.
func TestHandlerCarriesTheInvitationFlag(t *testing.T) {
	h, _ := newHandlerTest(t, "")
	base := `"area": "contabilidad", "counters": {"unposted_invoices": 12},
		"user": {"id": 7, "is_internal": true, "is_active": true}`

	_, first := postSignal(t, h, `{"user_id": 7, `+base+`}`, "")
	if !first.Invitation {
		t.Fatalf("first contact not flagged as an invitation: %+v", first)
	}
	if first.PlaybookID != invitationPlaybookID {
		t.Fatalf("playbook = %q, want the invitation id", first.PlaybookID)
	}
}
