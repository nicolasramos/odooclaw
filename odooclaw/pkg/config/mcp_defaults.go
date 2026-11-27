package config

import "os"

// ensureDefaultMCPServers turns the Odoo assistant on for deployments that are
// wired to an Odoo instance but never declared an MCP server. The assistant is
// the product's main use, so it must not depend on somebody remembering to add
// the odoo_manager block: ODOO_URL and ODOO_DB in the environment are enough.
func (c *Config) ensureDefaultMCPServers() {
	if !c.Tools.MCP.Enabled {
		return
	}
	if len(c.Tools.MCP.Servers) > 0 {
		return
	}
	url := os.Getenv("ODOO_URL")
	database := os.Getenv("ODOO_DB")
	if url == "" || database == "" {
		return
	}
	username := firstNonEmpty(
		os.Getenv("ODOO_MCP_USERNAME"),
		os.Getenv("ODOO_USERNAME"),
		"admin",
	)
	password := firstNonEmpty(
		os.Getenv("ODOO_MCP_PASSWORD"),
		os.Getenv("ODOO_PASSWORD"),
	)
	if c.Tools.MCP.Servers == nil {
		c.Tools.MCP.Servers = map[string]MCPServerConfig{}
	}
	c.Tools.MCP.Servers["odoo_manager"] = MCPServerConfig{
		Enabled: true,
		Type:    "stdio",
		Command: "python3",
		Args:    []string{"-m", "odoo_mcp.server"},
		Env: map[string]string{
			"ODOO_URL":      url,
			"ODOO_DB":       database,
			"ODOO_USERNAME": username,
			"ODOO_PASSWORD": password,
		},
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
