// Package proactive implements OdooClaw's proactive assistance engine.
//
// The engine solves three separable problems, deliberately kept out of the
// model's prompt:
//
//  1. Trigger   — WHEN to speak. Deterministic counters observed in Odoo
//     (unposted invoices, draft quotations, ...), never an LLM decision.
//  2. Knowledge — WHAT it knows about how to help. Playbooks retrieved from the
//     knowledge base by functional AREA, because FTS5 MATCH is unusable for
//     natural-language questions (see pkg/knowledge).
//  3. Delivery  — HOW and with whose permission. A proactive policy (opt-in,
//     cooldown, daily cap, quiet hours, dedupe) that can explain every silence.
//
// The LLM only renders the sentence. Everything that decides whether the user
// gets interrupted is deterministic and auditable.
package proactive

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// Playbook is the scripted answer to "what do I do when this happens".
//
// A playbook is data, not documentation: it pairs one observable signal in one
// functional area with the offer the assistant makes. Because it is data, the
// copy can be rewritten without touching Go, which matters for material like
// VeriFactu whose deadlines have already changed once.
type Playbook struct {
	// ID is stable and used for dedupe ("contabilidad.unposted_invoices").
	ID string
	// Area is the functional Odoo area this belongs to: "contabilidad",
	// "ventas", ... It is the key that selects the corpus.
	Area string
	// Title is the human label shown in logs and admin views.
	Title string
	// SignalKey is the counter inspected in Signal.Counters.
	SignalKey string
	// MinCount is the threshold at which the playbook becomes eligible.
	MinCount int
	// Template is the offer, with {n} replaced by the counter value and
	// {area} by the area label.
	Template string
	// Risk mirrors the knowledge base classification; high/critical playbooks
	// only fire on explicit opt-in.
	Risk knowledge.RiskLevel
	// Priority breaks ties when several playbooks match; higher wins.
	Priority int
}

// Signal is a structured observation about what a user is doing in Odoo.
//
// It is produced by Odoo (the module knows the model and the view) and handed
// to the engine. Free text never travels in here on purpose: the area is a
// structured field, which is exactly why the trigger does not depend on how
// the user phrases anything.
type Signal struct {
	// UserID is the Odoo res.users id being offered help.
	UserID int
	// UserName is used for logging and message personalisation.
	UserName string
	// Area is the functional area the user just entered, already normalised
	// to lowercase ("contabilidad"). Empty means no functional area, which
	// always ends in silence.
	Area string
	// Model and ViewID locate the screen, kept for auditability.
	Model  string
	ViewID string
	// Counters are the deterministic observations read from Odoo.
	Counters map[string]int
	// At is when the observation happened (zero = time.Now()).
	At time.Time
}

// Decision is the engine's verdict. Silence is a first-class outcome: it
// carries the reason so an operator can answer "why did it NOT speak?".
type Decision struct {
	// Speak reports whether an intervention should be delivered.
	Speak bool
	// Reason explains the verdict, in both directions.
	Reason string
	// PlaybookID is the playbook that fired (empty when silent).
	PlaybookID string
	// Message is the rendered offer, ready to deliver.
	Message string
	// Channel is the delivery channel ("odoo_discuss_private").
	Channel string
	// Count is the observed counter that justified speaking.
	Count int
}

// Engine evaluates signals against playbooks and policy.
//
// It holds no per-user state of its own: all mutable state lives in the Store,
// so a process restart cannot forget that a user was already offered help.
type Engine struct {
	playbooks []Playbook
	policy    Policy
	store     Store
	// now is injectable so tests and the demo can control the clock.
	now func() time.Time
}

// NewEngine builds an engine. A nil store falls back to an in-memory store,
// which is correct for tests and demos but NOT for production: policy state
// must survive restarts.
func NewEngine(playbooks []Playbook, policy Policy, store Store) *Engine {
	if store == nil {
		store = NewMemoryStore()
	}
	return &Engine{
		playbooks: playbooks,
		policy:    policy,
		store:     store,
		now:       time.Now,
	}
}

// SetClock overrides the engine clock. Intended for tests.
func (e *Engine) SetClock(now func() time.Time) { e.now = now }

