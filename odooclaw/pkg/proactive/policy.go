package proactive

import (
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

// Audience answers "who may be offered help at all".
//
// This is a SEPARATE question from the anti-nuisance policy, and conflating the
// two was a bug: the policy's opt-in gate blocked the very first offer, so a
// user who had never heard from the assistant could never accept anything, so
// the opt-in could never turn on. The loop closed and the feature was dead
// while every test stayed green.
//
// The distinction that fixes it:
//
//   - AUDIENCE decides who is a candidate. For DU that is any INTERNAL user
//     (share=False, active=True) — not portal, not public.
//   - POLICY decides how often the assistant may speak to a candidate.
//
// The first offer is an INVITATION, not an intervention: it is what asks for
// consent, so it cannot require consent already given. Once a user has been
// invited, everything after that is an intervention and the full policy applies.
type Audience struct {
	// InternalOnly restricts offers to internal users (share=False). Portal and
	// public users are never offered help: they are not employees, they have no
	// standing to be told about the company's unposted invoices, and the counters
	// would leak business figures to someone outside the company.
	InternalOnly bool
	// IncludeInactive allows offering to users who are no longer active. Off by
	// default: a disabled employee must not receive new messages.
	IncludeInactive bool
}

// DefaultAudience is the DU rule: any internal user, active only.
func DefaultAudience() Audience {
	return Audience{InternalOnly: true, IncludeInactive: false}
}

// ClassifiedUser is what the host tells the engine about a user it is asking
// about. The Go side never reads Odoo itself, so the classification must be
// resolved by the caller and asserted here.
type ClassifiedUser struct {
	ID         int
	IsInternal bool
	IsActive   bool
}

// Eligible reports whether a user may receive offers at all, with the reason
// when not. The reason is returned so a silence is always explainable — an
// assistant that goes quiet with no accountable reason is impossible to debug.
func (a Audience) Eligible(u ClassifiedUser) (bool, string) {
	if u.ID == 0 {
		return false, "usuario no identificado"
	}
	if a.InternalOnly && !u.IsInternal {
		return false, "no es usuario interno (portal o público): fuera de la audiencia"
	}
	if !a.IncludeInactive && !u.IsActive {
		return false, "usuario desactivado: fuera de la audiencia"
	}
	return true, ""
}

// Policy is the anti-nuisance contract: everything that decides when the
// assistant must stay quiet. It is deliberately conservative by default —
// an assistant that interrupts without permission is an assistant people
// switch off.
type Policy struct {
	// CooldownPerArea is the minimum gap between two interventions in the
	// same functional area for the same user.
	CooldownPerArea time.Duration
	// DailyCap is the maximum number of interventions per user per day.
	DailyCap int
	// QuietFromHour / QuietToHour bound the hours during which the assistant
	// never speaks. The window may wrap midnight (21 -> 8).
	QuietFromHour int
	QuietToHour   int
	// OptIn is the set of users who asked for suggestions.
	OptIn map[int]bool
	// NOTE: "was this user already invited" is deliberately NOT a field here.
	// It is mutable state, and Policy is configuration, so it lives in the
	// durable Store — a restart must not re-ask the user for permission.
	// RiskOptIn grants high/critical playbooks per user, keyed by user id.
	RiskOptIn map[int]map[knowledge.RiskLevel]bool
	// Audience is who may be offered help at all (DU: internal users only).
	Audience Audience
	// Location is the timezone used to decide quiet hours and the daily cap.
	// Nil means UTC.
	Location *time.Location
}

// DefaultPolicy returns the conservative default: opt-in required, one
// intervention per area per day, three per day in total, and silence
// overnight.
func DefaultPolicy() Policy {
	return Policy{
		CooldownPerArea: 24 * time.Hour,
		DailyCap:        3,
		QuietFromHour:   21,
		QuietToHour:     8,
		OptIn:           map[int]bool{},
		RiskOptIn:       map[int]map[knowledge.RiskLevel]bool{},
		Audience:        DefaultAudience(),
	}
}

// OptedIn reports whether the user asked for suggestions.
func (p Policy) OptedIn(userID int) bool { return p.OptIn[userID] }

// RiskOptedIn reports whether the user authorised a given risk level.
func (p Policy) RiskOptedIn(userID int, risk knowledge.RiskLevel) bool {
	return p.RiskOptIn[userID][risk]
}

// EnableOptIn turns suggestions on for a user. Called from Odoo when the user
// accepts the offer.
func (p *Policy) EnableOptIn(userID int) {
	if p.OptIn == nil {
		p.OptIn = map[int]bool{}
	}
	p.OptIn[userID] = true
}

// DisableOptIn turns suggestions off for a user.
func (p *Policy) DisableOptIn(userID int) {
	if p.OptIn == nil {
		p.OptIn = map[int]bool{}
		return
	}
	p.OptIn[userID] = false
}

// AllowRisk authorises a risk level for a user.
func (p *Policy) AllowRisk(userID int, risk knowledge.RiskLevel) {
	if p.RiskOptIn == nil {
		p.RiskOptIn = map[int]map[knowledge.RiskLevel]bool{}
	}
	if p.RiskOptIn[userID] == nil {
		p.RiskOptIn[userID] = map[knowledge.RiskLevel]bool{}
	}
	p.RiskOptIn[userID][risk] = true
}

// InQuietHours reports whether the given instant falls in the silent window.
// The window is compared in the policy's location, so "21:00" means the
// user's 21:00, not the server's.
func (p Policy) InQuietHours(at time.Time) bool {
	loc := p.Location
	if loc == nil {
		loc = time.UTC
	}
	h := at.In(loc).Hour()

	if p.QuietFromHour == p.QuietToHour {
		// Degenerate window means "never silent" rather than "always silent":
		// a misconfiguration must not mute the assistant silently.
		return false
	}
	if p.QuietFromHour < p.QuietToHour {
		return h >= p.QuietFromHour && h < p.QuietToHour
	}
	// Wraps midnight, e.g. 21 -> 8.
	return h >= p.QuietFromHour || h < p.QuietToHour
}
