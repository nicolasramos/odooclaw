package conversation

// State represents the current state of a conversation session.
type State int

const (
	// StateIdle is the default state — the conversation manager is ready
	// to accept and process new user messages.
	StateIdle State = iota

	// StateProcessing indicates the pipeline is actively working on
	// a user message (LLM inference, tool retrieval, etc.).
	StateProcessing

	// StateWaitingTool indicates the conversation is paused while
	// waiting for a tool execution result (e.g., MCP Odoo call).
	StateWaitingTool

	// StateWaitingConfirmation indicates the agent needs explicit
	// user confirmation before executing a potentially destructive action.
	StateWaitingConfirmation

	// StateError indicates the conversation encountered an error
	// and may need recovery or user intervention.
	StateError
)

// String returns a human-readable representation of the state.
func (s State) String() string {
	switch s {
	case StateIdle:
		return "idle"
	case StateProcessing:
		return "processing"
	case StateWaitingTool:
		return "waiting_tool"
	case StateWaitingConfirmation:
		return "waiting_confirmation"
	case StateError:
		return "error"
	default:
		return "unknown"
	}
}

// ParseState converts a string to a State value.
func ParseState(s string) State {
	switch s {
	case "idle":
		return StateIdle
	case "processing":
		return StateProcessing
	case "waiting_tool":
		return StateWaitingTool
	case "waiting_confirmation":
		return StateWaitingConfirmation
	case "error":
		return StateError
	default:
		return StateIdle
	}
}

// CanTransitionTo returns true if transitioning from this state to the
// given target state is allowed by the state machine.
func (s State) CanTransitionTo(target State) bool {
	allowed := map[State][]State{
		StateIdle:                {StateProcessing, StateError},
		StateProcessing:         {StateIdle, StateWaitingTool, StateWaitingConfirmation, StateError},
		StateWaitingTool:        {StateProcessing, StateIdle, StateError},
		StateWaitingConfirmation: {StateProcessing, StateIdle, StateError},
		StateError:              {StateIdle},
	}
	for _, a := range allowed[s] {
		if a == target {
			return true
		}
	}
	return false
}
