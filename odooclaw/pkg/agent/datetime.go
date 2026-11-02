package agent

import (
	"fmt"
	"time"
)

// spanishWeekday/spanishMonth keep the date context in the language the agent
// answers in, without pulling a locale dependency.
var spanishWeekday = map[time.Weekday]string{
	time.Monday: "lunes", time.Tuesday: "martes", time.Wednesday: "miercoles",
	time.Thursday: "jueves", time.Friday: "viernes", time.Saturday: "sabado",
	time.Sunday: "domingo",
}

var spanishMonth = map[time.Month]string{
	time.January: "enero", time.February: "febrero", time.March: "marzo",
	time.April: "abril", time.May: "mayo", time.June: "junio",
	time.July: "julio", time.August: "agosto", time.September: "septiembre",
	time.October: "octubre", time.November: "noviembre", time.December: "diciembre",
}

// promptDateContext renders today's date and the absolute dates behind the
// relative expressions users type. Small models cannot compute dates: asked for
// "manana" they answer with an invented year. Resolving the references here
// keeps the arithmetic in Go and out of the model.
func promptDateContext(now time.Time) string {
	y, m, d := now.Date()
	today := time.Date(y, m, d, 0, 0, 0, 0, now.Location())

	monthStart := time.Date(y, m, 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, -1)

	// Monday-based week start.
	weekdayOffset := (int(today.Weekday()) + 6) % 7
	weekStart := today.AddDate(0, 0, -weekdayOffset)

	return fmt.Sprintf(`# Fecha

Hoy es %s %d de %s de %d (%s).

Referencias ya resueltas (usalas tal cual, no calcules tu la fecha):
- ayer = %s
- manana = %s
- inicio de esta semana (lunes) = %s
- inicio de este mes = %s
- fin de este mes = %s

Si el usuario da una fecha relativa, usa el valor de esta tabla. Nunca inventes un ano distinto al actual (%d).`,
		spanishWeekday[today.Weekday()], d, spanishMonth[m], y, today.Format("2006-01-02"),
		today.AddDate(0, 0, -1).Format("2006-01-02"),
		today.AddDate(0, 0, 1).Format("2006-01-02"),
		weekStart.Format("2006-01-02"),
		monthStart.Format("2006-01-02"),
		monthEnd.Format("2006-01-02"),
		y,
	)
}

// promptDateContextShort is the minimal-prompt variant: today's date and the
// rule, without the resolved reference table. A small model with a 2.5K prompt
// needs one line, not a calendar; the full table only pays for itself when the
// prompt has room for it.
func promptDateContextShort(now time.Time) string {
	y, m, d := now.Date()
	return fmt.Sprintf(
		"# Fecha\n\nHoy es %s, %d de %s de %d (%04d-%02d-%02d). No calcules fechas: usa esta.",
		spanishWeekday[now.Weekday()], d, spanishMonth[m], y, y, int(m), d,
	)
}

// antiNarrationClauseShort is the one-line variant used by the minimal prompt,
// where the long paragraph would cost more context than it saves.
const antiNarrationClauseShort = `# Herramientas

Emite la llamada; no la describas ni la escribas como texto.`

// antiNarrationClause is the tool-call contract in one paragraph: it goes into
// every system prompt because the observed failure is the model writing the
// planned call as prose and never emitting it.
const antiNarrationClause = `# Llamadas a herramientas

Cuando necesites una herramienta, EMITE la llamada. No escribas en el texto que
vas a llamarla, no la describas y no la envuelvas en un bloque de codigo: si la
respuesta contiene la llamada como texto, la accion no se ejecuta y el usuario se
queda sin resultado.`
