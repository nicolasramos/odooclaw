package conversation

import (
	"testing"
)

func TestState_String(t *testing.T) {
	tests := []struct {
		state    State
		expected string
	}{
		{StateIdle, "idle"},
		{StateProcessing, "processing"},
		{StateWaitingTool, "waiting_tool"},
		{StateWaitingConfirmation, "waiting_confirmation"},
		{StateError, "error"},
		{State(99), "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			if got := tt.state.String(); got != tt.expected {
				t.Errorf("State.String() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestParseState(t *testing.T) {
	tests := []struct {
		input    string
		expected State
	}{
		{"idle", StateIdle},
		{"processing", StateProcessing},
		{"waiting_tool", StateWaitingTool},
		{"waiting_confirmation", StateWaitingConfirmation},
		{"error", StateError},
		{"unknown", StateIdle}, // Default
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			if got := ParseState(tt.input); got != tt.expected {
				t.Errorf("ParseState(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}

func TestState_CanTransitionTo(t *testing.T) {
	tests := []struct {
		from   State
		to     State
		expect bool
	}{
		// Idle transitions
		{StateIdle, StateProcessing, true},
		{StateIdle, StateError, true},
		{StateIdle, StateIdle, false},
		{StateIdle, StateWaitingTool, false},

		// Processing transitions
		{StateProcessing, StateIdle, true},
		{StateProcessing, StateWaitingTool, true},
		{StateProcessing, StateWaitingConfirmation, true},
		{StateProcessing, StateError, true},
		{StateProcessing, StateProcessing, false},

		// WaitingTool transitions
		{StateWaitingTool, StateProcessing, true},
		{StateWaitingTool, StateIdle, true},
		{StateWaitingTool, StateError, true},
		{StateWaitingTool, StateWaitingTool, false},

		// WaitingConfirmation transitions
		{StateWaitingConfirmation, StateProcessing, true},
		{StateWaitingConfirmation, StateIdle, true},
		{StateWaitingConfirmation, StateError, true},
		{StateWaitingConfirmation, StateWaitingConfirmation, false},

		// Error transitions
		{StateError, StateIdle, true},
		{StateError, StateProcessing, false},
		{StateError, StateError, false},
	}

	for _, tt := range tests {
		name := tt.from.String() + "->" + tt.to.String()
		t.Run(name, func(t *testing.T) {
			if got := tt.from.CanTransitionTo(tt.to); got != tt.expect {
				t.Errorf("State(%s).CanTransitionTo(%s) = %v, want %v",
					tt.from, tt.to, got, tt.expect)
			}
		})
	}
}
