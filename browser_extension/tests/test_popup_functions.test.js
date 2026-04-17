/**
 * Unit tests for popup.js pure functions and settings logic.
 * Uses Node.js built-in test runner (no external dependencies).
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// --- Extract pure functions from popup.js for testing ---
// We replicate them here because popup.js uses browser globals.
// If the source changes, these must be kept in sync.

function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "http://127.0.0.1:8765";
  }
  return value.replace(/\/+$/, "");
}

function formatRelativeTime(isoString) {
  if (!isoString) return "-";
  const timestamp = Date.parse(isoString);
  if (!Number.isFinite(timestamp)) return "-";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "ahora";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}

function formatConversationLabel(chatId) {
  const value = String(chatId || "").trim();
  if (!value) return "-";
  if (value.startsWith("discuss.channel_")) return `Canal ${value.replace("discuss.channel_", "#")}`;
  return value;
}

// --- Tests ---

describe("normalizeApiBase", () => {
  it("returns default when empty string", () => {
    assert.equal(normalizeApiBase(""), "http://127.0.0.1:8765");
  });

  it("returns default when null/undefined", () => {
    assert.equal(normalizeApiBase(null), "http://127.0.0.1:8765");
    assert.equal(normalizeApiBase(undefined), "http://127.0.0.1:8765");
  });

  it("returns default when whitespace only", () => {
    assert.equal(normalizeApiBase("   "), "http://127.0.0.1:8765");
  });

  it("strips trailing slashes", () => {
    assert.equal(normalizeApiBase("https://my-vps.com:8765/"), "https://my-vps.com:8765");
    assert.equal(normalizeApiBase("https://my-vps.com:8765///"), "https://my-vps.com:8765");
  });

  it("preserves valid URL without trailing slash", () => {
    assert.equal(normalizeApiBase("https://my-vps.com:8765"), "https://my-vps.com:8765");
  });

  it("accepts localhost with custom port", () => {
    assert.equal(normalizeApiBase("http://localhost:9999"), "http://localhost:9999");
  });

  it("accepts IP address", () => {
    assert.equal(normalizeApiBase("http://192.168.1.100:8765"), "http://192.168.1.100:8765");
  });
});

describe("formatRelativeTime", () => {
  it("returns dash for null/empty", () => {
    assert.equal(formatRelativeTime(null), "-");
    assert.equal(formatRelativeTime(""), "-");
    assert.equal(formatRelativeTime(undefined), "-");
  });

  it("returns dash for invalid date", () => {
    assert.equal(formatRelativeTime("not-a-date"), "-");
  });

  it("returns 'ahora' for very recent timestamps", () => {
    const now = new Date().toISOString();
    assert.equal(formatRelativeTime(now), "ahora");
  });

  it("returns seconds format for < 60s ago", () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const result = formatRelativeTime(tenSecondsAgo);
    assert.ok(result.startsWith("hace ") && result.endsWith(" s"));
  });

  it("returns minutes format for < 60min ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinAgo);
    assert.ok(result.startsWith("hace ") && result.endsWith(" min"));
  });

  it("returns hours format for > 60min ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoHoursAgo);
    assert.ok(result.startsWith("hace ") && result.endsWith(" h"));
  });
});

describe("formatConversationLabel", () => {
  it("returns dash for empty/null", () => {
    assert.equal(formatConversationLabel(""), "-");
    assert.equal(formatConversationLabel(null), "-");
  });

  it("formats discuss.channel as Canal #id", () => {
    assert.equal(formatConversationLabel("discuss.channel_42"), "Canal #42");
  });

  it("returns raw value for non-discuss channels", () => {
    assert.equal(formatConversationLabel("res.partner_15"), "res.partner_15");
  });
});

describe("updateSettingsView - health indicator logic", () => {
  // Simulate the health indicator logic extracted from updateSettingsView
  function computeHealthState(health) {
    if (health && health.reachable) {
      return {
        dotClass: "health-dot ok",
        label: "Conectado" + (health.domains && health.domains.length > 0 ? " (" + health.domains.join(", ") + ")" : ""),
      };
    }
    if (health && health.error) {
      return {
        dotClass: "health-dot fail",
        label: "Sin conexion: " + health.error,
      };
    }
    return {
      dotClass: "health-dot unknown",
      label: "Sin conectar",
    };
  }

  it("shows connected state when reachable", () => {
    const state = computeHealthState({ reachable: true, domains: ["mi-odoo.com"] });
    assert.equal(state.dotClass, "health-dot ok");
    assert.ok(state.label.includes("Conectado"));
    assert.ok(state.label.includes("mi-odoo.com"));
  });

  it("shows connected without domains when empty array", () => {
    const state = computeHealthState({ reachable: true, domains: [] });
    assert.equal(state.dotClass, "health-dot ok");
    assert.equal(state.label, "Conectado");
  });

  it("shows failure state with error message", () => {
    const state = computeHealthState({ reachable: false, error: "fetch failed" });
    assert.equal(state.dotClass, "health-dot fail");
    assert.ok(state.label.includes("fetch failed"));
  });

  it("shows unknown state when null health", () => {
    const state = computeHealthState(null);
    assert.equal(state.dotClass, "health-dot unknown");
    assert.equal(state.label, "Sin conectar");
  });

  it("shows unknown state when health has no reachable nor error", () => {
    const state = computeHealthState({ reachable: false });
    assert.equal(state.dotClass, "health-dot unknown");
    assert.equal(state.label, "Sin conectar");
  });
});
