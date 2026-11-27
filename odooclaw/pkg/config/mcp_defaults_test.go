package config

import "testing"

func TestEnsureDefaultMCPServersWiresOdoo(t *testing.T) {
	t.Setenv("ODOO_URL", "http://odoo:8069")
	t.Setenv("ODOO_DB", "preview")
	t.Setenv("ODOO_MCP_USERNAME", "bot")
	t.Setenv("ODOO_MCP_PASSWORD", "secret")

	cfg := DefaultConfig()
	cfg.ensureDefaultMCPServers()

	server, ok := cfg.Tools.MCP.Servers["odoo_manager"]
	if !ok {
		t.Fatalf("odoo_manager was not added: %+v", cfg.Tools.MCP.Servers)
	}
	if !server.Enabled || server.Command != "python3" || len(server.Args) != 2 {
		t.Fatalf("unexpected server: %+v", server)
	}
	if server.Env["ODOO_URL"] != "http://odoo:8069" || server.Env["ODOO_DB"] != "preview" {
		t.Fatalf("unexpected env: %+v", server.Env)
	}
	if server.Env["ODOO_USERNAME"] != "bot" || server.Env["ODOO_PASSWORD"] != "secret" {
		t.Fatalf("credentials not taken from ODOO_MCP_*: %+v", server.Env)
	}
}

func TestEnsureDefaultMCPServersNeedsOdoo(t *testing.T) {
	t.Setenv("ODOO_URL", "")
	t.Setenv("ODOO_DB", "")

	cfg := DefaultConfig()
	cfg.ensureDefaultMCPServers()

	if len(cfg.Tools.MCP.Servers) != 0 {
		t.Fatalf("no Odoo, no server expected: %+v", cfg.Tools.MCP.Servers)
	}
}

func TestEnsureDefaultMCPServersKeepsDeclaredServers(t *testing.T) {
	t.Setenv("ODOO_URL", "http://odoo:8069")
	t.Setenv("ODOO_DB", "preview")

	cfg := DefaultConfig()
	cfg.Tools.MCP.Servers = map[string]MCPServerConfig{"mine": {Enabled: true, Command: "echo"}}
	cfg.ensureDefaultMCPServers()

	if len(cfg.Tools.MCP.Servers) != 1 {
		t.Fatalf("a declared server must win: %+v", cfg.Tools.MCP.Servers)
	}
	if _, ok := cfg.Tools.MCP.Servers["mine"]; !ok {
		t.Fatalf("the declared server disappeared: %+v", cfg.Tools.MCP.Servers)
	}
}
