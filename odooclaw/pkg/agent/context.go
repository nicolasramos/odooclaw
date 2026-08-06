package agent

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/browsercopilot"
	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/skills"
)

type ContextBuilder struct {
	workspace    string
	skillsLoader *skills.SkillsLoader
	memory       *MemoryStore
	browser      browserContextResolver
	contextWindowTokens int // max estimated tokens to keep from history (0 = unlimited)
	toolResultMaxChars  int // max chars per tool result content (0 = unlimited)
	model               string // agent model name, used to gate a minimal system prompt for local small models

	// Cache for system prompt to avoid rebuilding on every call.
	// This fixes issue #607: repeated reprocessing of the entire context.
	// The cache auto-invalidates when workspace source files change (mtime check).
	systemPromptMutex  sync.RWMutex
	cachedSystemPrompt string
	cachedAt           time.Time // max observed mtime across tracked paths at cache build time

	// existedAtCache tracks which source file paths existed the last time the
	// cache was built. This lets sourceFilesChanged detect files that are newly
	// created (didn't exist at cache time, now exist) or deleted (existed at
	// cache time, now gone) — both of which should trigger a cache rebuild.
	existedAtCache map[string]bool

	// skillFilesAtCache snapshots the skill tree file set and mtimes at cache
	// build time. This catches nested file creations/deletions/mtime changes
	// that may not update the top-level skill root directory mtime.
	skillFilesAtCache map[string]time.Time
}

type browserContextResolver interface {
	ResolveContext(context.Context, browsercopilot.ResolveRequest) (browsercopilot.ContextResponse, error)
}

func getGlobalConfigDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".odooclaw")
}

func NewContextBuilder(workspace string, contextWindowTokens, toolResultMaxChars int) *ContextBuilder {
	// builtin skills: skills directory in current project
	// Use the skills/ directory under the current working directory
	builtinSkillsDir := strings.TrimSpace(os.Getenv("ODOOCLAW_BUILTIN_SKILLS"))
	if builtinSkillsDir == "" {
		wd, _ := os.Getwd()
		builtinSkillsDir = filepath.Join(wd, "skills")
	}
	globalSkillsDir := filepath.Join(getGlobalConfigDir(), "skills")

	return &ContextBuilder{
		workspace:           workspace,
		skillsLoader:        skills.NewSkillsLoader(workspace, globalSkillsDir, builtinSkillsDir),
		memory:              NewMemoryStore(workspace),
		browser:             browsercopilot.NewClientFromEnv(),
		contextWindowTokens: contextWindowTokens,
		toolResultMaxChars:  toolResultMaxChars,
	}
}

// SetModel records the agent model name. Small local fine-tuned models
// (llama.cpp/ollama, e.g. odooclaw-v25e) are trained on minimal prompts and
// degrade when handed the full 18K-char system prompt (identity + AGENTS.md +
// skills + memory). Setting the model lets BuildSystemPrompt switch to a
// compact prompt for those models. InvalidateCache must be called if the model
// is set after the cache has been populated.
func (cb *ContextBuilder) SetModel(model string) {
	cb.model = model
}

// isLocalSmallModel reports whether the model name refers to a small local
// fine-tuned model that needs a minimal system prompt.
func (cb *ContextBuilder) isLocalSmallModel() bool {
	lower := strings.ToLower(cb.model)
	return strings.Contains(lower, "odooclaw") ||
		strings.Contains(lower, "local") ||
		strings.Contains(lower, "qwen") ||
		strings.Contains(lower, "llama") ||
		strings.Contains(lower, "0.5b") ||
		strings.Contains(lower, "1.5b")
}

