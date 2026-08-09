package memory

import (
	"path/filepath"
	"testing"
)

func TestRecipeStoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store, err := NewRecipeStore(filepath.Join(dir, "memory"))
	if err != nil {
		t.Fatalf("NewRecipeStore: %v", err)
	}
	defer store.Close()

	// Save a successful resolution
	id, err := store.SaveRecipe("Cuanto me debe el cliente Acme", "mcp_odoo-mcp_odoo_get_ar_ap_aging", `{"report_type":"receivable"}`, "odoo", "10", "42", true)
	if err != nil {
		t.Fatalf("SaveRecipe: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive id, got %d", id)
	}

	// A failed resolution should not be saved as success
	_, _ = store.SaveRecipe("Borrar todo", "odoo_delete_all", "{}", "odoo", "10", "42", false)

	// Relevant retrieval: similar query should find the recipe
	recipes, err := store.GetRelevantRecipes("cuanto me debe acme", "odoo", "10", 3)
	if err != nil {
		t.Fatalf("GetRelevantRecipes: %v", err)
	}
	if len(recipes) != 1 {
		t.Fatalf("expected 1 recipe, got %d", len(recipes))
	}
	if recipes[0].Tool != "mcp_odoo-mcp_odoo_get_ar_ap_aging" {
		t.Fatalf("unexpected tool: %s", recipes[0].Tool)
	}

	// Context building should include the recipe
	ctx, err := store.BuildRecipeContext("cuanto me debe acme", "odoo", "10", 3)
	if err != nil {
		t.Fatalf("BuildRecipeContext: %v", err)
	}
	if ctx == "" {
		t.Fatal("expected non-empty recipe context")
	}
	t.Logf("context: %s", ctx)
}

func TestRecipeStoreUpsert(t *testing.T) {
	dir := t.TempDir()
	store, err := NewRecipeStore(filepath.Join(dir, "memory"))
	if err != nil {
		t.Fatalf("NewRecipeStore: %v", err)
	}
	defer store.Close()

	_, _ = store.SaveRecipe("Hola", "odoo_find_partner", "{}", "odoo", "10", "1", true)
	_, _ = store.SaveRecipe("Hola", "odoo_find_partner", "{}", "odoo", "10", "1", true)

	recipes, _ := store.GetRelevantRecipes("hola", "odoo", "10", 10)
	if len(recipes) != 1 {
		t.Fatalf("expected 1 recipe after upsert, got %d", len(recipes))
	}
	if recipes[0].UsedCount < 2 {
		t.Fatalf("expected used_count >= 2, got %d", recipes[0].UsedCount)
	}
}
