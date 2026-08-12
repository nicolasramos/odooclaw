// OdooClaw - Ultra-lightweight personal AI agent
// Inspired by and based on nanobot: https://github.com/HKUDS/nanobot
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package agent

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/fileutil"
	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
)

// MemoryStore manages persistent memory for the agent.
// - Long-term memory: memory/MEMORY.md
// - Daily notes: memory/YYYYMM/YYYYMMDD.md
type MemoryStore struct {
	workspace  string
	memoryDir  string
	memoryFile string
	sqlite     *corememory.Store
	historical *corememory.HistoricalStore
	recipes    *corememory.RecipeStore
	// NRA-511: structured per-session memory + long-term profile
	sessions *corememory.SessionMemoryStore
	longTerm *corememory.LongTermStore
}

type PromptMemoryOptions struct {
	Query    string
	Channel  string
	ChatID   string
	SenderID string
	Metadata map[string]string
}

// NewMemoryStore creates a new MemoryStore with the given workspace path.
// It ensures the memory directory exists.
func NewMemoryStore(workspace string) *MemoryStore {
	memoryDir := filepath.Join(workspace, "memory")
	memoryFile := filepath.Join(memoryDir, "MEMORY.md")

	// Ensure memory directory exists
	os.MkdirAll(memoryDir, 0o755)

	ms := &MemoryStore{
		workspace:  workspace,
		memoryDir:  memoryDir,
		memoryFile: memoryFile,
		sqlite:     corememory.NewStore(memoryDir),
		historical: corememory.NewHistoricalStore(memoryDir),
		sessions:   corememory.NewSessionMemoryStore(memoryDir),
		longTerm:   corememory.NewLongTermStore(memoryDir),
	}
	// Recipe store (query→tool+args) is ALWAYS enabled by default.
	if rs, err := corememory.NewRecipeStore(memoryDir); err == nil {
		ms.recipes = rs
	}
	return ms
}

// getTodayFile returns the path to today's daily note file (memory/YYYYMM/YYYYMMDD.md).
func (ms *MemoryStore) getTodayFile() string {
	today := time.Now().Format("20060102") // YYYYMMDD
	monthDir := today[:6]                  // YYYYMM
	filePath := filepath.Join(ms.memoryDir, monthDir, today+".md")
	return filePath
}

// ReadLongTerm reads the long-term memory (MEMORY.md).
// Returns empty string if the file doesn't exist.
func (ms *MemoryStore) ReadLongTerm() string {
	if data, err := os.ReadFile(ms.memoryFile); err == nil {
		return string(data)
	}
	return ""
}

// WriteLongTerm writes content to the long-term memory file (MEMORY.md).
func (ms *MemoryStore) WriteLongTerm(content string) error {
	// Use unified atomic write utility with explicit sync for flash storage reliability.
	// Using 0o600 (owner read/write only) for secure default permissions.
	if err := fileutil.WriteFileAtomic(ms.memoryFile, []byte(content), 0o600); err != nil {
		return err
	}
	return ms.syncFile(ms.memoryFile)
}

// ReadToday reads today's daily note.
// Returns empty string if the file doesn't exist.
func (ms *MemoryStore) ReadToday() string {
	todayFile := ms.getTodayFile()
	if data, err := os.ReadFile(todayFile); err == nil {
		return string(data)
	}
	return ""
}

// AppendToday appends content to today's daily note.
// If the file doesn't exist, it creates a new file with a date header.
func (ms *MemoryStore) AppendToday(content string) error {
	todayFile := ms.getTodayFile()

	// Ensure month directory exists
	monthDir := filepath.Dir(todayFile)
	if err := os.MkdirAll(monthDir, 0o755); err != nil {
		return err
	}

	var existingContent string
	if data, err := os.ReadFile(todayFile); err == nil {
		existingContent = string(data)
	}

	var newContent string
	if existingContent == "" {
		// Add header for new day
		header := fmt.Sprintf("# %s\n\n", time.Now().Format("2006-01-02"))
		newContent = header + content
	} else {
		// Append to existing content
		newContent = existingContent + "\n" + content
	}

	// Use unified atomic write utility with explicit sync for flash storage reliability.
	if err := fileutil.WriteFileAtomic(todayFile, []byte(newContent), 0o600); err != nil {
		return err
	}
	return ms.syncFile(todayFile)
}

// GetRecentDailyNotes returns daily notes from the last N days.
// Contents are joined with "---" separator.
func (ms *MemoryStore) GetRecentDailyNotes(days int) string {
	var sb strings.Builder
	first := true

	for i := range days {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("20060102") // YYYYMMDD
		monthDir := dateStr[:6]            // YYYYMM
		filePath := filepath.Join(ms.memoryDir, monthDir, dateStr+".md")

		if data, err := os.ReadFile(filePath); err == nil {
			if !first {
				sb.WriteString("\n\n---\n\n")
			}
			sb.Write(data)
			first = false
		}
	}

	return sb.String()
}