// buildMinimalSystemPrompt returns a compact system prompt tailored to small
// local fine-tuned models. It keeps only the essential instructions: the agent
// acts on Odoo via the available tools, emits <tool_call> blocks, and must not
// invent fields. The list of available tools is appended separately as plain
// text by the provider (injectToolsAsText) to match the training format.
func buildMinimalSystemPrompt() string {
	return `Eres odooclaw, un asistente que gestiona Odoo ERP.

Instrucciones:
- Usa SIEMPRE una herramienta para realizar cualquier acción. No la describas ni la finjas.
- Emite las tool calls con el formato <tool_call>{"name":"<herramienta>","arguments":"<JSON con los argumentos>"}</tool_call>.
- Usa EXACTAMENTE el nombre de herramienta proporcionado. No inventes nombres.
- No inventes campos ni datos: usa únicamente la información que el usuario te da o que ya existe en Odoo.
- Si una operación es destructiva o requiere confirmación, pregunta primero antes de ejecutarla.
- Responde en el mismo idioma que el usuario.
- Mantén las respuestas breves y directas.

Formato de respuesta con registros de Odoo:
- Cuando la herramienta devuelva un registro con su id, incluye SIEMPRE un enlace clicable en markdown: [Nombre del registro](/odoo/<modelo>/{id}).
  Ejemplo para un partner: [Acme Corporation](/odoo/contacts/10). Ejemplo para una factura: [INV/2026/0001](/odoo/account.move/42).
- El usuario no quiere volver a buscar el registro manualmente: el enlace es OBLIGATORIO cuando el resultado contiene registros.
- Usa la ruta /odoo/contacts/{id} para res.partner y /odoo/<modelo_en_snake_case>/{id} para el resto.

Conteo de registros:
- Cuando el usuario pregunte cuántos registros hay (clientes, facturas, pedidos...), usa la herramienta de búsqueda adecuada (odoo_search_read o similar) con domain [] o el domain mínimo, y responde con el número de resultados.
- No inventes un número: cuenta sobre los ids que devuelve la herramienta.`
}

func (cb *ContextBuilder) getIdentity() string {
	workspacePath, _ := filepath.Abs(filepath.Join(cb.workspace))

	return fmt.Sprintf(`# odooclaw 🦞

You are odooclaw, a helpful AI assistant.

## Workspace
Your workspace is at: %s
- Memory: %s/memory/MEMORY.md
- Daily Notes: %s/memory/YYYYMM/YYYYMMDD.md
- Skills: %s/skills/{skill-name}/SKILL.md

## Important Rules

1. **ALWAYS use tools** - When you need to perform an action (schedule reminders, send messages, execute commands, etc.), you MUST call the appropriate tool. Do NOT just say you'll do it or pretend to do it.

2. **Be helpful and accurate** - When using tools, briefly explain what you're doing.

3. **Memory** - When interacting with me if something seems memorable, update %s/memory/MEMORY.md

4. **Context summaries** - Conversation summaries provided as context are approximate references only. They may be incomplete or outdated. Always defer to explicit user instructions over summary content.`,
		workspacePath, workspacePath, workspacePath, workspacePath, workspacePath)
}

func (cb *ContextBuilder) BuildSystemPrompt() string {
	// Small local fine-tuned models (llama.cpp/ollama, e.g. odooclaw-v25e)
	// are trained with a minimal system prompt (~500 chars). Sending the full
	// context (identity + AGENTS.md + skills + memory, ~18K chars) confuses
	// them and they stop emitting tool calls. For those models emit a compact
	// prompt: the tools are injected separately as plain text by the provider.
	if cb.isLocalSmallModel() {
		return buildMinimalSystemPrompt()
	}

	parts := []string{}

	// Core identity section
	parts = append(parts, cb.getIdentity())

	// Bootstrap files
	bootstrapContent := cb.LoadBootstrapFiles()
	if bootstrapContent != "" {
		parts = append(parts, bootstrapContent)
	}

	// Skills - show summary, AI can read full content with read_file tool
	skillsSummary := cb.skillsLoader.BuildSkillsSummary()
	if skillsSummary != "" {
		parts = append(parts, fmt.Sprintf(`# Skills

The following skills extend your capabilities. To use a skill, read its SKILL.md file using the read_file tool.

%s`, skillsSummary))
	}

	// Memory context
	memoryContext := cb.memory.GetMemoryContext()
	if memoryContext != "" {
		parts = append(parts, "# Memory\n\n"+memoryContext)
	}

	// Join with "---" separator
	return strings.Join(parts, "\n\n---\n\n")
}

