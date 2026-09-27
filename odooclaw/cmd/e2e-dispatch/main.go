package main

// e2e-dispatch is the cross-repo E2E probe for the proactive area/playbook
// contract. It reads the signal payloads a LIVE Odoo 18 database ships (dumped
// from mail.odooclaw.area rows, not from the XML source) and drives each one
// through the real engine over the real HTTP handler.
//
// Why a separate binary and not another unit test: a unit test asserts the table
// it was written with. This one takes the Odoo side as INPUT, so it fails when
// Odoo changes and the engine does not - the drift that otherwise shows up only
// as the assistant going quiet in production.
//
// Usage: go run ./cmd/e2e-dispatch <areas.json>

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
	"github.com/nicolasramos/odooclaw/pkg/proactive"
)

type odooArea struct {
	XMLID    string   `json:"xmlid"`
	Area     string   `json:"area"`
	Model    string   `json:"model"`
	Counters []string `json:"counters"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: e2e-dispatch <areas.json>")
		os.Exit(2)
	}
	raw, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	var areas []odooArea
	if err := json.Unmarshal(raw, &areas); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	now := time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

	// The engine decides; Odoo posts the message itself. A stub stands in for
	// that callback so the deliverer has somewhere to go.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	pol := proactive.DefaultPolicy()
	pol.EnableOptIn(7)
	// One shipped playbook is high risk (VeriFactu); the policy only speaks on it
	// with an explicit per-risk authorisation. Granting it here keeps the probe
	// about the namespace rather than about that gate.
	pol.AllowRisk(7, knowledge.RiskHigh)

	// Fresh engine+store per signal: we are testing resolution, not cooldown or
	// the daily cap.
	newHandler := func() *proactive.Handler {
		store := proactive.NewMemoryStore()
		_ = store.MarkInvited(7, time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC))
		engine := proactive.NewEngine(proactive.DefaultPlaybooks(), pol, store)
		engine.SetClock(func() time.Time { return now })
		svc := proactive.NewService(engine, nil, proactive.NewDeliverer(srv.URL, "", srv.Client()))
		return proactive.NewHandler(svc, "", true)
	}

	fail, spoken := 0, 0
	for _, a := range areas {
		if len(a.Counters) == 0 {
			// An area row with no signal_definition never has anything to report;
			// that is a deliberate state, not a contract failure.
			fmt.Printf("  n/a   %-52s (sin signal_definition)\n", a.XMLID)
			continue
		}
		for _, c := range a.Counters {
			// One signal per counter, exactly as Odoo sends it: the area plus the
			// counters observed on that screen.
			body := fmt.Sprintf(
				`{"user_id":7,"area":%q,"model":%q,"counters":{%q:12},`+
					`"user":{"id":7,"is_internal":true,"is_active":true}}`,
				a.Area, a.Model, c)
			req := httptest.NewRequest(http.MethodPost, proactive.SignalPath, strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			newHandler().ServeHTTP(w, req)

			var resp proactive.SignalResponse
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				fail++
				fmt.Printf("  FALLA %-52s %-26s -> respuesta ilegible: %s\n", a.XMLID, a.Area+"/"+c, w.Body.String())
				continue
			}
			if resp.Speak && resp.PlaybookID != "" {
				spoken++
				fmt.Printf("  OK    %-52s %-42s -> %s\n", a.XMLID, a.Area+"/"+c, resp.PlaybookID)
			} else {
				fail++
				fmt.Printf("  FALLA %-52s %-42s -> %s\n", a.XMLID, a.Area+"/"+c, resp.Reason)
			}
		}
	}

	fmt.Printf("\n%d/%d señales de Odoo resueltas a un playbook del motor\n", spoken, spoken+fail)
	if fail > 0 {
		fmt.Printf("RESULTADO: RECHAZADO (%d señales sin playbook)\n", fail)
		os.Exit(1)
	}
	fmt.Println("RESULTADO: APROBADO")
}
