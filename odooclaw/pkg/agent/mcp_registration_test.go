package agent

import (
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/config"
)

func TestShouldAutoRegisterMCPServerDefaultsToTrue(t *testing.T) {
	if !shouldAutoRegisterMCPServer(config.MCPServerConfig{}) {
		t.Fatal("MCP servers should auto-register by default for backward compatibility")
	}
}

func TestShouldAutoRegisterMCPServerSkipsInternalServers(t *testing.T) {
	cfg := config.MCPServerConfig{ExcludeFromAutoRegister: true}

	if shouldAutoRegisterMCPServer(cfg) {
		t.Fatal("internal MCP servers should not be auto-registered as global agent tools")
	}
}