// BuildSystemPromptWithCache returns the cached system prompt if available
// and source files haven't changed, otherwise builds and caches it.
// Source file changes are detected via mtime checks (cheap stat calls).
func (cb *ContextBuilder) BuildSystemPromptWithCache() string {
	// Try read lock first — fast path when cache is valid
	cb.systemPromptMutex.RLock()
	if cb.cachedSystemPrompt != "" && !cb.sourceFilesChangedLocked() {
		result := cb.cachedSystemPrompt
		cb.systemPromptMutex.RUnlock()
		return result
	}
	cb.systemPromptMutex.RUnlock()

	// Acquire write lock for building
	cb.systemPromptMutex.Lock()
	defer cb.systemPromptMutex.Unlock()

	// Double-check: another goroutine may have rebuilt while we waited
	if cb.cachedSystemPrompt != "" && !cb.sourceFilesChangedLocked() {
		return cb.cachedSystemPrompt
	}

	// Snapshot the baseline (existence + max mtime) BEFORE building the prompt.
	// This way cachedAt reflects the pre-build state: if a file is modified
	// during BuildSystemPrompt, its new mtime will be > baseline.maxMtime,
	// so the next sourceFilesChangedLocked check will correctly trigger a
	// rebuild. The alternative (baseline after build) risks caching stale
	// content with a too-new baseline, making the staleness invisible.
	baseline := cb.buildCacheBaseline()
	prompt := cb.BuildSystemPrompt()
	cb.cachedSystemPrompt = prompt
	cb.cachedAt = baseline.maxMtime
	cb.existedAtCache = baseline.existed
	cb.skillFilesAtCache = baseline.skillFiles

	logger.DebugCF("agent", "System prompt cached",
		map[string]any{
			"length": len(prompt),
		})

	return prompt
}

// InvalidateCache clears the cached system prompt.
// Normally not needed because the cache auto-invalidates via mtime checks,
// but this is useful for tests or explicit reload commands.
func (cb *ContextBuilder) InvalidateCache() {
	cb.systemPromptMutex.Lock()
	defer cb.systemPromptMutex.Unlock()

	cb.cachedSystemPrompt = ""
	cb.cachedAt = time.Time{}
	cb.existedAtCache = nil
	cb.skillFilesAtCache = nil

	logger.DebugCF("agent", "System prompt cache invalidated", nil)
}

// sourcePaths returns non-skill workspace source files tracked for cache
// invalidation (bootstrap files + memory). Skill roots are handled separately
// because they require both directory-level and recursive file-level checks.
func (cb *ContextBuilder) sourcePaths() []string {
	recentMemoryPaths := []string{}
	for i := range 3 {
		date := time.Now().AddDate(0, 0, -i).Format("20060102")
		recentMemoryPaths = append(recentMemoryPaths, filepath.Join(cb.workspace, "memory", date[:6], date+".md"))
	}

	return []string{
		filepath.Join(cb.workspace, "AGENTS.md"),
		filepath.Join(cb.workspace, "SOUL.md"),
		filepath.Join(cb.workspace, "USER.md"),
		filepath.Join(cb.workspace, "IDENTITY.md"),
		filepath.Join(cb.workspace, "memory"),
		filepath.Join(cb.workspace, "memory", "MEMORY.md"),
		cb.memory.SQLitePath(),
		recentMemoryPaths[0],
		recentMemoryPaths[1],
		recentMemoryPaths[2],
	}
}

// skillRoots returns all skill root directories that can affect
// BuildSkillsSummary output (workspace/global/builtin).
func (cb *ContextBuilder) skillRoots() []string {
	if cb.skillsLoader == nil {
		return []string{filepath.Join(cb.workspace, "skills")}
	}

	roots := cb.skillsLoader.SkillRoots()
	if len(roots) == 0 {
		return []string{filepath.Join(cb.workspace, "skills")}
	}
	return roots
}

// cacheBaseline holds the file existence snapshot and the latest observed
// mtime across all tracked paths. Used as the cache reference point.
type cacheBaseline struct {
	existed    map[string]bool
	skillFiles map[string]time.Time
	maxMtime   time.Time
}

// buildCacheBaseline records which tracked paths currently exist and computes
// the latest mtime across all tracked files + skills directory contents.
// Called under write lock when the cache is built.
func (cb *ContextBuilder) buildCacheBaseline() cacheBaseline {
	skillRoots := cb.skillRoots()

	// All paths whose existence we track: source files + all skill roots.
	allPaths := append(cb.sourcePaths(), skillRoots...)

	existed := make(map[string]bool, len(allPaths))
	skillFiles := make(map[string]time.Time)
	var maxMtime time.Time

	for _, p := range allPaths {
		info, err := os.Stat(p)
		existed[p] = err == nil
		if err == nil && info.ModTime().After(maxMtime) {
			maxMtime = info.ModTime()
		}
	}

	// Walk all skill roots recursively to snapshot skill files and mtimes.
	// Use os.Stat (not d.Info) for consistency with sourceFilesChanged checks.
	for _, root := range skillRoots {
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr == nil && !d.IsDir() {
				if info, err := os.Stat(path); err == nil {
					skillFiles[path] = info.ModTime()
					if info.ModTime().After(maxMtime) {
						maxMtime = info.ModTime()
					}
				}
			}
			return nil
		})
	}

	// If no tracked files exist yet (empty workspace), maxMtime is zero.
	// Use a very old non-zero time so that:
	// 1. cachedAt.IsZero() won't trigger perpetual rebuilds.
	// 2. Any real file created afterwards has mtime > cachedAt, so it
	//    will be detected by fileChangedSince (unlike time.Now() which
	//    could race with a file whose mtime <= Now).
	if maxMtime.IsZero() {
		maxMtime = time.Unix(1, 0)
	}

	return cacheBaseline{existed: existed, skillFiles: skillFiles, maxMtime: maxMtime}
}

