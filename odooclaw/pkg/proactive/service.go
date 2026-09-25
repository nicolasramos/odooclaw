package proactive

import (
	"context"
	"fmt"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// Service wires the trigger, the knowledge and the delivery together — the
// three pieces the design keeps apart on purpose.
//
// It deliberately owns no LLM. The offer text comes from the playbook, which is
// data. This keeps the decision auditable, keeps the cost at microseconds per
// view open, and means the copy can change without a model call or a redeploy.
type Service struct {
	engine *Engine
	kb     *knowledge.KnowledgeBase
	deliver *Deliverer
}

// NewService builds the service. kb may be nil, in which case playbook context
// is skipped (the trigger and the policy still work).
func NewService(engine *Engine, kb *knowledge.KnowledgeBase, deliver *Deliverer) *Service {
	return &Service{engine: engine, kb: kb, deliver: deliver}
}

// Handle evaluates a signal and, when the policy allows, delivers the offer.
//
// It returns the decision either way so callers can log the reason for a
// silence as readily as for an intervention. A delivery failure is returned but
// never turns into a silent success.
func (s *Service) Handle(ctx context.Context, sig Signal) (Decision, error) {
	dec := s.engine.Evaluate(sig)

	if !dec.Speak {
		return dec, nil
	}

	// Enrich the offer with the area's playbook knowledge when available. This
	// is retrieval by AREA, not by free text: the knowledge base's FTS5 MATCH
	// returns nothing for natural-language questions, so the structured area is
	// what selects the corpus.
	if s.kb != nil {
		if hint, err := s.areaHint(sig.Area); err == nil && hint != "" {
			dec.Message = dec.Message + "\n\n" + hint
		}
	}

	if s.deliver == nil {
		return dec, fmt.Errorf("no deliverer configured")
	}

	if err := s.deliver.Deliver(ctx, sig, dec); err != nil {
		return dec, err
	}

	// Persist the cooldown only after a successful send.
	if err := s.engine.Record(sig, dec); err != nil {
		return dec, fmt.Errorf("delivered but failed to record cooldown: %w", err)
	}
	return dec, nil
}

// areaHint returns a short contextual line from the knowledge base for the
// area, chosen deterministically. It is the bridge between "the trigger knows
// WHERE the user is" and "the knowledge base knows WHAT to teach".
func (s *Service) areaHint(area string) (string, error) {
	entries, err := s.kb.SearchByArea(area, "", 1)
	if err != nil {
		return "", err
	}
	if len(entries) == 0 {
		return "", nil
	}
	// One line, first sentence of the entry, so the offer stays an offer and
	// not a wall of text.
	content := strings.TrimSpace(entries[0].Content)
	if i := strings.IndexAny(content, ".\n"); i > 0 && i < 200 {
		content = content[:i+1]
	}
	if len(content) > 240 {
		content = content[:240] + "…"
	}
	return content, nil
}

// EvaluateOnly runs the decision without delivering — used by the Odoo signal
// endpoint to answer "would you speak?" and by tests.
func (s *Service) EvaluateOnly(sig Signal) Decision { return s.engine.Evaluate(sig) }