// GetMemoryContext returns formatted memory context for the agent prompt.
// Includes long-term memory and recent daily notes.
func (ms *MemoryStore) GetMemoryContext() string {
	if ms.sqlite != nil {
		if context, err := ms.sqlite.GetContext(3, ms.memoryFile); err == nil {
			return context
		}
	}

	longTerm := ms.ReadLongTerm()
	recentNotes := ms.GetRecentDailyNotes(3)

	if longTerm == "" && recentNotes == "" {
		return ""
	}

	var sb strings.Builder

	if longTerm != "" {
		sb.WriteString("## Long-term Memory\n\n")
		sb.WriteString(longTerm)
	}

	if recentNotes != "" {
		if longTerm != "" {
			sb.WriteString("\n\n---\n\n")
		}
		sb.WriteString("## Recent Daily Notes\n\n")
		sb.WriteString(recentNotes)
	}

	return sb.String()
}

// GetStructuredContext returns the NRA-511 structured memory block for a
// session: per-session business state (partner, document, pending actions)
// plus durable profile (preferences, company). Always injected when present;
// returns empty string when nothing is stored (zero token cost).
func (ms *MemoryStore) GetStructuredContext(sessionKey string) string {
	if sessionKey == "" {
		return ""
	}
	var parts []string

	if ms.sessions != nil {
		if summary := ms.sessions.GetSessionSummary(sessionKey); summary != "" {
			parts = append(parts, summary)
		}
	}
	if ms.longTerm != nil {
		if profile, err := ms.longTerm.BuildPromptContext(); err == nil && profile != "" {
			parts = append(parts, profile)
		}
	}

	if len(parts) == 0 {
		return ""
	}
	return "## Structured Memory\n\n" + strings.Join(parts, "\n")
}

// SessionMemory exposes the session store for field updates (tool layer).
func (ms *MemoryStore) SessionMemory() *corememory.SessionMemoryStore {
	return ms.sessions
}

// LongTermMemory exposes the long-term store for preference updates.
func (ms *MemoryStore) LongTermMemory() *corememory.LongTermStore {
	return ms.longTerm
}

func (ms *MemoryStore) GetRelevantContext(opts PromptMemoryOptions) string {
	searchOpts := corememory.SearchOptions{
		Query:    opts.Query,
		Limit:    3,
		Channel:  opts.Channel,
		ChatID:   opts.ChatID,
		SenderID: opts.SenderID,
		Metadata: opts.Metadata,
	}

	hotContext := ""
	if ms.sqlite != nil {
		context, err := ms.sqlite.BuildRelevantContext(searchOpts)
		if err == nil {
			hotContext = context
		}
	}

	coldContext := ""
	if ms.historical != nil {
		context, err := ms.historical.BuildRelevantContext(searchOpts)
		if err == nil {
			coldContext = rewriteRelevantHeading(context, "## Historical Memory Recall")
		}
	}

	// Recipe store: resolved query→tool+args patterns as few-shot.
	recipeContext := ""
	if ms.recipes != nil {
		context, err := ms.recipes.BuildRecipeContext(opts.Query, opts.Channel, opts.ChatID, 3)
		if err == nil && context != "" {
			recipeContext = rewriteRelevantHeading(context, "## Known Resolved Patterns")
		}
	}

	parts := make([]string, 0, 3)
	if hotContext != "" {
		parts = append(parts, hotContext)
	}
	if coldContext != "" {
		parts = append(parts, coldContext)
	}
	if recipeContext != "" {
		parts = append(parts, recipeContext)
	}
	return strings.Join(parts, "\n\n---\n\n")
}

// SaveRecipe records a successful query→tool+args resolution for reuse.
func (ms *MemoryStore) SaveRecipe(query, tool, args, channel, chatID, senderID string) {
	if ms.recipes == nil || query == "" || tool == "" {
		return
	}
	_, _ = ms.recipes.SaveRecipe(query, tool, args, channel, chatID, senderID, true)
}

// RecipeCount returns the number of stored recipes (diagnostics).
func (ms *MemoryStore) RecipeCount() int {
	if ms.recipes == nil {
		return 0
	}
	n, err := ms.recipes.CountRecipes()
	if err != nil {
		return 0
	}
	return n
}

func rewriteRelevantHeading(context string, heading string) string {
	trimmed := strings.TrimSpace(context)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "## Relevant Memory Recall") {
		return strings.Replace(trimmed, "## Relevant Memory Recall", heading, 1)
	}
	return heading + "\n\n" + trimmed
}

func (ms *MemoryStore) syncFile(path string) error {
	if ms.sqlite == nil {
		return nil
	}
	return ms.sqlite.SyncFile(path)
}

func (ms *MemoryStore) SQLitePath() string {
	if ms.sqlite == nil {
		return ""
	}
	return ms.sqlite.DBPath()
}
