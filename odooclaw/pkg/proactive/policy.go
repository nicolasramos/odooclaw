package proactive

import (
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
)

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
	// RiskOptIn grants high/critical playbooks per user, keyed by user id.
	RiskOptIn map[int]map[knowledge.RiskLevel]bool
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