// sourceFilesChangedLocked checks whether any workspace source file has been
// modified, created, or deleted since the cache was last built.
//
// IMPORTANT: The caller MUST hold at least a read lock on systemPromptMutex.
// Go's sync.RWMutex is not reentrant, so this function must NOT acquire the
// lock itself (it would deadlock when called from BuildSystemPromptWithCache
// which already holds RLock or Lock).
func (cb *ContextBuilder) sourceFilesChangedLocked() bool {
	if cb.cachedAt.IsZero() {
		return true
	}

	// Check tracked source files (bootstrap + memory).
	if slices.ContainsFunc(cb.sourcePaths(), cb.fileChangedSince) {
		return true
	}

	// --- Skill roots (workspace/global/builtin) ---
	//
	// For each root:
	// 1. Creation/deletion and root directory mtime changes are tracked by fileChangedSince.
	// 2. Nested file create/delete/mtime changes are tracked by the skill file snapshot.
	for _, root := range cb.skillRoots() {
		if cb.fileChangedSince(root) {
			return true
		}
	}
	if skillFilesChangedSince(cb.skillRoots(), cb.skillFilesAtCache) {
		return true
	}

	return false
}

// fileChangedSince returns true if a tracked source file has been modified,
// newly created, or deleted since the cache was built.
//
// Four cases:
//   - existed at cache time, exists now -> check mtime
//   - existed at cache time, gone now   -> changed (deleted)
//   - absent at cache time,  exists now -> changed (created)
//   - absent at cache time,  gone now   -> no change
func (cb *ContextBuilder) fileChangedSince(path string) bool {
	// Defensive: if existedAtCache was never initialized, treat as changed
	// so the cache rebuilds rather than silently serving stale data.
	if cb.existedAtCache == nil {
		return true
	}

	existedBefore := cb.existedAtCache[path]
	info, err := os.Stat(path)
	existsNow := err == nil

	if existedBefore != existsNow {
		return true // file was created or deleted
	}
	if !existsNow {
		return false // didn't exist before, doesn't exist now
	}
	return info.ModTime().After(cb.cachedAt)
}

// errWalkStop is a sentinel error used to stop filepath.WalkDir early.
// Using a dedicated error (instead of fs.SkipAll) makes the early-exit
// intent explicit and avoids the nilerr linter warning that would fire
// if the callback returned nil when its err parameter is non-nil.
var errWalkStop = errors.New("walk stop")

// skillFilesChangedSince compares the current recursive skill file tree
// against the cache-time snapshot. Any create/delete/mtime drift invalidates
// the cache.
func skillFilesChangedSince(skillRoots []string, filesAtCache map[string]time.Time) bool {
	// Defensive: if the snapshot was never initialized, force rebuild.
	if filesAtCache == nil {
		return true
	}

	// Check cached files still exist and keep the same mtime.
	for path, cachedMtime := range filesAtCache {
		info, err := os.Stat(path)
		if err != nil {
			// A previously tracked file disappeared (or became inaccessible):
			// either way, cached skill summary may now be stale.
			return true
		}
		if !info.ModTime().Equal(cachedMtime) {
			return true
		}
	}

	// Check no new files appeared under any skill root.
	changed := false
	for _, root := range skillRoots {
		if strings.TrimSpace(root) == "" {
			continue
		}

		err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				// Treat unexpected walk errors as changed to avoid stale cache.
				if !os.IsNotExist(walkErr) {
					changed = true
					return errWalkStop
				}
				return nil
			}
			if d.IsDir() {
				return nil
			}
			if _, ok := filesAtCache[path]; !ok {
				changed = true
				return errWalkStop
			}
			return nil
		})

		if changed {
			return true
		}
		if err != nil && !errors.Is(err, errWalkStop) && !os.IsNotExist(err) {
			logger.DebugCF("agent", "skills walk error", map[string]any{"error": err.Error()})
			return true
		}
	}

	return false
}

