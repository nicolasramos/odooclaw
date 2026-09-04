package agent

import (
	"strings"
	"testing"
)

// TestRetrieveRelevantToolsCloudCap is the NRA-1045 regression test: with more
// tools than the provider's cap, the cloud-model path must reduce the tool set
// to the configured cap (default maxCloudToolsInPrompt) without touching the
// local-model cap. The manifest exposes 124 tools — above the 64 cloud default.
func TestRetrieveRelevantToolsCloudCap(t *testing.T) {
	defs := loadManifestToolsForTest(t)
	if len(defs) < 2 {
		t.Fatalf("manifest too small to exercise caps: %d tools", len(defs))
	}

	const query = "Crea una factura de proveedor para la Empresa Test por 100 euros"

	// Default cloud cap: 64 (under the 128 provider ceiling).
	if len(defs) <= maxCloudToolsInPrompt {
		t.Fatalf("test requires more tools than the cloud default; have %d, cap %d",
			len(defs), maxCloudToolsInPrompt)
	}
	top := retrieveRelevantTools(defs, query, maxCloudToolsInPrompt)
	if len(top) != maxCloudToolsInPrompt {
		t.Errorf("cloud default cap: expected %d tools, got %d", maxCloudToolsInPrompt, len(top))
	}

	// Configurable override: a smaller per-model cap is honored verbatim.
	custom := 10
	topCustom := retrieveRelevantTools(defs, query, custom)
	if len(topCustom) != custom {
		t.Errorf("custom cap: expected %d tools, got %d", custom, len(topCustom))
	}

	// Local small models keep the fixed cap of 5.
	topLocal := retrieveRelevantTools(defs, query, maxLocalToolsInPrompt)
	if len(topLocal) != maxLocalToolsInPrompt {
		t.Errorf("local cap: expected %d tools, got %d", maxLocalToolsInPrompt, len(topLocal))
	}

	// The relevant specific create tool must still reach the reduced set so
	// cloud models can actually create the vendor invoice.
	names := make([]string, 0, len(topCustom))
	for _, d := range topCustom {
		names = append(names, d.Function.Name)
	}
	if !strings.Contains(strings.Join(names, ","), "odoo_create_vendor_invoice") {
		t.Errorf("expected odoo_create_vendor_invoice in top-%d, got %v", custom, names)
	}
}
