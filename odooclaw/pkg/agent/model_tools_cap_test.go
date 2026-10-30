package agent

import "testing"

func intPtr(v int) *int { return &v }

func TestResolveMaxTools(t *testing.T) {
	cases := []struct {
		name    string
		agent   *AgentInstance
		isLocal bool
		want    int
	}{
		{"nil agent uses cloud default", nil, false, maxCloudToolsInPrompt},
		{"local small model keeps 5", &AgentInstance{}, true, maxLocalToolsInPrompt},
		{"cloud default", &AgentInstance{}, false, maxCloudToolsInPrompt},
		{"explicit max_tools wins over local cap", &AgentInstance{MaxTools: intPtr(85)}, true, 85},
		{"max_tools 0 means no cap", &AgentInstance{MaxTools: intPtr(0)}, true, 0},
		{"max_tools 0 beats cloud cap", &AgentInstance{MaxTools: intPtr(0), MaxCloudToolsInPrompt: intPtr(64)}, false, 0},
		{"cloud cap used when no max_tools", &AgentInstance{MaxCloudToolsInPrompt: intPtr(32)}, false, 32},
		{"cloud cap beats local heuristic when set", &AgentInstance{MaxCloudToolsInPrompt: intPtr(12)}, true, 12},
	}
	for _, tc := range cases {
		if got := resolveMaxTools(tc.agent, tc.isLocal); got != tc.want {
			t.Errorf("%s: resolveMaxTools = %d, want %d", tc.name, got, tc.want)
		}
	}
}
