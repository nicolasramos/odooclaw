// OdooClaw - Ultra-lightweight personal AI agent
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package config

import "testing"

// A config that names the provider AND the model (the shape the doodba-copier
// template generates) must produce a model_list entry that is findable by the
// model name the user configured. Before this test the conversion kept
// ModelName = provider name ("openai"), so GetModelConfig("<model>") failed and
// the gateway exited in a restart loop:
//
//	model "gpt-4o-mini" not found in model_list
func TestConvertProvidersToModelList_ModelNameFollowsConfiguredModel(t *testing.T) {
	cfg := &Config{
		Agents: AgentsConfig{
			Defaults: AgentDefaults{
				Provider: "openai",
				Model:    "gpt-4o-mini",
			},
		},
		Providers: ProvidersConfig{
			OpenAI: OpenAIProviderConfig{
				ProviderConfig: ProviderConfig{
					APIKey:  "sk-test-key",
					APIBase: "https://api.openai.com/v1",
				},
			},
		},
	}

	result := ConvertProvidersToModelList(cfg)

	if len(result) != 1 {
		t.Fatalf("len(result) = %d, want 1", len(result))
	}
	if result[0].ModelName != "gpt-4o-mini" {
		t.Errorf("ModelName = %q, want %q (must be findable by the configured model)",
			result[0].ModelName, "gpt-4o-mini")
	}
	if result[0].Model != "openai/gpt-4o-mini" {
		t.Errorf("Model = %q, want %q", result[0].Model, "openai/gpt-4o-mini")
	}
	// The key must still flow through from the providers block, so it never has
	// to be written into the (git-tracked) config.json.
	if result[0].APIKey != "sk-test-key" {
		t.Errorf("APIKey = %q, want %q", result[0].APIKey, "sk-test-key")
	}

	// End-to-end of the actual failure: the lookup the gateway performs.
	// Emulate what CreateProvider does before looking the model up.
	cfg.ModelList = result
	if _, err := cfg.GetModelConfig("gpt-4o-mini"); err != nil {
		t.Errorf("GetModelConfig(%q) failed: %v", "gpt-4o-mini", err)
	}
}

// Only the provider the user selected may be renamed. The other providers must
// keep their own alias so load balancing across several providers still works.
func TestConvertProvidersToModelList_OnlySelectedProviderIsRenamed(t *testing.T) {
	cfg := &Config{
		Agents: AgentsConfig{
			Defaults: AgentDefaults{Provider: "groq", Model: "llama-3.3-70b-versatile"},
		},
		Providers: ProvidersConfig{
			Groq: ProviderConfig{APIKey: "gsk-test", APIBase: "https://api.groq.com/openai/v1"},
			OpenAI: OpenAIProviderConfig{
				ProviderConfig: ProviderConfig{
					APIKey:  "sk-test",
					APIBase: "https://api.openai.com/v1",
				},
			},
		},
	}

	byName := map[string]ModelConfig{}
	for _, m := range ConvertProvidersToModelList(cfg) {
		byName[m.ModelName] = m
	}

	if _, ok := byName["llama-3.3-70b-versatile"]; !ok {
		t.Errorf("selected provider not renamed; got keys %v", keysOf(byName))
	}
	if _, ok := byName["openai"]; !ok {
		t.Errorf("unselected provider lost its alias; got keys %v", keysOf(byName))
	}
}

func keysOf(m map[string]ModelConfig) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
