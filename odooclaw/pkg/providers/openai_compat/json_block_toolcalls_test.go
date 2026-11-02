package openai_compat

import "testing"

func TestExtractJSONBlockToolCalls(t *testing.T) {
	cases := []struct {
		name     string
		text     string
		wantName string
		wantArg  string
	}{
		{
			name:     "tool + parameters",
			text:     "Primero busco al partner.\n\n```json\n{\"tool\": \"odoo_find_partner\", \"parameters\": {\"name\": \"DISA GAS\"}}\n```",
			wantName: "odoo_find_partner",
			wantArg:  "DISA GAS",
		},
		{
			name:     "name + arguments object",
			text:     "```json\n{\"name\":\"odoo_create_task\",\"arguments\":{\"name\":\"Llamar a Juanma\"}}\n```",
			wantName: "odoo_create_task",
			wantArg:  "Llamar a Juanma",
		},
		{
			name:     "arguments as JSON string",
			text:     "```json\n{\"tool\":\"odoo_find_sale_order\",\"arguments\":\"{\\\"state\\\":\\\"sale\\\"}\"}\n```",
			wantName: "odoo_find_sale_order",
			wantArg:  "sale",
		},
	}
	for _, tc := range cases {
		calls := extractJSONBlockToolCalls(tc.text)
		if len(calls) != 1 {
			t.Fatalf("%s: got %d calls, want 1", tc.name, len(calls))
		}
		if calls[0].Name != tc.wantName {
			t.Errorf("%s: name = %q, want %q", tc.name, calls[0].Name, tc.wantName)
		}
		if got := calls[0].Function.Arguments; !contains(got, tc.wantArg) {
			t.Errorf("%s: arguments = %q, want to contain %q", tc.name, got, tc.wantArg)
		}
		if stripped := stripJSONBlockToolCalls(tc.text); contains(stripped, tc.wantName) {
			t.Errorf("%s: tool call left in the answer: %q", tc.name, stripped)
		}
	}
}

func TestExtractJSONBlockIgnoresData(t *testing.T) {
	// A plain JSON payload is not a tool call and must survive untouched.
	text := "```json\n{\"proveedor\": \"DISA GAS SA\", \"cif\": \"A35555555\", \"total\": 128.40}\n```"
	if calls := extractJSONBlockToolCalls(text); len(calls) != 0 {
		t.Fatalf("data block treated as a tool call: %+v", calls)
	}
	if got := stripJSONBlockToolCalls(text); got != text {
		t.Errorf("data block was stripped: %q", got)
	}
}

func contains(haystack, needle string) bool {
	return len(needle) == 0 || (len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0)
}

func indexOf(h, n string) int {
	for i := 0; i+len(n) <= len(h); i++ {
		if h[i:i+len(n)] == n {
			return i
		}
	}
	return -1
}
