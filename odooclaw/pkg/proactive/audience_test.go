package proactive

import (
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// newAudienceEngine builds an engine with NO opt-in pre-enabled: the state of a
// user who has never spoken to the assistant.
func newAudienceEngine(t *testing.T) (*Engine, *time.Time) {
	t.Helper()
	now := time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC)
	pol := DefaultPolicy()
	pol.AllowRisk(7, knowledge.RiskHigh)
	e := NewEngine(DefaultPlaybooks(), pol, NewMemoryStore())
	clock := now
	e.SetClock(func() time.Time { return clock })
	return e, &clock
}

func internal(id int) ClassifiedUser {
	return ClassifiedUser{ID: id, IsInternal: true, IsActive: true}
}

// TestInternalUserReceivesExactlyOneInvitation is the regression guard for the
// deadlock this rule fixes. Before, the engine demanded opt-in BEFORE making the
// first offer: the user never got offered help, so they could never accept it,
// so the opt-in never turned on. The feature was dead and every test was green,
// because the tests themselves enabled the opt-in.
func TestInternalUserReceivesExactlyOneInvitation(t *testing.T) {
	e, now := newAudienceEngine(t)

	dec := e.Evaluate(Signal{
		UserID: 7, User: internal(7), Area: "contabilidad",
		Counters: map[string]int{"unposted_invoices": 12}, At: *now,
	})
	if !dec.Speak || !dec.Invitation {
		t.Fatalf("un usuario interno no recibe la oferta inicial: %q", dec.Reason)
	}
}

// TestAudienceIsInternalUsersOnly pins the DU rule Nico stated: any INTERNAL
// user, not portal, not public. A portal user must never be offered help — the
// counters are business figures (unposted invoices, bank lines) that someone
// outside the company must not be shown.
func TestAudienceIsInternalUsersOnly(t *testing.T) {
	e, now := newAudienceEngine(t)

	cases := []struct {
		name string
		user ClassifiedUser
		want bool
	}{
		{"usuario interno activo", ClassifiedUser{7, true, true}, true},
		{"usuario de portal", ClassifiedUser{8, false, true}, false},
		{"usuario publico", ClassifiedUser{0, false, true}, false},
		{"usuario desactivado", ClassifiedUser{9, true, false}, false},
		{"sin identificar", ClassifiedUser{}, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dec := e.Evaluate(Signal{
				UserID: tc.user.ID, User: tc.user, Area: "contabilidad",
				Counters: map[string]int{"unposted_invoices": 12}, At: *now,
			})
			if dec.Speak != tc.want {
				t.Fatalf("Speak=%v want %v (reason: %q)", dec.Speak, tc.want, dec.Reason)
			}
			if !tc.want && dec.Reason == "" {
				t.Fatal("a rejection must carry an accountable reason")
			}
		})
	}
}

// TestUnknownUserFailsClosed: a signal with no classification must not be
// assumed internal. Failing closed is the only safe default when the input is
// missing — the alternative leaks business figures to whoever the host forgot
// to classify.
func TestUnknownUserFailsClosed(t *testing.T) {
	e, now := newAudienceEngine(t)

	dec := e.Evaluate(Signal{
		UserID:   42, // no User classification supplied at all
		Area:     "contabilidad",
		Counters: map[string]int{"unposted_invoices": 12},
		At:       *now,
	})
	if dec.Speak {
		t.Fatal("spoke to an unclassified user; classification must fail closed")
	}
}

// TestInvitationRespectsQuietHours: the invitation is exempt from the opt-in
// gate, but NOT from quiet hours. Waking someone at 3am to ask whether they want
// help is the fastest way to have them refuse permanently.
func TestInvitationRespectsQuietHours(t *testing.T) {
	e, _ := newAudienceEngine(t)
	night := time.Date(2026, 9, 25, 3, 0, 0, 0, time.UTC)

	dec := e.Evaluate(Signal{
		UserID: 7, User: internal(7), Area: "contabilidad",
		Counters: map[string]int{"unposted_invoices": 12}, At: night,
	})
	if dec.Speak {
		t.Fatal("the invitation was sent during quiet hours")
	}
}
