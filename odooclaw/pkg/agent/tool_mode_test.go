package agent

import "testing"

func TestResolveTextInjection(t *testing.T) {
	yes := true
	no := false
	cases := []struct {
		name     string
		agent    *AgentInstance
		heuristic bool
		want     bool
	}{
		{"tool_mode native beats heuristic", &AgentInstance{ToolMode: "native"}, true, false},
		{"tool_mode text beats heuristic", &AgentInstance{ToolMode: "text"}, false, true},
		{"tool_mode native beats prompt_tools_in_text", &AgentInstance{ToolMode: "native", PromptToolsInText: &yes}, true, false},
		{"override used when mode empty", &AgentInstance{PromptToolsInText: &no}, true, false},
		{"heuristic used when nothing set", &AgentInstance{}, true, true},
		{"heuristic false for cloud model", &AgentInstance{}, false, false},
		{"nil agent falls back to heuristic", nil, true, true},
	}
	for _, tc := range cases {
		if got := resolveTextInjection(tc.agent, tc.heuristic); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestContextBuilderToolModeOverridesName(t *testing.T) {
	// A model whose name looks like a local fine-tune would get the minimal
	// prompt; declaring tool_mode:native must keep the full prompt.
	cb := NewContextBuilder(t.TempDir(), 0, 0)
	cb.SetModel("odooclaw-light-1.2b")
	if !cb.isLocalSmallModel() {
		t.Fatal("heuristic should flag the legacy local model")
	}
	cb.SetToolMode("native")
	if cb.isLocalSmallModel() {
		t.Fatal("tool_mode=native must override the name heuristic")
	}
	cb.SetToolMode("text")
	if !cb.isLocalSmallModel() {
		t.Fatal("tool_mode=text must force the minimal prompt")
	}
}
