package proactive

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// newTestEngine returns an engine with a user already opted in, using an
// in-memory store and a fixed clock.
func newTestEngine(t *testing.T) (*Engine, *MemoryStore, *time.Time) {
	t.Helper()
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	store := NewMemoryStore()
	pol := DefaultPolicy()
	pol.EnableOptIn(7)
	pol.AllowRisk(7, knowledge.RiskHigh)
	e := NewEngine(DefaultPlaybooks(), pol, store)
	// Pin a clock outside quiet hours so policy tests are not time-dependent.
	clock := now
	e.SetClock(func() time.Time { return clock })
	return e, store, &clock
}

func TestSpeaksWhenSignalAboveThreshold(t *testing.T) {
	e, _, _ := newTestEngine(t)

	dec := e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad",
		Counters: map[string]int{"unposted_invoices": 12},
	})

	if !dec.Speak {
		t.Fatalf("expected an intervention, got silence: %s", dec.Reason)
	}
	if dec.PlaybookID != "contabilidad.unposted_invoices" {
		t.Errorf("wrong playbook: %q", dec.PlaybookID)
	}
	if dec.Channel != "odoo_discuss_private" {
		t.Errorf("wrong channel: %q", dec.Channel)
	}
	if dec.Count != 12 {
		t.Errorf("expected count 12, got %d", dec.Count)
	}
	if !contains(dec.Message, "12") {
		t.Errorf("message should quote the counter: %q", dec.Message)
	}
}

// The failure that produces an assistant recommending the wrong thing: a
// generic counter must never reach a playbook from another area.
func TestDoesNotCrossAreas(t *testing.T) {
	e, _, _ := newTestEngine(t)

	// "unposted_invoices" belongs to contabilidad. Entering ventas with only
	// that counter must not fire the VeriFactu or contabilidad playbook.
	dec := e.Evaluate(Signal{
		UserID: 7, Area: "ventas",
		Counters: map[string]int{"unposted_invoices": 99, "verifactu_unconfigured": 1},
	})

	if dec.Speak {
		t.Fatalf("ventas fired a contabilidad/verifactu playbook: %s (%s)",
			dec.PlaybookID, dec.Message)
	}
}

func TestSilentWhenNoFunctionalArea(t *testing.T) {
	e, _, _ := newTestEngine(t)

	dec := e.Evaluate(Signal{
		UserID: 7, Area: "",
		Counters: map[string]int{"unposted_invoices": 50},
	})
	if dec.Speak {
		t.Fatalf("spoke without a functional area: %s", dec.Message)
	}
}

func TestSilentBelowThreshold(t *testing.T) {
	e, _, _ := newTestEngine(t)

	dec := e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad",
		Counters: map[string]int{"unposted_invoices": 3}, // threshold is 5
	})
	if dec.Speak {
		t.Fatalf("spoke below threshold: %s", dec.Reason)
	}
	if !contains(dec.Reason, "umbral") {
		t.Errorf("silence must carry an explainable reason, got %q", dec.Reason)
	}
}

