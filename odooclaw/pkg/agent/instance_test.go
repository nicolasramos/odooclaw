package agent

import (
	"os"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/config"
)

func TestNewAgentInstance_UsesDefaultsTemperatureAndMaxTokens(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "agent-instance-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	cfg := &config.Config{
		Agents: config.AgentsConfig{
			Defaults: config.AgentDefaults{
				Workspace:         tmpDir,
				Model:             "test-model",
				MaxTokens:         1234,
				MaxToolIterations: 5,
			},
		},
	}

	configuredTemp := 1.0
	cfg.Agents.Defaults.Temperature = &configuredTemp

	provider := &mockProvider{}
	agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)

	if agent.MaxTokens != 1234 {
		t.Fatalf("MaxTokens = %d, want %d", agent.MaxTokens, 1234)
	}
	if agent.Temperature != 1.0 {
		t.Fatalf("Temperature = %f, want %f", agent.Temperature, 1.0)
	}
}

func TestNewAgentInstance_DefaultsTemperatureWhenZero(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "agent-instance-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	cfg := &config.Config{
		Agents: config.AgentsConfig{
			Defaults: config.AgentDefaults{
				Workspace:         tmpDir,
				Model:             "test-model",
				MaxTokens:         1234,
				MaxToolIterations: 5,
			},
		},
	}

	configuredTemp := 0.0
	cfg.Agents.Defaults.Temperature = &configuredTemp

	provider := &mockProvider{}
	agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)

	if agent.Temperature != 0.0 {
		t.Fatalf("Temperature = %f, want %f", agent.Temperature, 0.0)
	}
}

func TestNewAgentInstance_DefaultsTemperatureWhenUnset(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "agent-instance-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	cfg := &config.Config{
		Agents: config.AgentsConfig{
			Defaults: config.AgentDefaults{
				Workspace:         tmpDir,
				Model:             "test-model",
				MaxTokens:         1234,
				MaxToolIterations: 5,
			},
		},
	}

	provider := &mockProvider{}
	agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)

	if agent.Temperature != 0.7 {
		t.Fatalf("Temperature = %f, want %f", agent.Temperature, 0.7)
	}
}

func TestNewAgentInstance_ResolveCandidatesFromModelListAlias(t *testing.T) {
	tests := []struct {
		name         string
		aliasName    string
		modelName    string
		apiBase      string
		wantProvider string
		wantModel    string
	}{
		{
			name:         "alias with provider prefix",
			aliasName:    "step-3.5-flash",
			modelName:    "openrouter/stepfun/step-3.5-flash:free",
			apiBase:      "https://openrouter.ai/api/v1",
			wantProvider: "openrouter",
			wantModel:    "stepfun/step-3.5-flash:free",
		},
		{
			name:         "alias without provider prefix",
			aliasName:    "glm-5",
			modelName:    "glm-5",
			apiBase:      "https://api.z.ai/api/coding/paas/v4",
			wantProvider: "openai",
			wantModel:    "glm-5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, err := os.MkdirTemp("", "agent-instance-test-*")
			if err != nil {
				t.Fatalf("Failed to create temp dir: %v", err)
			}
			defer os.RemoveAll(tmpDir)

			cfg := &config.Config{
				Agents: config.AgentsConfig{
					Defaults: config.AgentDefaults{
						Workspace: tmpDir,
						Model:     tt.aliasName,
					},
				},
				ModelList: []config.ModelConfig{
					{
						ModelName: tt.aliasName,
						Model:     tt.modelName,
						APIBase:   tt.apiBase,
					},
				},
			}

			provider := &mockProvider{}
			agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)

			if len(agent.Candidates) != 1 {
				t.Fatalf("len(Candidates) = %d, want 1", len(agent.Candidates))
			}
			if agent.Candidates[0].Provider != tt.wantProvider {
				t.Fatalf("candidate provider = %q, want %q", agent.Candidates[0].Provider, tt.wantProvider)
			}
			if agent.Candidates[0].Model != tt.wantModel {
				t.Fatalf("candidate model = %q, want %q", agent.Candidates[0].Model, tt.wantModel)
			}
		})
	}
}

func TestNewAgentInstance_PromptToolsInTextOverride(t *testing.T) {
	tests := []struct {
		name        string
		cfgFlag     *bool
		wantFlag    *bool
	}{
		{name: "flag false (native tools) is honored", cfgFlag: boolPtr(false), wantFlag: boolPtr(false)},
		{name: "flag true (text injection) is honored", cfgFlag: boolPtr(true), wantFlag: boolPtr(true)},
		{name: "unset flag stays nil (heuristic wins)", cfgFlag: nil, wantFlag: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, err := os.MkdirTemp("", "agent-instance-prompt-tools-*")
			if err != nil {
				t.Fatalf("Failed to create temp dir: %v", err)
			}
			defer os.RemoveAll(tmpDir)

			cfg := &config.Config{
				Agents: config.AgentsConfig{
					Defaults: config.AgentDefaults{
						Workspace: tmpDir,
						Model:     "odooclaw-v25e",
					},
				},
				ModelList: []config.ModelConfig{
					{
						ModelName:         "odooclaw-v25e",
						Model:             "odooclaw-v26",
						APIBase:           "http://127.0.0.1:8081/v1",
						PromptToolsInText: tt.cfgFlag,
					},
				},
			}

			provider := &mockProvider{}
			agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)

			if tt.wantFlag == nil {
				if agent.PromptToolsInText != nil {
					t.Fatalf("PromptToolsInText = %v, want nil", *agent.PromptToolsInText)
				}
			} else {
				if agent.PromptToolsInText == nil {
					t.Fatalf("PromptToolsInText = nil, want %v", *tt.wantFlag)
				}
				if *agent.PromptToolsInText != *tt.wantFlag {
					t.Fatalf("PromptToolsInText = %v, want %v", *agent.PromptToolsInText, *tt.wantFlag)
				}
			}
		})
	}
}

func boolPtr(b bool) *bool {
	return &b
}
