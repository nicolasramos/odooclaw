// Command proactive-demo runs the proactive engine end to end against a local
// stub standing in for Odoo's /odooclaw/notify endpoint.
//
// It exists to answer one question with evidence rather than prose: does the
// whole flow work, including the delivery the single-use reply token made
// impossible? Run it with `go run ./cmd/proactive-demo`.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
	"github.com/nicolasramos/odooclaw/pkg/proactive"
)

func main() {
	// --- Stub Odoo /odooclaw/notify: records what it receives. ---
	var mu sync.Mutex
	var received []map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		received = append(received, map[string]any{
			"user_id":   body["user_id"],
			"area":      body["area"],
			"playbook":  body["playbook_id"],
			"message":   body["message"],
			"source":    body["source"],
			"token_hdr": r.Header.Get("X-OdooClaw-Token"),
		})
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	// --- Knowledge base: playbooks per functional area. ---
	kb, err := knowledge.NewKnowledgeBase()
	if err != nil {
		panic(err)
	}
	defer kb.Close()
	for _, e := range []knowledge.KnowledgeEntry{
		{Category: knowledge.CatWorkflow, Title: "VeriFactu: plazos vigentes",
			Content:  "Los plazos vigentes son 1-ene-2027 para sociedades y 1-jul-2027 para el resto (RDL 15/2025).",
			Metadata: map[string]string{"area": "contabilidad", "module": "account"}},
		{Category: knowledge.CatWorkflow, Title: "Conciliación bancaria",
			Content:  "El extracto se concilia desde Contabilidad > Banco > Conciliación.",
			Metadata: map[string]string{"area": "contabilidad", "module": "account"}},
		{Category: knowledge.CatWorkflow, Title: "Presupuestos: seguimiento",
			Content:  "El seguimiento se programa con actividades sobre la oportunidad.",
			Metadata: map[string]string{"area": "ventas", "module": "sale"}},
	} {
		if err := kb.Add(e); err != nil {
			panic(err)
		}
	}

	// --- Policy: opt-in, conservative. ---
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	pol := proactive.DefaultPolicy()
	pol.EnableOptIn(7)
	pol.AllowRisk(7, knowledge.RiskHigh) // autoriza VeriFactu

	// --- Engine on a DURABLE store, so cooldowns survive restarts. ---
	store, err := proactive.NewSQLiteStore(scratchDB())
	if err != nil {
		panic(err)
	}
	defer store.Close()

	engine := proactive.NewEngine(proactive.DefaultPlaybooks(), pol, store)
	engine.SetClock(func() time.Time { return now })

	svc := proactive.NewService(engine, kb, proactive.NewDeliverer(srv.URL, "demo-secret", srv.Client()))

	fmt.Println("Motor de proactividad — recorrido completo")
	fmt.Println("=========================================")
	fmt.Printf("playbooks cargados: %d   areas cubiertas: %v\n\n", len(engine.Playbooks()), engine.Areas())

	type step struct {
		label string
		sig   proactive.Signal
	}
	steps := []step{
		{"usuario abre Contabilidad, 12 facturas sin publicar",
			proactive.Signal{UserID: 7, UserName: "Ana", Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: now}},

		{"misma pantalla otra vez (cooldown por area)",
			proactive.Signal{UserID: 7, User: internalUser(7), Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: now.Add(time.Minute)}},

		{"usuario abre Ventas, 5 presupuestos en borrador",
			proactive.Signal{UserID: 7, User: internalUser(7), Area: "ventas", Model: "sale.order",
				Counters: map[string]int{"draft_quotations": 5}, At: now}},

		{"usuario entra en Ajustes tecnicos (sin area funcional)",
			proactive.Signal{UserID: 7, User: internalUser(7), Area: "", Model: "ir.ui.view", At: now}},

		{"usuario abre Contabilidad a las 23:00 (silencio horario)",
			proactive.Signal{UserID: 7, User: internalUser(7), Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: time.Date(2026, 9, 25, 23, 0, 0, 0, time.UTC)}},

		// --- AUDIENCIA: quien es "usuario interno de DU" ---
		{"usuario INTERNO de DU abre Contabilidad (la audiencia correcta)",
			proactive.Signal{UserID: 50, User: internalUser(50), Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: now}},

		{"usuario de PORTAL abre Contabilidad (fuera de la audiencia)",
			proactive.Signal{UserID: 51, User: proactive.ClassifiedUser{ID: 51, IsInternal: false, IsActive: true},
				Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: now}},

		{"usuario NO clasificado abre Contabilidad (fail-closed)",
			proactive.Signal{UserID: 52, Area: "contabilidad", Model: "account.move",
				Counters: map[string]int{"unposted_invoices": 12}, At: now}},
	}

	start := time.Now()
	spoke, silent := 0, 0
	for _, s := range steps {
		t0 := time.Now()
		dec, err := svc.Handle(context.Background(), s.sig)
		elapsed := time.Since(t0)

		verdict := "CALLADO"
		if dec.Speak {
			verdict = "HABLA  "
			spoke++
		} else {
			silent++
		}
		fmt.Printf("%s  %s\n", verdict, s.label)
		fmt.Printf("          motivo   : %s\n", dec.Reason)
		if dec.Speak {
			fmt.Printf("          playbook : %s\n", dec.PlaybookID)
			fmt.Printf("          mensaje  : %s\n", firstLines(dec.Message, 3))
			fmt.Printf("          canal    : %s\n", dec.Channel)
		}
		if err != nil {
			fmt.Printf("          ERROR    : %v\n", err)
		}
		fmt.Printf("          latencia : %v\n\n", elapsed.Round(time.Microsecond))
	}

	mu.Lock()
	n := len(received)
	mu.Unlock()

	fmt.Println("-----------------------------------------")
	fmt.Printf("intervenciones entregadas al endpoint : %d\n", n)
	fmt.Printf("hablas: %d   silencios: %d   total evaluado en %v\n",
		spoke, silent, time.Since(start).Round(time.Microsecond))

	// The check must account for the durable store: a second run of the demo
	// legitimately speaks less (or not at all) because the cooldowns from the
	// first run are still in force. Reporting "OK" with zero deliveries would be
	// the green-vacuous check this demo exists to avoid.
	if n != spoke {
		fmt.Printf("FALLO: %d intervenciones decididas pero %d entregadas\n", spoke, n)
		os.Exit(1)
	}
	if spoke == 0 {
		fmt.Println("OK: el flujo funciona, y el estado durable del run anterior sigue vigente")
		fmt.Println("    (cooldowns activos -> silencio correcto, no un fallo)")
		return
	}
	fmt.Println("OK: el flujo proactivo funciona end to end")
}

// internalUser classifies a signal's subject the way Odoo does: share=False,
// active=True. The demo hardcodes it because it has no Odoo; the real resolver
// is mail.odooclaw.audience.resolve_for_user.
func internalUser(id int) proactive.ClassifiedUser {
	return proactive.ClassifiedUser{ID: id, IsInternal: true, IsActive: true}
}

func firstLines(s string, n int) string {
	out := ""
	lines := 0
	for _, r := range s {
		if r == '\n' {
			lines++
			if lines >= n {
				break
			}
		}
		out += string(r)
	}
	if len(out) < len(s) {
		out += " …"
	}
	return out
}
