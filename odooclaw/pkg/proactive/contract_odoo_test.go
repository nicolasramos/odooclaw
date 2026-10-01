package proactive

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// TestSignalFromOdooMatchesItsPlaybook is the cross-repo contract test.
//
// Why this test exists and why it is not a duplicate of the engine tests: the
// area key is a CONTRACT shared with Odoo (mail.odooclaw.area.area travels in
// the signal payload and selects the playbook). Each side can rename it in
// isolation while both suites stay green, because the engine tests build their
// signals from the same literals the playbooks declare — so a rename that breaks
// the pairing is invisible to them. The failure mode is silence: match() finds
// no playbook for the area and the assistant says nothing, with no error
// anywhere to grep for.
//
// The payloads below are the area values and counter keys odoo-addons ships as
// data (mail_bot_odooclaw_*/data/odooclaw_proactive_*_data.xml,
// signal_definition). Renaming the namespace on one side only turns this red
// instead of leaving the user unheard.
func TestSignalFromOdooMatchesItsPlaybook(t *testing.T) {
	// area -> counter key -> the playbook the engine must resolve to.
	// highRisk marks the playbooks the policy only speaks on with an explicit
	// per-risk authorisation, so the test has to grant it or the gate — not the
	// namespace — would be what stops the intervention.
	shipped := []struct {
		area     string
		counter  string
		wantID   string
		highRisk bool
	}{
		{"accounting", "unposted_invoices", "accounting.unposted_invoices", false},
		{"accounting", "unposted_vendor_bills", "accounting.unposted_vendor_bills", false},
		{"accounting", "unreconciled_statement_lines", "accounting.unreconciled_statement", false},
		{"accounting", "verifactu_unconfigured", "accounting.verifactu_pending", true},
		{"sales", "draft_quotations", "sales.draft_quotations", false},
		{"sales", "stale_opportunities", "sales.stale_opportunities", false},
		{"purchases", "draft_purchase_orders", "purchases.draft_purchase_orders", false},
		{"inventory", "negative_stock_products", "inventory.negative_stock", false},
		{"hr", "pending_leave_requests", "hr.pending_leaves", false},
	}

	// Every playbook the engine ships must appear in the table above, otherwise
	// a newly added area would silently stop being covered here.
	covered := map[string]bool{}
	for _, s := range shipped {
		covered[s.area] = true
	}
	for _, pb := range DefaultPlaybooks() {
		if !covered[strings.ToLower(pb.Area)] {
			t.Errorf("playbook %q (area %q) is not covered by the shipped-payload table: "+
				"add its area/counter pair or the Odoo pairing is untested", pb.ID, pb.Area)
		}
	}

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	for _, tc := range shipped {
		t.Run(tc.wantID, func(t *testing.T) {
			pol := DefaultPolicy()
			pol.EnableOptIn(7)
			if tc.highRisk {
				pol.AllowRisk(7, knowledge.RiskHigh)
			}
			store := NewMemoryStore()
			// The user was already invited: we are testing area -> playbook
			// resolution, not the invitation gate.
			if err := store.MarkInvited(7, time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)); err != nil {
				t.Fatal(err)
			}
			e := NewEngine(DefaultPlaybooks(), pol, store)
			e.SetClock(func() time.Time { return now })

			dec := e.Evaluate(Signal{
				UserID:   7,
				User:     ClassifiedUser{ID: 7, IsInternal: true, IsActive: true},
				Area:     tc.area,
				Model:    "account.move",
				Counters: map[string]int{tc.counter: 12},
			})
			if !dec.Speak {
				t.Fatalf("area %q with counter %q did not speak (%s). Odoo ships this "+
					"exact area/counter pair as data, so the engine and the Odoo "+
					"modules have drifted apart", tc.area, tc.counter, dec.Reason)
			}
			if dec.PlaybookID != tc.wantID {
				t.Errorf("area %q counter %q resolved to %q, want %q",
					tc.area, tc.counter, dec.PlaybookID, tc.wantID)
			}
		})
	}
}

// TestRenamedNamespaceReachesTheHTTPHandler drives the real wire path: the JSON
// Odoo posts, through the HTTP handler, down to the playbook. A namespace can be
// internally consistent and still be dropped at the edge.
func TestRenamedNamespaceReachesTheHTTPHandler(t *testing.T) {
	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)
	pol := DefaultPolicy()
	pol.EnableOptIn(7)
	store := NewMemoryStore()
	if err := store.MarkInvited(7, time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)); err != nil {
		t.Fatal(err)
	}
	e := NewEngine(DefaultPlaybooks(), pol, store)
	e.SetClock(func() time.Time { return now })

	// A deliverer pointed at a stub: this test is about resolution, not the
	// outbound POST to Odoo.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	svc := NewService(e, nil, NewDeliverer(srv.URL, "", srv.Client()))
	h := NewHandler(svc, "", true)

	body := `{"user_id":7,"area":"accounting","model":"account.move","view_id":123,` +
		`"counters":{"unposted_invoices":12},` +
		`"user":{"id":7,"is_internal":true,"is_active":true}}`
	req := httptest.NewRequest(http.MethodPost, SignalPath, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status %d, body %s", w.Code, w.Body.String())
	}
	if got := w.Body.String(); !strings.Contains(got, "accounting.unposted_invoices") {
		t.Errorf("the English area did not reach its playbook over HTTP: %s", got)
	}
}
