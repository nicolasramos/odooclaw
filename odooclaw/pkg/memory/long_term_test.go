package memory

import (
	"testing"
)

func TestLongTermStore(t *testing.T) {
	store := NewLongTermStore(t.TempDir())

	// Empty start
	prefs, err := store.GetPreferences()
	if err != nil || prefs != nil {
		t.Fatalf("expected nil prefs, got %+v err=%v", prefs, err)
	}
	ctx, err := store.BuildPromptContext()
	if err != nil {
		t.Fatalf("BuildPromptContext: %v", err)
	}
	if ctx != "" {
		t.Fatalf("expected empty context, got %q", ctx)
	}

	// Update preferences
	for k, v := range map[string]string{
		"language": "es", "timezone": "Europe/Madrid", "communication_style": "concise",
	} {
		if err := store.UpdatePreference(k, v); err != nil {
			t.Fatalf("UpdatePreference(%s): %v", k, err)
		}
	}
	prefs, _ = store.GetPreferences()
	if prefs.Language != "es" || prefs.Timezone != "Europe/Madrid" || prefs.CommunicationStyle != "concise" {
		t.Fatalf("prefs wrong: %+v", prefs)
	}

	// Company profile
	company := &CompanyProfile{
		CompanyID: 10, Name: "Acme S.L.", Industry: "retail",
		ActiveModules: []string{"sale", "inventory"}, DefaultCurrency: "EUR",
	}
	if err := store.UpdateCompanyProfile(company); err != nil {
		t.Fatalf("UpdateCompanyProfile: %v", err)
	}

	// System config
	cfg := &SystemConfig{OdooVersion: "17.0", Database: "odoo_prod"}
	if err := store.UpdateConfig(cfg); err != nil {
		t.Fatalf("UpdateConfig: %v", err)
	}

	// Context contains key facts
	ctx, _ = store.BuildPromptContext()
	for _, want := range []string{"language: es", "timezone: Europe/Madrid", "Acme", "retail", "sale, inventory", "odoo version: 17.0"} {
		if !contains(ctx, want) {
			t.Fatalf("context missing %q: %s", want, ctx)
		}
	}

	// Unknown preference key errors
	if err := store.UpdatePreference("bogus", "x"); err == nil {
		t.Fatal("expected error for unknown preference")
	}
}