func TestRequiresOptIn(t *testing.T) {
	e, store, _ := newTestEngine(t)

	// User 99 never opted in.
	dec := e.Evaluate(Signal{
		UserID: 99, Area: "contabilidad",
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if dec.Speak {
		t.Fatal("spoke to a user who never opted in")
	}
	_ = store
}

func TestCooldownPerArea(t *testing.T) {
	e, store, clock := newTestEngine(t)

	sig := Signal{
		UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unposted_invoices": 12},
	}

	dec := e.Evaluate(sig)
	if !dec.Speak {
		t.Fatalf("first evaluation should speak: %s", dec.Reason)
	}
	if err := e.Record(sig, dec); err != nil {
		t.Fatal(err)
	}

	// One hour later, same area: still in cooldown.
	*clock = clock.Add(time.Hour)
	dec = e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if dec.Speak {
		t.Fatalf("spoke inside the cooldown: %s", dec.Reason)
	}
	if !contains(dec.Reason, "cooldown") {
		t.Errorf("expected a cooldown reason, got %q", dec.Reason)
	}

	// 25 hours later the cooldown has expired, but dedupe now applies.
	*clock = clock.Add(25 * time.Hour)
	dec = e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if dec.Speak {
		t.Fatalf("repeated an offer already made: %s", dec.Reason)
	}
	if !contains(dec.Reason, "ya se le ofreció") {
		t.Errorf("expected a dedupe reason, got %q", dec.Reason)
	}
	_ = store
}

func TestDedupeDifferentPlaybookSameAreaStillAllowed(t *testing.T) {
	e, _, clock := newTestEngine(t)

	// Offer the invoices playbook.
	sig := Signal{UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unposted_invoices": 12}}
	dec := e.Evaluate(sig)
	if !dec.Speak {
		t.Fatalf("expected first offer: %s", dec.Reason)
	}
	if err := e.Record(sig, dec); err != nil {
		t.Fatal(err)
	}

	// The statement playbook is a DIFFERENT offer, but the per-area cooldown
	// still gates it — that is the intended anti-nuisance behaviour.
	dec = e.Evaluate(Signal{UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unreconciled_statement_lines": 9}})
	if dec.Speak {
		t.Fatalf("per-area cooldown did not gate a second offer: %s", dec.Reason)
	}
}

func TestQuietHours(t *testing.T) {
	e, _, clock := newTestEngine(t)

	// 22:00 is inside the default 21:00-08:00 window.
	*clock = time.Date(2026, 9, 25, 22, 0, 0, 0, time.UTC)
	dec := e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad", At: *clock,
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if dec.Speak {
		t.Fatalf("spoke during quiet hours: %s", dec.Reason)
	}
	if !contains(dec.Reason, "silêncio horario") {
		t.Errorf("expected a quiet-hours reason, got %q", dec.Reason)
	}
}

func TestDailyCap(t *testing.T) {
	e, _, clock := newTestEngine(t)
	e.policy.DailyCap = 2

	areas := []string{"contabilidad", "ventas", "compras"}
	counters := map[string]map[string]int{
		"contabilidad": {"unposted_invoices": 12},
		"ventas":       {"draft_quotations": 9},
		"compras":      {"draft_purchase_orders": 9},
	}

	spoke := 0
	for _, a := range areas {
		sig := Signal{UserID: 7, Area: a, At: *clock, Counters: counters[a]}
		dec := e.Evaluate(sig)
		if dec.Speak {
			spoke++
			if err := e.Record(sig, dec); err != nil {
				t.Fatal(err)
			}
		}
	}
	if spoke != 2 {
		t.Fatalf("daily cap of 2 allowed %d interventions", spoke)
	}

	// The third area must be silenced with a cap reason.
	dec := e.Evaluate(Signal{UserID: 7, Area: "compras", At: *clock,
		Counters: map[string]int{"draft_purchase_orders": 9}})
	if !contains(dec.Reason, "tope diario") {
		t.Errorf("expected a daily-cap reason, got %q", dec.Reason)
	}
}

func TestHighRiskRequiresExplicitOptIn(t *testing.T) {
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	pol := DefaultPolicy()
	pol.EnableOptIn(7) // general opt-in only, no risk authorisation
	e := NewEngine(DefaultPlaybooks(), pol, NewMemoryStore())
	e.SetClock(func() time.Time { return now })

	dec := e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad", At: now,
		Counters: map[string]int{"verifactu_unconfigured": 1},
	})
	if dec.Speak {
		t.Fatalf("high-risk playbook fired without explicit authorisation")
	}
	if !contains(dec.Reason, "riesgo alto") {
		t.Errorf("expected a risk reason, got %q", dec.Reason)
	}
}

func TestStoreDurabilityAcrossRestart(t *testing.T) {
	// The cooldown must survive a process restart; an in-memory map would
	// silently turn "once per day" into "once per deploy".
	dir := t.TempDir()
	path := dir + "/proactive.db"
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)

	store1, err := NewSQLiteStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store1.RecordSpoke(7, "contabilidad", "contabilidad.unposted_invoices", now); err != nil {
		t.Fatal(err)
	}
	if err := store1.Close(); err != nil {
		t.Fatal(err)
	}

	// "Restart": reopen the same file with a fresh engine.
	store2, err := NewSQLiteStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store2.Close()

	pol := DefaultPolicy()
	pol.EnableOptIn(7)
	e := NewEngine(DefaultPlaybooks(), pol, store2)
	e.SetClock(func() time.Time { return now.Add(2 * time.Hour) })

	dec := e.Evaluate(Signal{
		UserID: 7, Area: "contabilidad", At: now.Add(2 * time.Hour),
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if dec.Speak {
		t.Fatal("cooldown was forgotten across a restart")
	}
	if !contains(dec.Reason, "cooldown") {
		t.Errorf("expected a cooldown reason after restart, got %q", dec.Reason)
	}
}

func TestPhaseOneContabilidadCountersAreCovered(t *testing.T) {
	// Phase 1 ships four Contabilidad signals from the Odoo side
	// (data/odooclaw_proactive_data.xml). A counter with no playbook is a signal
	// that can never fire — the user is never offered help and nothing reports
	// an error. This pins the cross-repo contract.
	required := []string{
		"unposted_invoices",
		"unposted_vendor_bills",
		"unreconciled_statement_lines",
		"verifactu_unconfigured",
	}

	covered := map[string]bool{}
	for _, pb := range DefaultPlaybooks() {
		if pb.Area == "contabilidad" {
			covered[pb.SignalKey] = true
		}
	}

	for _, key := range required {
		if !covered[key] {
			t.Errorf("Contabilidad counter %q has no playbook: it can never fire", key)
		}
	}
}

func TestPlaybookAreasCoverKnowledgeAreas(t *testing.T) {
	// Every playbook must declare an area, otherwise it can never fire.
	for _, pb := range DefaultPlaybooks() {
		if pb.Area == "" {
			t.Errorf("playbook %s has no area", pb.ID)
		}
		if pb.SignalKey == "" {
			t.Errorf("playbook %s has no signal key", pb.ID)
		}
		if pb.MinCount <= 0 {
			t.Errorf("playbook %s has a non-positive threshold", pb.ID)
		}
		if pb.ID == "" {
			t.Errorf("playbook %q has no id", pb.Title)
		}
	}

	e, _, _ := newTestEngine(t)
	for _, a := range []string{"contabilidad", "ventas", "compras", "inventario", "rrhh"} {
		if !containsSlice(e.Areas(), a) {
			t.Errorf("area %q is not covered by any playbook", a)
		}
	}
}

// --- delivery ---

func TestDelivererSendsProactivePayload(t *testing.T) {
	var got notifyPayload
	var gotToken string
	var mu sync.Mutex

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		gotToken = r.Header.Get("X-OdooClaw-Token")
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	d := NewDeliverer(srv.URL, "secret123", srv.Client())
	sig := Signal{UserID: 7, Area: "contabilidad"}
	dec := Decision{Speak: true, PlaybookID: "contabilidad.unposted_invoices",
		Message: "hola", Count: 12}

	if err := d.Deliver(context.Background(), sig, dec); err != nil {
		t.Fatal(err)
	}

	mu.Lock()
	defer mu.Unlock()
	if got.UserID != 7 {
		t.Errorf("payload user_id = %d", got.UserID)
	}
	if got.Source != "proactive" {
		t.Errorf("payload source = %q, want proactive", got.Source)
	}
	if got.PlaybookID != "contabilidad.unposted_invoices" {
		t.Errorf("payload playbook = %q", got.PlaybookID)
	}
	if gotToken != "secret123" {
		t.Errorf("token header = %q", gotToken)
	}
}

func TestDelivererDoesNotInvokeCallbackOnFailure(t *testing.T) {
	// A rejected delivery must NOT commit the cooldown, otherwise a transient
	// Odoo outage would silence the assistant for a day.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"status":"error","reason":"Missing reply_token"}`))
	}))
	defer srv.Close()

	called := false
	d := NewDeliverer(srv.URL, "", srv.Client())
	d.OnDelivered = func(Signal, Decision) { called = true }

	err := d.Deliver(context.Background(), Signal{UserID: 7, Area: "contabilidad"},
		Decision{Speak: true, Message: "hola"})
	if err == nil {
		t.Fatal("expected an error on a 401 response")
	}
	if called {
		t.Fatal("OnDelivered fired despite a failed delivery")
	}
	if !contains(err.Error(), "401") {
		t.Errorf("error should carry the status: %v", err)
	}
}

func TestDelivererRefusesSilentDecision(t *testing.T) {
	d := NewDeliverer("http://example.invalid", "", nil)
	if err := d.Deliver(context.Background(), Signal{}, Decision{Speak: false}); err == nil {
		t.Fatal("delivered a silent decision")
	}
}

func TestServiceRecordsCooldownOnlyAfterSuccessfulDelivery(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	store := NewMemoryStore()
	pol := DefaultPolicy()
	pol.EnableOptIn(7)
	e := NewEngine(DefaultPlaybooks(), pol, store)
	e.SetClock(func() time.Time { return now })

	d := NewDeliverer(srv.URL, "", srv.Client())
	svc := NewService(e, nil, d)

	sig := Signal{UserID: 7, Area: "contabilidad", At: now,
		Counters: map[string]int{"unposted_invoices": 12}}

	dec, err := svc.Handle(context.Background(), sig)
	if err != nil {
		t.Fatal(err)
	}
	if !dec.Speak {
		t.Fatalf("service did not speak: %s", dec.Reason)
	}

	// A second call must now be gated by the recorded cooldown.
	dec2, err := svc.Handle(context.Background(), sig)
	if err != nil {
		t.Fatal(err)
	}
	if dec2.Speak {
		t.Fatal("cooldown was not recorded after delivery")
	}
}

func TestServiceEnrichesWithKnowledgeByArea(t *testing.T) {
	kb, err := knowledge.NewKnowledgeBase()
	if err != nil {
		t.Fatal(err)
	}
	defer kb.Close()

	if err := kb.Add(knowledge.KnowledgeEntry{
		Category: knowledge.CatWorkflow,
		Title:    "VeriFactu: plazos vigentes",
		Content:  "Los plazos vigentes son 1-ene-2027 para sociedades y 1-jul-2027 para el resto.",
		Metadata: map[string]string{"area": "contabilidad", "module": "account"},
	}); err != nil {
		t.Fatal(err)
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	pol := DefaultPolicy()
	pol.EnableOptIn(7)
	e := NewEngine(DefaultPlaybooks(), pol, NewMemoryStore())
	e.SetClock(func() time.Time { return now })

	svc := NewService(e, kb, NewDeliverer(srv.URL, "", srv.Client()))
	dec, err := svc.Handle(context.Background(), Signal{
		UserID: 7, Area: "contabilidad", At: now,
		Counters: map[string]int{"unposted_invoices": 12},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !contains(dec.Message, "1-ene-2027") {
		t.Errorf("offer was not enriched from the area's knowledge: %q", dec.Message)
	}
}

// --- helpers ---

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(h, n string) int {
	for i := 0; i+len(n) <= len(h); i++ {
		if h[i:i+len(n)] == n {
			return i
		}
	}
	return -1
}

func containsSlice(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