func (cb *ContextBuilder) LoadBootstrapFiles() string {
	bootstrapFiles := []string{
		"AGENTS.md",
		"SOUL.md",
		"USER.md",
		"IDENTITY.md",
	}

	var sb strings.Builder
	for _, filename := range bootstrapFiles {
		filePath := filepath.Join(cb.workspace, filename)
		if data, err := os.ReadFile(filePath); err == nil {
			fmt.Fprintf(&sb, "## %s\n\n%s\n\n", filename, data)
		}
	}

	return sb.String()
}

// buildDynamicContext returns a short dynamic context string with per-request info.
// This changes every request (time, session) so it is NOT part of the cached prompt.
// LLM-side KV cache reuse is achieved by each provider adapter's native mechanism:
//   - Anthropic: per-block cache_control (ephemeral) on the static SystemParts block
//   - OpenAI / Codex: prompt_cache_key for prefix-based caching
//
// See: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
// See: https://platform.openai.com/docs/guides/prompt-caching
func (cb *ContextBuilder) buildDynamicContext(
	currentMessage, channel, chatID, senderID string,
	metadata map[string]string,
) string {
	now := time.Now().Format("2006-01-02 15:04 (Monday)")
	rt := fmt.Sprintf("%s %s, Go %s", runtime.GOOS, runtime.GOARCH, runtime.Version())

	var sb strings.Builder
	fmt.Fprintf(&sb, "## Current Time\n%s\n\n## Runtime\n%s", now, rt)

	if channel != "" && chatID != "" {
		fmt.Fprintf(&sb, "\n\n## Current Session\nChannel: %s\nChat ID: %s", channel, chatID)
		if senderID != "" {
			fmt.Fprintf(&sb, "\nSender ID: %s", senderID)
		}
		appendSessionMetadata(&sb, channel, metadata)
	}

	relevantMemory := cb.memory.GetRelevantContext(PromptMemoryOptions{
		Query:    currentMessage,
		Channel:  channel,
		ChatID:   chatID,
		SenderID: senderID,
		Metadata: metadata,
	})
	if relevantMemory != "" {
		fmt.Fprintf(&sb, "\n\n%s", relevantMemory)
	}

	browserContext := cb.getBrowserContext(channel, chatID, senderID)
	if browserContext != "" {
		fmt.Fprintf(&sb, "\n\n## Browser Context Usage\nThe user has explicitly shared their current browser tab with you for this conversation.\nTreat the Browser Context block below as what is currently visible on their screen.\nIf the user asks what you see on screen, answer from that Browser Context.\nWhen visible tables or list rows are present, use all listed rows and footer totals before asking the user for missing items.\nDo not say you cannot see the screen when Browser Context is present.\n\n%s", browserContext)
	}

	return sb.String()
}

