// OdooClaw - Ultra-lightweight personal AI agent
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package config

import (
	"os"
	"path/filepath"
	"testing"
)

// Reproduces the exact failure from a fresh doodba-copier-template deployment:
// the generated config.json has NO model_list and relies on the env-provided
// provider credentials. Loading it must leave the config able to resolve the
// configured model, otherwise the gateway exits with
// `model "gpt-4o-mini" not found in model_list`.
func TestLoadConfig_TemplateGeneratedConfigResolvesModel(t *testing.T) {
	// Shape of the file copier writes (no model_list).
	raw := `{
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "workspace": "~/.odooclaw/workspace",
      "restrict_to_workspace": true
    }
  }
}`

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}

	// Credentials arrive through the env, exactly as .docker/odooclaw.env.
	t.Setenv("ODOOCLAW_PROVIDERS_OPENAI_API_KEY", "sk-test-key")
	t.Setenv("ODOOCLAW_PROVIDERS_OPENAI_API_BASE", "https://api.openai.com/v1")

	cfg, err := LoadConfig(path)
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}

	// The env-provided credentials must reach the providers block, otherwise
	// nothing can convert them into a model_list entry.
	if cfg.Providers.OpenAI.APIKey != "sk-test-key" {
		t.Fatalf("Providers.OpenAI.APIKey = %q, want the env-provided key",
			cfg.Providers.OpenAI.APIKey)
	}

	model := cfg.Agents.Defaults.GetModelName()
	if model != "gpt-4o-mini" {
		t.Fatalf("GetModelName() = %q, want %q", model, "gpt-4o-mini")
	}

	// This is precisely what providers.CreateProvider does before looking up.
	if cfg.HasProvidersConfig() {
		existing := map[string]bool{}
		for _, m := range cfg.ModelList {
			existing[m.ModelName] = true
		}
		for _, pm := range ConvertProvidersToModelList(cfg) {
			if !existing[pm.ModelName] {
				cfg.ModelList = append(cfg.ModelList, pm)
			}
		}
	}

	mc, err := cfg.GetModelConfig(model)
	if err != nil {
		t.Fatalf("GetModelConfig(%q) failed — this is the crash-loop error: %v", model, err)
	}
	if mc.APIKey != "sk-test-key" {
		t.Errorf("resolved APIKey = %q, want the env-provided key", mc.APIKey)
	}
	if mc.Model != "openai/gpt-4o-mini" {
		t.Errorf("resolved Model = %q, want %q", mc.Model, "openai/gpt-4o-mini")
	}
}
