package agent

import (
	"strings"
	"testing"
	"time"
)

func TestPromptDateContext(t *testing.T) {
	// Friday 30 October 2026, 13:00 local.
	now := time.Date(2026, time.October, 30, 13, 0, 0, 0, time.UTC)
	got := promptDateContext(now)

	want := []string{
		"Hoy es viernes 30 de octubre de 2026 (2026-10-30)",
		"ayer = 2026-10-29",
		"manana = 2026-10-31",
		"inicio de esta semana (lunes) = 2026-10-26",
		"inicio de este mes = 2026-10-01",
		"fin de este mes = 2026-10-31",
	}
	for _, w := range want {
		if !strings.Contains(got, w) {
			t.Errorf("promptDateContext missing %q\ngot:\n%s", w, got)
		}
	}
	if strings.Contains(got, "2025") {
		t.Errorf("date context mentions a stale year:\n%s", got)
	}
}

func TestPromptDateContextMonthRollover(t *testing.T) {
	// Monday 1 December 2026: yesterday in November, month edges correct.
	now := time.Date(2026, time.December, 1, 8, 0, 0, 0, time.UTC)
	got := promptDateContext(now)
	for _, w := range []string{"ayer = 2026-11-30", "manana = 2026-12-02", "fin de este mes = 2026-12-31"} {
		if !strings.Contains(got, w) {
			t.Errorf("missing %q\ngot:\n%s", w, got)
		}
	}
}