func (cb *ContextBuilder) getBrowserContext(channel, chatID, senderID string) string {
	if cb.browser == nil || strings.TrimSpace(channel) == "" || strings.TrimSpace(chatID) == "" {
		return ""
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()

	resolved, err := cb.browser.ResolveContext(ctx, browsercopilot.ResolveRequest{
		Channel:  channel,
		ChatID:   chatID,
		SenderID: senderID,
	})
	if err != nil || !resolved.Found {
		return ""
	}

	return formatBrowserContext(resolved)
}

func formatBrowserContext(resolved browsercopilot.ContextResponse) string {
	var sb strings.Builder
	sb.WriteString("## Browser Context\n")
	sb.WriteString("This is the latest shared browser state for the current conversation.\n")
	if resolved.AgeSeconds != nil {
		fmt.Fprintf(&sb, "Shared %ds ago.\n", *resolved.AgeSeconds)
	}
	if resolved.PageTitle != "" {
		fmt.Fprintf(&sb, "Title: %s\n", resolved.PageTitle)
	}
	if resolved.PageURL != "" {
		fmt.Fprintf(&sb, "URL: %s\n", resolved.PageURL)
	}
	if resolved.Domain != "" {
		fmt.Fprintf(&sb, "Domain: %s\n", resolved.Domain)
	}
	if resolved.App.Detected != "" {
		fmt.Fprintf(&sb, "Detected App: %s\n", resolved.App.Detected)
	}
	if resolved.App.Model != "" {
		fmt.Fprintf(&sb, "Model: %s\n", resolved.App.Model)
	}
	if resolved.App.RecordID != nil {
		fmt.Fprintf(&sb, "Record ID: %d\n", *resolved.App.RecordID)
	}
	if resolved.App.ViewType != "" {
		fmt.Fprintf(&sb, "View Type: %s\n", resolved.App.ViewType)
	}
	if len(resolved.Breadcrumbs) > 0 {
		fmt.Fprintf(&sb, "Breadcrumbs: %s\n", strings.Join(resolved.Breadcrumbs, " > "))
	}
	if len(resolved.Headings) > 0 {
		fmt.Fprintf(&sb, "Headings: %s\n", strings.Join(resolved.Headings, " | "))
	}
	if len(resolved.VisibleFields) > 0 {
		fmt.Fprintf(&sb, "Visible Fields: %s\n", strings.Join(resolved.VisibleFields, ", "))
	}
	if len(resolved.MainButtons) > 0 {
		fmt.Fprintf(&sb, "Main Buttons: %s\n", strings.Join(resolved.MainButtons, ", "))
	}
	if resolved.VisibleTextSummary != "" {
		fmt.Fprintf(&sb, "Summary: %s\n", resolved.VisibleTextSummary)
	}
	if len(resolved.VisibleTables) > 0 {
		for _, table := range resolved.VisibleTables {
			fmt.Fprintf(&sb, "Visible Table: %s\n", tableLabel(table))
			if table.RowCount > 0 {
				fmt.Fprintf(&sb, "Visible Row Count: %d\n", table.RowCount)
			}
			if len(table.Headers) > 0 {
				fmt.Fprintf(&sb, "Columns: %s\n", strings.Join(table.Headers, " | "))
			}
			for idx, row := range table.Rows {
				formatted := formatTableRow(table.Headers, row)
				if formatted == "" {
					continue
				}
				fmt.Fprintf(&sb, "Row %d: %s\n", idx+1, formatted)
			}
			if len(table.Footer) > 0 {
				fmt.Fprintf(&sb, "Footer: %s\n", strings.Join(filterNonEmpty(table.Footer), " | "))
			}
		}
	}
	return strings.TrimSpace(sb.String())
}

func filterNonEmpty(values []string) []string {
	filtered := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			filtered = append(filtered, trimmed)
		}
	}
	return filtered
}

func tableLabel(table browsercopilot.VisibleTable) string {
	if strings.TrimSpace(table.Title) != "" {
		return table.Title
	}
	return table.ID
}

func formatTableRow(headers, row []string) string {
	parts := []string{}
	for idx, cell := range row {
		value := strings.TrimSpace(cell)
		if value == "" {
			continue
		}
		if idx < len(headers) {
			header := strings.TrimSpace(headers[idx])
			if header != "" {
				parts = append(parts, fmt.Sprintf("%s: %s", header, value))
				continue
			}
		}
		parts = append(parts, value)
	}
	return strings.Join(parts, " | ")
}

