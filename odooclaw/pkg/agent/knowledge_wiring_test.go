package agent

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestKnowledgeWiredIntoContextBuilder: the KB must be constructed in the
// live agent path (NewContextBuilder), not only in pkg/integration.
func TestKnowledgeWiredIntoContextBuilder(t *testing.T) {
	tmp := t.TempDir()
	cb := NewContextBuilder(tmp, 0, 0)
	require.NotNil(t, cb.Knowledge(), "ContextBuilder must own a KnowledgeStore (NRA-3845)")

	// Drop a markdown file in the workspace knowledge dir; the dynamic
	// context for a matching message must contain it — no command run.
	kbDir := filepath.Join(tmp, "knowledge")
	require.NoError(t, os.MkdirAll(kbDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(kbDir, "pos.md"), []byte(
		"# Configuración del TPV Nito\n\nEl TPV se sincroniza con el KDS vía websocket en el puerto 8072.\n"), 0o644))

	ctx := cb.buildDynamicContext("cómo se sincroniza el TPV con el KDS", "", "", "", nil)
	assert.Contains(t, ctx, "Knowledge Base Recall")
	assert.Contains(t, ctx, "TPV Nito")
}

// TestKnowledgeAddToolRegisteredInAgentInstance: knowledge_add must be a
// registered core tool of every agent instance, and the retrieval engine
// must be attached to the registry.
func TestKnowledgeAddToolRegisteredInAgentInstance(t *testing.T) {
	tmp := t.TempDir()
	cfg := &config.Config{
		Agents: config.AgentsConfig{
			Defaults: config.AgentDefaults{
				Workspace: tmp,
				Model:     "test-model",
			},
		},
	}
	provider := &mockProvider{}
	agent := NewAgentInstance(nil, &cfg.Agents.Defaults, cfg, provider)
	require.NotNil(t, agent)

	_, ok := agent.Tools.Get("knowledge_add")
	assert.True(t, ok, "knowledge_add must be registered on the agent tool registry")

	assert.NotNil(t, agent.Tools.GetRetrievalEngine(), "retrieval engine must be attached to the registry")
}

// TestKnowledgePackageLinkedIntoBinary is the automated link check demanded
// by NRA-3845: `go list -deps ./cmd/odooclaw` must include pkg/knowledge.
// Skipped when the go toolchain is unavailable.
func TestKnowledgePackageLinkedIntoBinary(t *testing.T) {
	goTool, err := exec.LookPath("go")
	if err != nil {
		t.Skip("go toolchain not available")
	}
	cmd := exec.Command(goTool, "list", "-deps", "./cmd/odooclaw")
	cmd.Dir = findModuleRoot(t)
	raw, err := cmd.Output()
	require.NoError(t, err, "go list -deps ./cmd/odooclaw must succeed")
	assert.Contains(t, string(raw), "github.com/nicolasramos/odooclaw/pkg/knowledge",
		"pkg/knowledge must be linked into the odooclaw binary (NRA-3845)")
}

func findModuleRoot(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	require.NoError(t, err)
	for dir := wd; ; {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("go.mod not found above test cwd")
		}
		dir = parent
	}
}