// Evaluate decides whether to intervene for the given signal.
//
// Order matters and is cheapest-first: the whole evaluation is a handful of map
// and SQLite lookups with no LLM call, so it can run on every view open.
func (e *Engine) Evaluate(sig Signal) Decision {
	at := sig.At
	if at.IsZero() {
		at = e.now()
	}

	area := strings.ToLower(strings.TrimSpace(sig.Area))
	if area == "" {
		return Decision{Reason: "sin área funcional: no hay nada que ofrecer"}
	}

	// 1. Opt-in. Speaking to someone who never asked is the behaviour that
	//    makes people hate an assistant, so this gate is first.
	if !e.policy.OptedIn(sig.UserID) {
		return Decision{Reason: "el usuario no ha activado las sugerencias"}
	}

	// 2. Quiet hours.
	if e.policy.InQuietHours(at) {
		return Decision{Reason: fmt.Sprintf("silêncio horario %02d:00-%02d:00",
			e.policy.QuietFromHour, e.policy.QuietToHour)}
	}

	// 3. Daily cap.
	sent, err := e.store.SentToday(sig.UserID, at)
	if err == nil && sent >= e.policy.DailyCap {
		return Decision{Reason: fmt.Sprintf("tope diario alcanzado (%d)", e.policy.DailyCap)}
	}

	// 4. Per-area cooldown.
	last, ok, err := e.store.LastSpoke(sig.UserID, area)
	if err == nil && ok {
		if elapsed := at.Sub(last); elapsed < e.policy.CooldownPerArea {
			return Decision{Reason: fmt.Sprintf("cooldown de %s por área (faltan %s)",
				e.policy.CooldownPerArea, (e.policy.CooldownPerArea - elapsed).Round(time.Minute))}
		}
	}

	// 5. Playbook match — deterministic counter thresholds.
	pb, count, ok := e.match(area, sig.Counters)
	if !ok {
		return Decision{Reason: "ninguna señal por encima del umbral en esta área"}
	}

	// 6. Dedupe: the same offer is never repeated, across restarts.
	if seen, err := e.store.AlreadyOffered(sig.UserID, pb.ID); err == nil && seen {
		return Decision{PlaybookID: pb.ID, Reason: "ya se le ofreció esto antes"}
	}

	// 7. High-risk playbooks require the user to have opted into them
	//    specifically, not just into the assistant in general.
	if pb.Risk == knowledge.RiskHigh || pb.Risk == knowledge.RiskCritical {
		if !e.policy.RiskOptedIn(sig.UserID, pb.Risk) {
			return Decision{PlaybookID: pb.ID,
				Reason: "playbook de riesgo alto sin autorización explícita"}
		}
	}

	return Decision{
		Speak:      true,
		Reason:     fmt.Sprintf("señal %s=%d supera el umbral %d", pb.SignalKey, count, pb.MinCount),
		PlaybookID: pb.ID,
		Message:    render(pb, count, sig.Counters),
		Channel:    "odoo_discuss_private",
		Count:      count,
	}
}

// Record persists that an intervention was delivered. It must be called after
// delivery succeeds, otherwise a failed send would poison the cooldown.
func (e *Engine) Record(sig Signal, d Decision) error {
	at := sig.At
	if at.IsZero() {
		at = e.now()
	}
	return e.store.RecordSpoke(sig.UserID, strings.ToLower(sig.Area), d.PlaybookID, at)
}

// match picks the best eligible playbook for an area. Deterministic: highest
// priority wins, then the largest counter over its threshold.
func (e *Engine) match(area string, counters map[string]int) (Playbook, int, bool) {
	var best Playbook
	bestCount := 0
	found := false

	for _, pb := range e.playbooks {
		if !strings.EqualFold(pb.Area, area) {
			continue
		}
		count, ok := counters[pb.SignalKey]
		if !ok || count < pb.MinCount {
			continue
		}
		// A zero MinCount with a zero counter is not a signal, it is noise.
		if count == 0 {
			continue
		}
		if !found || pb.Priority > best.Priority ||
			(pb.Priority == best.Priority && count > bestCount) {
			best, bestCount, found = pb, count, true
		}
	}
	return best, bestCount, found
}

// Areas returns the distinct areas covered by the loaded playbooks.
func (e *Engine) Areas() []string {
	seen := map[string]bool{}
	var out []string
	for _, pb := range e.playbooks {
		a := strings.ToLower(pb.Area)
		if a != "" && !seen[a] {
			seen[a] = true
			out = append(out, a)
		}
	}
	sort.Strings(out)
	return out
}

// Playbooks returns the loaded playbooks, for inspection and admin views.
func (e *Engine) Playbooks() []Playbook { return e.playbooks }

// render fills the offer template with the observed counter.
func render(pb Playbook, count int, counters map[string]int) string {
	msg := pb.Template
	msg = strings.ReplaceAll(msg, "{n}", fmt.Sprint(count))
	msg = strings.ReplaceAll(msg, "{area}", pb.Area)
	// Any other {key} placeholder is filled from the counters map, so a
	// playbook can quote several observations in one sentence.
	for k, v := range counters {
		msg = strings.ReplaceAll(msg, "{"+k+"}", fmt.Sprint(v))
	}
	return msg
}