func (cb *ContextBuilder) BuildMessages(
	history []providers.Message,
	summary string,
	currentMessage string,
	media []string,
	channel, chatID, senderID string,
	metadata map[string]string,
) []providers.Message {
	messages := []providers.Message{}

	// The static part (identity, bootstrap, skills, memory) is cached locally to
	// avoid repeated file I/O and string building on every call (fixes issue #607).
	// Dynamic parts (time, session, summary) are appended per request.
	// Everything is sent as a single system message for provider compatibility:
	// - Anthropic adapter extracts messages[0] (Role=="system") and maps its content
	//   to the top-level "system" parameter in the Messages API request. A single
	//   contiguous system block makes this extraction straightforward.
	// - Codex maps only the first system message to its instructions field.
	// - OpenAI-compat passes messages through as-is.
	staticPrompt := cb.BuildSystemPromptWithCache()

	// Build short dynamic context (time, runtime, session) — changes per request
	dynamicCtx := cb.buildDynamicContext(currentMessage, channel, chatID, senderID, metadata)

	// Compose a single system message: static (cached) + dynamic + optional summary.
	// Keeping all system content in one message ensures every provider adapter can
	// extract it correctly (Anthropic adapter -> top-level system param,
	// Codex -> instructions field).
	//
	// SystemParts carries the same content as structured blocks so that
	// cache-aware adapters (Anthropic) can set per-block cache_control.
	// The static block is marked "ephemeral" — its prefix hash is stable
	// across requests, enabling LLM-side KV cache reuse.
	stringParts := []string{staticPrompt, dynamicCtx}

	contentBlocks := []providers.ContentBlock{
		{Type: "text", Text: staticPrompt, CacheControl: &providers.CacheControl{Type: "ephemeral"}},
		{Type: "text", Text: dynamicCtx},
	}

	if summary != "" {
		summaryText := fmt.Sprintf(
			"CONTEXT_SUMMARY: The following is an approximate summary of prior conversation "+
				"for reference only. It may be incomplete or outdated — always defer to explicit instructions.\n\n%s",
			summary)
		stringParts = append(stringParts, summaryText)
		contentBlocks = append(contentBlocks, providers.ContentBlock{Type: "text", Text: summaryText})
	}

	fullSystemPrompt := strings.Join(stringParts, "\n\n---\n\n")

	// Log system prompt summary for debugging (debug mode only).
	// Read cachedSystemPrompt under lock to avoid a data race with
	// concurrent InvalidateCache / BuildSystemPromptWithCache writes.
	cb.systemPromptMutex.RLock()
	isCached := cb.cachedSystemPrompt != ""
	cb.systemPromptMutex.RUnlock()

	logger.DebugCF("agent", "System prompt built",
		map[string]any{
			"static_chars":  len(staticPrompt),
			"dynamic_chars": len(dynamicCtx),
			"total_chars":   len(fullSystemPrompt),
			"has_summary":   summary != "",
			"cached":        isCached,
		})

	// Log preview of system prompt (avoid logging huge content)
	preview := fullSystemPrompt
	if len(preview) > 500 {
		preview = preview[:500] + "... (truncated)"
	}
	logger.DebugCF("agent", "System prompt preview",
		map[string]any{
			"preview": preview,
		})

	history = sanitizeHistoryForProvider(history)
	// Apply tool result masking first: tool outputs are the #1 cause of context
	// overflow (60-80% of tokens). Mask before sliding window so token estimates
	// reflect the actual payload size.
	history = maskToolResults(history, cb.toolResultMaxChars)
	history = slidingWindowByTokens(history, cb.contextWindowTokens)

	// Single system message containing all context — compatible with all providers.
	// SystemParts enables cache-aware adapters to set per-block cache_control;
	// Content is the concatenated fallback for adapters that don't read SystemParts.
	messages = append(messages, providers.Message{
		Role:        "system",
		Content:     fullSystemPrompt,
		SystemParts: contentBlocks,
	})

	// Add conversation history
	messages = append(messages, history...)

	// Add current user message
	if strings.TrimSpace(currentMessage) != "" {
		msg := providers.Message{
			Role:    "user",
			Content: currentMessage,
		}
		if len(media) > 0 {
			msg.Media = media
		}
		messages = append(messages, msg)
	}

	return messages
}

// maskToolResults caps the Content of each tool result message to maxChars using
// a head+tail strategy. This preserves the beginning (result type, first records)
// and the end (totals, errors) while dropping the bloated middle.
// The tool_use/tool_result pairing required by LLM protocols is preserved intact.
func maskToolResults(history []providers.Message, maxChars int) []providers.Message {
	if maxChars <= 0 {
		return history
	}
	result := make([]providers.Message, len(history))
	copy(result, history)
	for i, msg := range result {
		if msg.ToolCallID != "" && len(msg.Content) > maxChars {
			half := maxChars / 2
			if half < 1 {
				half = 1
			}
			head := msg.Content[:half]
			tail := msg.Content[len(msg.Content)-half:]
			omitted := len(msg.Content) - maxChars
			result[i].Content = fmt.Sprintf(
				"%s\n[... %d chars truncated for context efficiency ...]\n%s",
				head, omitted, tail,
			)
		}
	}
	return result
}

// charsPerToken is a rough heuristic (1 token ~= 4 chars for Latin scripts).
// Accurate enough for budget estimation without importing a full tokenizer.
const charsPerToken = 4

// slidingWindowByTokens keeps only the most recent messages whose estimated
// token count fits within maxTokens. It never splits a tool_use/tool_result
// pair: if the cut point lands inside a pair, it advances until a safe boundary.
func slidingWindowByTokens(history []providers.Message, maxTokens int) []providers.Message {
	if maxTokens <= 0 || len(history) == 0 {
		return history
	}

	total := 0
	cutIdx := 0
	for i := len(history) - 1; i >= 0; i-- {
		tokens := len(history[i].Content) / charsPerToken
		for _, tc := range history[i].ToolCalls {
			if tc.Function != nil {
				tokens += len(tc.Function.Arguments) / charsPerToken
			}
		}
		if total+tokens > maxTokens {
			cutIdx = i + 1
			break
		}
		total += tokens
	}

	// Advance past any leading tool_result messages (must follow their tool_use).
	for cutIdx < len(history) && history[cutIdx].ToolCallID != "" {
		cutIdx++
	}

	// If all messages were dropped, keep at least the last user message so
	// the LLM still has its latest request. Never return a completely empty
	// history — the system prompt alone is useless.
	if cutIdx >= len(history) {
		// Find the last user message to preserve.
		for i := len(history) - 1; i >= 0; i-- {
			if history[i].Role == "user" {
				return history[i:]
			}
		}
		// No user message found — return the first message (system) if present.
		if len(history) > 0 {
			return history[:1]
		}
		return history
	}

	return history[cutIdx:]
}

