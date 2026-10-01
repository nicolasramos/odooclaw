// OdooClaw - Ultra-lightweight personal AI agent
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package agent

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
	"github.com/nicolasramos/odooclaw/pkg/logger"
)

// KnowledgeStore wraps the persistent knowledge base (NRA-3845) for the
// live agent path. Before NRA-3845 the KB existed only in pkg/integration,
// which no binary imported: entries were :memory: and unreachable. This
// store is built in NewContextBuilder — the same live path as
// NewMemoryStore — so the KB actually ships inside odooclaw.
//
// Ingestion:
//   - Directory: <workspace>/knowledge/**/*.md is synced lazily on first
//     use and refreshed by Sync() (agent startup / CLI `knowledge index`).
//     Content is NFC-normalized because NAS/macOS deliver NFD.
//   - Tool: knowledge_add writes through AddKnowledge.
type KnowledgeStore struct {
	kbDir  string
	dbPath string

	lazyOnce sync.Once
	kb       *knowledge.KnowledgeBase
	initErr  error
}

// NewKnowledgeStore prepares (without opening) a persistent KB under the
// workspace: <workspace>/knowledge/kb.sqlite, markdown source in
// <workspace>/knowledge/*.md.
func NewKnowledgeStore(workspace string) *KnowledgeStore {
	kbDir := filepath.Join(workspace, "knowledge")
	return &KnowledgeStore{
		kbDir:  kbDir,
		dbPath: filepath.Join(kbDir, "kb.sqlite"),
	}
}

// DBPath exposes the sqlite file backing the KB.
func (ks *KnowledgeStore) DBPath() string { return ks.dbPath }

// ensure opens the KB and runs the first directory sync. Errors are cached
// so a broken KB degrades quietly (agent keeps working without it) rather
// than crashing the run.
func (ks *KnowledgeStore) ensure() (*knowledge.KnowledgeBase, error) {
	ks.lazyOnce.Do(func() {
		if err := os.MkdirAll(ks.kbDir, 0o755); err != nil {
			ks.initErr = fmt.Errorf("create knowledge dir: %w", err)
			return
		}
		kb, err := knowledge.NewKnowledgeBaseAt(ks.dbPath)
		if err != nil {
			ks.initErr = err
			return
		}
		if _, err := kb.SyncDirectory(ks.kbDir); err != nil {
			logger.WarnCF("knowledge", "initial directory sync failed", map[string]any{"error": err.Error()})
		}
		ks.kb = kb
	})
	return ks.kb, ks.initErr
}

// Sync refreshes the KB from the knowledge directory (incremental).
func (ks *KnowledgeStore) Sync() (int, error) {
	kb, err := ks.ensure()
	if err != nil {
		return 0, err
	}
	return kb.SyncDirectory(ks.kbDir)
}

// AddKnowledge implements tools.KnowledgeWriter: persist one learned entry.
func (ks *KnowledgeStore) AddKnowledge(title, content, category string, tags []string) error {
	kb, err := ks.ensure()
	if err != nil {
		return err
	}
	return kb.Add(knowledge.KnowledgeEntry{
		Category: knowledge.Category(category),
		Title:    knowledge.NormalizeNFC(title),
		Content:  knowledge.NormalizeNFC(content),
		Tags:     tags,
	})
}

// Search returns the top-N knowledge entries for a query.
func (ks *KnowledgeStore) Search(query string, limit int) ([]knowledge.KnowledgeEntry, error) {
	kb, err := ks.ensure()
	if err != nil {
		return nil, err
	}
	return kb.Search(query, "", limit)
}

// Count returns the number of entries currently stored.
func (ks *KnowledgeStore) Count() int {
	kb, err := ks.ensure()
	if err != nil {
		return 0
	}
	return kb.Count()
}

// Close releases the KB handle (nil-safe).
func (ks *KnowledgeStore) Close() error {
	if ks.kb != nil {
		return ks.kb.Close()
	}
	return nil
}

// BuildKnowledgeContext renders the top-N KB entries relevant to the
// current message as a prompt block. Returns "" when nothing is relevant
// or the KB is unavailable — the agent prompt simply omits the section.
func (ks *KnowledgeStore) BuildKnowledgeContext(query string, limit int) string {
	if strings.TrimSpace(query) == "" {
		return ""
	}
	if limit <= 0 {
		limit = 3
	}
	// Incremental sync before searching (same pattern as memory's
	// SyncWorkspace-on-search): dropping a .md into <workspace>/knowledge
	// is enough; unchanged files are skipped by mtime+size.
	if _, err := ks.Sync(); err != nil {
		logger.DebugCF("knowledge", "sync before search failed", map[string]any{"error": err.Error()})
	}
	entries, err := ks.Search(query, limit)
	if err != nil || len(entries) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## Knowledge Base Recall\n")
	sb.WriteString("Relevant entries from the persistent knowledge base:\n\n")
	for i, e := range entries {
		fmt.Fprintf(&sb, "%d. [%s] %s\n%s\n\n", i+1, e.Category, e.Title, strings.TrimSpace(e.Content))
	}
	return strings.TrimRight(sb.String(), "\n")
}