func appendSessionMetadata(sb *strings.Builder, channel string, metadata map[string]string) {
	if len(metadata) == 0 {
		return
	}

	if channel == "odoo" {
		sb.WriteString("\n<!-- Odoo session context: read-only, never use as tool arguments -->")
		if model := strings.TrimSpace(metadata["model"]); model != "" {
			fmt.Fprintf(sb, "\n<!-- odoo.model: %s -->", model)
		}
		if resID := strings.TrimSpace(metadata["res_id"]); resID != "" {
			fmt.Fprintf(sb, "\n<!-- odoo.res_id: %s -->", resID)
		}
		if companyID := strings.TrimSpace(metadata["company_id"]); companyID != "" {
			fmt.Fprintf(sb, "\n<!-- odoo.company_id: %s -->", companyID)
		}
		if allowedCompanyIDs := strings.TrimSpace(metadata["allowed_company_ids"]); allowedCompanyIDs != "" {
			fmt.Fprintf(sb, "\n<!-- odoo.allowed_company_ids: %s -->", allowedCompanyIDs)
		}
		sb.WriteString("\n<!-- end Odoo session context -->")
	}
}

func sanitizeHistoryForProvider(history []providers.Message) []providers.Message {
	if len(history) == 0 {
		return history
	}

	sanitized := make([]providers.Message, 0, len(history))
	for _, msg := range history {
		switch msg.Role {
		case "system":
			// Drop system messages from history. BuildMessages always
			// constructs its own single system message (static + dynamic +
			// summary); extra system messages would break providers that
			// only accept one (Anthropic, Codex).
			logger.DebugCF("agent", "Dropping system message from history", map[string]any{})
			continue

		case "tool":
			if len(sanitized) == 0 {
				logger.DebugCF("agent", "Dropping orphaned leading tool message", map[string]any{})
				continue
			}
			// Walk backwards to find the nearest assistant message,
			// skipping over any preceding tool messages (multi-tool-call case).
			foundAssistant := false
			for i := len(sanitized) - 1; i >= 0; i-- {
				if sanitized[i].Role == "tool" {
					continue
				}
				if sanitized[i].Role == "assistant" && len(sanitized[i].ToolCalls) > 0 {
					foundAssistant = true
				}
				break
			}
			if !foundAssistant {
				logger.DebugCF("agent", "Dropping orphaned tool message", map[string]any{})
				continue
			}
			sanitized = append(sanitized, msg)

		case "assistant":
			if len(msg.ToolCalls) > 0 {
				if len(sanitized) == 0 {
					logger.DebugCF("agent", "Dropping assistant tool-call turn at history start", map[string]any{})
					continue
				}
				prev := sanitized[len(sanitized)-1]
				if prev.Role != "user" && prev.Role != "tool" {
					logger.DebugCF(
						"agent",
						"Dropping assistant tool-call turn with invalid predecessor",
						map[string]any{"prev_role": prev.Role},
					)
					continue
				}
			}
			sanitized = append(sanitized, msg)

		default:
			sanitized = append(sanitized, msg)
		}
	}

	return sanitized
}

func (cb *ContextBuilder) AddToolResult(
	messages []providers.Message,
	toolCallID, toolName, result string,
) []providers.Message {
	messages = append(messages, providers.Message{
		Role:       "tool",
		Content:    result,
		ToolCallID: toolCallID,
	})
	return messages
}

func (cb *ContextBuilder) AddAssistantMessage(
	messages []providers.Message,
	content string,
	toolCalls []map[string]any,
) []providers.Message {
	msg := providers.Message{
		Role:    "assistant",
		Content: content,
	}
	// Always add assistant message, whether or not it has tool calls
	messages = append(messages, msg)
	return messages
}

// GetSkillsInfo returns information about loaded skills.
func (cb *ContextBuilder) GetSkillsInfo() map[string]any {
	allSkills := cb.skillsLoader.ListSkills()
	skillNames := make([]string, 0, len(allSkills))
	for _, s := range allSkills {
		skillNames = append(skillNames, s.Name)
	}
	return map[string]any{
		"total":     len(allSkills),
		"available": len(allSkills),
		"names":     skillNames,
	}
}
