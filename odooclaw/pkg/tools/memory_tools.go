package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
)

const (
	defaultMemorySearchLimit = 3
	maxMemorySearchLimit     = 10
)

type MemorySearchTool struct {
	store    *corememory.HistoricalStore
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemorySearchTool(workspace string) *MemorySearchTool {
	return &MemorySearchTool{
		store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory")),
	}
}

func (t *MemorySearchTool) Name() string {
	return "memory_search"
}

func (t *MemorySearchTool) Description() string {
	return "Search historical memory entries using the current scoped context (channel/chat/sender/metadata)."
}

func (t *MemorySearchTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"query": map[string]any{
				"type":        "string",
				"description": "Query to search in historical memory.",
			},
			"limit": map[string]any{
				"type":        "integer",
				"description": "Optional max number of results (1-10, default 3).",
			},
		},
		"required": []string{"query"},
	}
}

func (t *MemorySearchTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemorySearchTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	query, errResult := parseRequiredStringArg(args, "query")
	if errResult != nil {
		return errResult
	}

	limit, errResult := parseSearchLimit(args)
	if errResult != nil {
		return errResult
	}

	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	results, err := t.store.SearchContext(corememory.SearchOptions{
		Query:    query,
		Limit:    limit,
		Channel:  t.channel,
		ChatID:   t.chatID,
		SenderID: t.senderID,
		Metadata: cloneStringMap(t.metadata),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical memory search failed: %v", err)).WithError(err)
	}

	if len(results) == 0 {
		return SilentResult("No historical memory found for current scope.")
	}

	var b strings.Builder
	b.WriteString("## Historical Memory Recall\n\n")
	for i, result := range results {
		if i > 0 {
			b.WriteString("\n\n")
		}
		b.WriteString("### ")
		b.WriteString(filepath.Base(result.Path))
		b.WriteString("\n")
		b.WriteString(truncateMemorySnippet(result.Content, 280))
	}

	return SilentResult(b.String())
}

type MemorySaveTool struct {
	store    *corememory.HistoricalStore
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemorySaveTool(workspace string) *MemorySaveTool {
	return &MemorySaveTool{
		store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory")),
	}
}

func (t *MemorySaveTool) Name() string {
	return "memory_save"
}

func (t *MemorySaveTool) Description() string {
	return "Save a scoped historical memory entry. This stores facts/preferences only; it does not trigger actions."
}

func (t *MemorySaveTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"content": map[string]any{
				"type":        "string",
				"description": "Memory content to persist.",
			},
			"source": map[string]any{
				"type":        "string",
				"description": "Optional source label (e.g. memory_save_decision, odoo_event, user_preference).",
			},
		},
		"required": []string{"content"},
	}
}

func (t *MemorySaveTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemorySaveTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	content, errResult := parseRequiredStringArg(args, "content")
	if errResult != nil {
		return errResult
	}

	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	source := "memory_save"
	if rawSource, ok := args["source"].(string); ok {
		rawSource = strings.TrimSpace(rawSource)
		if rawSource != "" {
			source = rawSource
		}
	}

	entryID, err := t.store.Save(corememory.HistoricalSaveInput{
		Content:  content,
		Source:   source,
		Channel:  t.channel,
		ChatID:   t.chatID,
		SenderID: t.senderID,
		Metadata: cloneStringMap(t.metadata),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical memory save failed: %v", err)).WithError(err)
	}

	return SilentResult(fmt.Sprintf("Historical memory saved (entry_id=%d, scope=%s).", entryID, describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata)))
}

type MemorySaveDecisionTool struct {
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemorySaveDecisionTool() *MemorySaveDecisionTool {
	return &MemorySaveDecisionTool{}
}

func (t *MemorySaveDecisionTool) Name() string {
	return "memory_save_decision"
}

func (t *MemorySaveDecisionTool) Description() string {
	return "Evaluate whether a candidate note should be saved into scoped historical memory."
}

func (t *MemorySaveDecisionTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"content": map[string]any{
				"type":        "string",
				"description": "Candidate content to evaluate for historical memory persistence.",
			},
		},
		"required": []string{"content"},
	}
}

func (t *MemorySaveDecisionTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemorySaveDecisionTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	content, errResult := parseRequiredStringArg(args, "content")
	if errResult != nil {
		return errResult
	}

	type decisionResult struct {
		ShouldSave      bool    `json:"should_save"`
		Confidence      float64 `json:"confidence"`
		Reason          string  `json:"reason"`
		SuggestedSource string  `json:"suggested_source"`
		Scope           string  `json:"scope"`
	}

	scope := describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata)
	if validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata) != nil {
		payload, _ := json.MarshalIndent(decisionResult{
			ShouldSave:      false,
			Confidence:      0.98,
			Reason:          "missing_or_unscoped_context",
			SuggestedSource: "memory_save_decision",
			Scope:           scope,
		}, "", "  ")
		return SilentResult(string(payload))
	}

	contentLower := strings.ToLower(content)
	hasPersistentSignal := containsAny(contentLower,
		"prefers", "prefer", "preference", "prefiere", "siempre", "always", "never", "nunca",
		"customer", "cliente", "fiscal", "invoice", "billing", "timezone", "contact", "policy",
	)
	hasTransientSignal := containsAny(contentLower,
		"hello", "hola", "thanks", "gracias", "ok", "vale", "test", "ping", "now", "ahora",
	)
	isLongEnough := len([]rune(strings.TrimSpace(content))) >= 40

	shouldSave := (hasPersistentSignal || isLongEnough) && !hasTransientSignal
	confidence := 0.72
	reason := "low_signal"
	if shouldSave {
		confidence = 0.86
		reason = "contains_persistent_user_or_business_signal"
	}

	payload, _ := json.MarshalIndent(decisionResult{
		ShouldSave:      shouldSave,
		Confidence:      confidence,
		Reason:          reason,
		SuggestedSource: "memory_save_decision",
		Scope:           scope,
	}, "", "  ")

	return SilentResult(string(payload))
}

type MemoryAddFactTool struct {
	store    *corememory.HistoricalStore
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemoryAddFactTool(workspace string) *MemoryAddFactTool {
	return &MemoryAddFactTool{
		store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory")),
	}
}

func (t *MemoryAddFactTool) Name() string {
	return "memory_add_fact"
}

func (t *MemoryAddFactTool) Description() string {
	return "Add a temporal historical fact for the current scope with validity window and confidence."
}

func (t *MemoryAddFactTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"subject":    map[string]any{"type": "string", "description": "Fact subject identifier."},
			"predicate":  map[string]any{"type": "string", "description": "Fact predicate name."},
			"object":     map[string]any{"type": "string", "description": "Fact object/value."},
			"valid_from": map[string]any{"type": "integer", "description": "Optional validity start (unix seconds)."},
			"valid_to":   map[string]any{"type": "integer", "description": "Optional validity end (unix seconds)."},
			"confidence": map[string]any{"type": "number", "description": "Optional confidence 0..1 (default 0.8)."},
			"source":     map[string]any{"type": "string", "description": "Optional source label."},
		},
		"required": []string{"subject", "predicate", "object"},
	}
}

func (t *MemoryAddFactTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemoryAddFactTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	subject, errResult := parseRequiredStringArg(args, "subject")
	if errResult != nil {
		return errResult
	}
	predicate, errResult := parseRequiredStringArg(args, "predicate")
	if errResult != nil {
		return errResult
	}
	object, errResult := parseRequiredStringArg(args, "object")
	if errResult != nil {
		return errResult
	}

	validFrom, errResult := parseOptionalUnixArg(args, "valid_from")
	if errResult != nil {
		return errResult
	}
	validTo, errResult := parseOptionalUnixArg(args, "valid_to")
	if errResult != nil {
		return errResult
	}
	confidence, errResult := parseOptionalConfidenceArg(args, "confidence", 0.8)
	if errResult != nil {
		return errResult
	}

	source := "memory_add_fact"
	if rawSource, ok := args["source"].(string); ok {
		rawSource = strings.TrimSpace(rawSource)
		if rawSource != "" {
			source = rawSource
		}
	}

	saveResult, err := t.store.SaveFact(corememory.HistoricalFactInput{
		Subject:    subject,
		Predicate:  predicate,
		Object:     object,
		ValidFrom:  validFrom,
		ValidTo:    validTo,
		Confidence: confidence,
		Source:     source,
		Channel:    t.channel,
		ChatID:     t.chatID,
		SenderID:   t.senderID,
		Metadata:   cloneStringMap(t.metadata),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical fact save failed: %v", err)).WithError(err)
	}

	response := map[string]any{
		"fact_id":      saveResult.FactID,
		"deduped":      saveResult.Deduped,
		"scope":        describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata),
		"scope_path":   saveResult.FactPath,
		"subject":      subject,
		"predicate":    predicate,
		"object":       object,
		"valid_from":   validFrom,
		"valid_to":     validTo,
		"confidence":   confidence,
		"source":       source,
		"saved_status": "active",
	}

	payload, _ := json.MarshalIndent(response, "", "  ")
	return SilentResult(string(payload))
}

type MemoryQueryFactsTool struct {
	store    *corememory.HistoricalStore
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemoryQueryFactsTool(workspace string) *MemoryQueryFactsTool {
	return &MemoryQueryFactsTool{store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory"))}
}

func (t *MemoryQueryFactsTool) Name() string {
	return "memory_query_facts"
}

func (t *MemoryQueryFactsTool) Description() string {
	return "Query historical facts for current scope, optionally at a point in time."
}

func (t *MemoryQueryFactsTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"query":            map[string]any{"type": "string", "description": "Optional keywords to filter facts."},
			"as_of":            map[string]any{"type": "integer", "description": "Optional unix timestamp for validity filtering."},
			"limit":            map[string]any{"type": "integer", "description": "Optional max number of facts (1-50, default 10)."},
			"include_inactive": map[string]any{"type": "boolean", "description": "Include superseded/inactive facts."},
		},
	}
}

func (t *MemoryQueryFactsTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemoryQueryFactsTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	query := ""
	if rawQuery, ok := args["query"].(string); ok {
		query = strings.TrimSpace(rawQuery)
	}

	limit, errResult := parseOptionalBoundedIntArg(args, "limit", 10, 1, 50)
	if errResult != nil {
		return errResult
	}
	asOf, errResult := parseOptionalUnixArg(args, "as_of")
	if errResult != nil {
		return errResult
	}
	includeInactive, errResult := parseOptionalBoolArg(args, "include_inactive", false)
	if errResult != nil {
		return errResult
	}

	facts, err := t.store.QueryFacts(corememory.FactQueryOptions{
		Query:           query,
		Limit:           limit,
		AsOf:            asOf,
		IncludeInactive: includeInactive,
		Channel:         t.channel,
		ChatID:          t.chatID,
		SenderID:        t.senderID,
		Metadata:        cloneStringMap(t.metadata),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical fact query failed: %v", err)).WithError(err)
	}

	response := map[string]any{
		"scope":            describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata),
		"query":            query,
		"as_of":            asOf,
		"include_inactive": includeInactive,
		"count":            len(facts),
		"facts":            facts,
	}
	payload, _ := json.MarshalIndent(response, "", "  ")
	return SilentResult(string(payload))
}

type MemoryGetTimelineTool struct {
	store    *corememory.HistoricalStore
	channel  string
	chatID   string
	senderID string
	metadata map[string]string
}

func NewMemoryGetTimelineTool(workspace string) *MemoryGetTimelineTool {
	return &MemoryGetTimelineTool{store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory"))}
}

func (t *MemoryGetTimelineTool) Name() string {
	return "memory_get_timeline"
}

func (t *MemoryGetTimelineTool) Description() string {
	return "Get chronological timeline of historical entries and facts for current scope."
}

func (t *MemoryGetTimelineTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"limit":   map[string]any{"type": "integer", "description": "Optional max events (1-100, default 20)."},
			"from_ts": map[string]any{"type": "integer", "description": "Optional start timestamp (unix seconds)."},
			"to_ts":   map[string]any{"type": "integer", "description": "Optional end timestamp (unix seconds)."},
		},
	}
}

func (t *MemoryGetTimelineTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemoryGetTimelineTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	limit, errResult := parseOptionalBoundedIntArg(args, "limit", 20, 1, 100)
	if errResult != nil {
		return errResult
	}
	fromTS, errResult := parseOptionalUnixArg(args, "from_ts")
	if errResult != nil {
		return errResult
	}
	toTS, errResult := parseOptionalUnixArg(args, "to_ts")
	if errResult != nil {
		return errResult
	}

	events, err := t.store.GetTimeline(corememory.TimelineOptions{
		Limit:    limit,
		FromUnix: fromTS,
		ToUnix:   toTS,
		Channel:  t.channel,
		ChatID:   t.chatID,
		SenderID: t.senderID,
		Metadata: cloneStringMap(t.metadata),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical timeline query failed: %v", err)).WithError(err)
	}

	response := map[string]any{
		"scope":   describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata),
		"count":   len(events),
		"from_ts": fromTS,
		"to_ts":   toTS,
		"events":  events,
	}
	payload, _ := json.MarshalIndent(response, "", "  ")
	return SilentResult(string(payload))
}

type MemoryDebugExplainRetrievalTool struct {
	hotStore  *corememory.Store
	coldStore *corememory.HistoricalStore
	channel   string
	chatID    string
	senderID  string
	metadata  map[string]string
}

func NewMemoryDebugExplainRetrievalTool(workspace string) *MemoryDebugExplainRetrievalTool {
	memoryDir := filepath.Join(workspace, "memory")
	return &MemoryDebugExplainRetrievalTool{
		hotStore:  corememory.NewStore(memoryDir),
		coldStore: corememory.NewHistoricalStore(memoryDir),
	}
}

func (t *MemoryDebugExplainRetrievalTool) Name() string {
	return "memory_debug_explain_retrieval"
}

func (t *MemoryDebugExplainRetrievalTool) Description() string {
	return "Explain memory retrieval decisions (scope patterns, query normalization, hot/cold/facts hits)."
}

func (t *MemoryDebugExplainRetrievalTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"query":         map[string]any{"type": "string", "description": "Memory query to explain."},
			"limit":         map[string]any{"type": "integer", "description": "Optional max results per layer (1-10, default 3)."},
			"include_facts": map[string]any{"type": "boolean", "description": "Include fact matches in explanation (default true)."},
		},
		"required": []string{"query"},
	}
}

func (t *MemoryDebugExplainRetrievalTool) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	t.channel = channel
	t.chatID = chatID
	t.senderID = senderID
	t.metadata = cloneStringMap(metadata)
}

func (t *MemoryDebugExplainRetrievalTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	query, errResult := parseRequiredStringArg(args, "query")
	if errResult != nil {
		return errResult
	}
	if errResult := validateScopedMemoryContext(t.channel, t.chatID, t.senderID, t.metadata); errResult != nil {
		return errResult
	}

	limit, errResult := parseOptionalBoundedIntArg(args, "limit", 3, 1, 10)
	if errResult != nil {
		return errResult
	}
	includeFacts, errResult := parseOptionalBoolArg(args, "include_facts", true)
	if errResult != nil {
		return errResult
	}

	searchOpts := corememory.SearchOptions{
		Query:    query,
		Limit:    limit,
		Channel:  t.channel,
		ChatID:   t.chatID,
		SenderID: t.senderID,
		Metadata: cloneStringMap(t.metadata),
	}

	hotResults, err := t.hotStore.SearchContext(searchOpts)
	if err != nil {
		return ErrorResult(fmt.Sprintf("debug hot memory search failed: %v", err)).WithError(err)
	}
	coldResults, err := t.coldStore.SearchContext(searchOpts)
	if err != nil {
		return ErrorResult(fmt.Sprintf("debug historical memory search failed: %v", err)).WithError(err)
	}

	facts := []corememory.HistoricalFact{}
	if includeFacts {
		facts, err = t.coldStore.QueryFacts(corememory.FactQueryOptions{
			Query:    query,
			Limit:    limit,
			Channel:  t.channel,
			ChatID:   t.chatID,
			SenderID: t.senderID,
			Metadata: cloneStringMap(t.metadata),
		})
		if err != nil {
			return ErrorResult(fmt.Sprintf("debug fact query failed: %v", err)).WithError(err)
		}
	}

	type explainedResult struct {
		Path       string  `json:"path"`
		Score      float64 `json:"score"`
		Collection string  `json:"collection"`
		ScopeMatch bool    `json:"scope_match"`
		Snippet    string  `json:"snippet"`
	}

	explainResults := func(results []corememory.SearchResult) []explainedResult {
		items := make([]explainedResult, 0, len(results))
		for _, result := range results {
			items = append(items, explainedResult{
				Path:       result.Path,
				Score:      result.Score,
				Collection: result.Collection,
				ScopeMatch: corememory.DebugScopeMatch(result.Path, searchOpts),
				Snippet:    truncateMemorySnippet(result.Content, 180),
			})
		}
		return items
	}

	type explainedFact struct {
		ID         int64   `json:"id"`
		Subject    string  `json:"subject"`
		Predicate  string  `json:"predicate"`
		Object     string  `json:"object"`
		Status     string  `json:"status"`
		Confidence float64 `json:"confidence"`
		Path       string  `json:"path"`
		ScopeMatch bool    `json:"scope_match"`
	}

	factItems := make([]explainedFact, 0, len(facts))
	for _, fact := range facts {
		factItems = append(factItems, explainedFact{
			ID:         fact.ID,
			Subject:    fact.Subject,
			Predicate:  fact.Predicate,
			Object:     fact.Object,
			Status:     fact.Status,
			Confidence: fact.Confidence,
			Path:       fact.Path,
			ScopeMatch: corememory.DebugScopeMatch(fact.Path, searchOpts),
		})
	}

	response := map[string]any{
		"query":          query,
		"match_query":    corememory.DebugMatchQuery(query),
		"scope":          describeMemoryScope(t.channel, t.chatID, t.senderID, t.metadata),
		"scope_patterns": corememory.DebugScopePatterns(searchOpts),
		"hot_results":    explainResults(hotResults),
		"cold_results":   explainResults(coldResults),
		"facts":          factItems,
		"summary": map[string]any{
			"hot_count":  len(hotResults),
			"cold_count": len(coldResults),
			"fact_count": len(factItems),
		},
	}

	payload, _ := json.MarshalIndent(response, "", "  ")
	return SilentResult(string(payload))
}

type MemoryImportHistoryTool struct {
	store *corememory.HistoricalStore
}

func NewMemoryImportHistoryTool(workspace string) *MemoryImportHistoryTool {
	return &MemoryImportHistoryTool{store: corememory.NewHistoricalStore(filepath.Join(workspace, "memory"))}
}

func (t *MemoryImportHistoryTool) Name() string {
	return "memory_import_history"
}

func (t *MemoryImportHistoryTool) Description() string {
	return "Import existing markdown memory into historical memory storage (supports dry-run and dedupe)."
}

func (t *MemoryImportHistoryTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"dry_run": map[string]any{
				"type":        "boolean",
				"description": "If true, preview import counts without persisting data (default true).",
			},
			"source": map[string]any{
				"type":        "string",
				"description": "Optional source tag for imported entries (default memory_import_history).",
			},
			"max_files": map[string]any{
				"type":        "integer",
				"description": "Optional file cap to import (1-5000, default 500).",
			},
			"include_long_term": map[string]any{
				"type":        "boolean",
				"description": "Include MEMORY.md (default true).",
			},
			"include_daily_notes": map[string]any{
				"type":        "boolean",
				"description": "Include daily notes memory/YYYYMM/YYYYMMDD.md (default true).",
			},
			"include_scoped": map[string]any{
				"type":        "boolean",
				"description": "Include scoped memory files under memory/scopes/** (default true).",
			},
			"include_memory_notes": map[string]any{
				"type":        "boolean",
				"description": "Include other markdown notes under memory/** (default false).",
			},
		},
	}
}

func (t *MemoryImportHistoryTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx

	dryRun, errResult := parseOptionalBoolArg(args, "dry_run", true)
	if errResult != nil {
		return errResult
	}
	maxFiles, errResult := parseOptionalBoundedIntArg(args, "max_files", 500, 1, 5000)
	if errResult != nil {
		return errResult
	}
	includeLongTerm, errResult := parseOptionalBoolArg(args, "include_long_term", true)
	if errResult != nil {
		return errResult
	}
	includeDailyNotes, errResult := parseOptionalBoolArg(args, "include_daily_notes", true)
	if errResult != nil {
		return errResult
	}
	includeScoped, errResult := parseOptionalBoolArg(args, "include_scoped", true)
	if errResult != nil {
		return errResult
	}
	includeMemoryNotes, errResult := parseOptionalBoolArg(args, "include_memory_notes", false)
	if errResult != nil {
		return errResult
	}

	source := "memory_import_history"
	if rawSource, ok := args["source"].(string); ok {
		rawSource = strings.TrimSpace(rawSource)
		if rawSource != "" {
			source = rawSource
		}
	}

	result, err := t.store.ImportFromMarkdown(corememory.HistoricalImportOptions{
		IncludeLongTerm:   includeLongTerm,
		IncludeDailyNotes: includeDailyNotes,
		IncludeScoped:     includeScoped,
		IncludeMemoryNote: includeMemoryNotes,
		MaxFiles:          maxFiles,
		Source:            source,
		DryRun:            dryRun,
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("historical memory import failed: %v", err)).WithError(err)
	}

	response := map[string]any{
		"dry_run":              result.DryRun,
		"source":               source,
		"max_files":            maxFiles,
		"include_long_term":    includeLongTerm,
		"include_daily_notes":  includeDailyNotes,
		"include_scoped":       includeScoped,
		"include_memory_notes": includeMemoryNotes,
		"summary":              result,
	}
	payload, _ := json.MarshalIndent(response, "", "  ")
	return SilentResult(string(payload))
}

func parseRequiredStringArg(args map[string]any, key string) (string, *ToolResult) {
	raw, ok := args[key].(string)
	if !ok {
		return "", ErrorResult(fmt.Sprintf("%s is required", key))
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", ErrorResult(fmt.Sprintf("%s is required", key))
	}
	return raw, nil
}

func parseOptionalUnixArg(args map[string]any, key string) (int64, *ToolResult) {
	raw, ok := args[key]
	if !ok {
		return 0, nil
	}
	switch v := raw.(type) {
	case float64:
		if v < 0 {
			return 0, ErrorResult(fmt.Sprintf("%s must be >= 0", key))
		}
		return int64(v), nil
	case int:
		if v < 0 {
			return 0, ErrorResult(fmt.Sprintf("%s must be >= 0", key))
		}
		return int64(v), nil
	case int64:
		if v < 0 {
			return 0, ErrorResult(fmt.Sprintf("%s must be >= 0", key))
		}
		return v, nil
	default:
		return 0, ErrorResult(fmt.Sprintf("%s must be a unix timestamp number", key))
	}
}

func parseOptionalConfidenceArg(args map[string]any, key string, fallback float64) (float64, *ToolResult) {
	raw, ok := args[key]
	if !ok {
		return fallback, nil
	}
	var value float64
	switch v := raw.(type) {
	case float64:
		value = v
	case int:
		value = float64(v)
	default:
		return 0, ErrorResult(fmt.Sprintf("%s must be a number", key))
	}
	if value < 0 || value > 1 {
		return 0, ErrorResult(fmt.Sprintf("%s must be between 0 and 1", key))
	}
	return value, nil
}

func parseOptionalBoundedIntArg(args map[string]any, key string, fallback int, min int, max int) (int, *ToolResult) {
	raw, ok := args[key]
	if !ok {
		return fallback, nil
	}
	var value int
	switch v := raw.(type) {
	case float64:
		value = int(v)
	case int:
		value = v
	default:
		return 0, ErrorResult(fmt.Sprintf("%s must be a number", key))
	}
	if value < min || value > max {
		return 0, ErrorResult(fmt.Sprintf("%s must be between %d and %d", key, min, max))
	}
	return value, nil
}

func parseOptionalBoolArg(args map[string]any, key string, fallback bool) (bool, *ToolResult) {
	raw, ok := args[key]
	if !ok {
		return fallback, nil
	}
	value, ok := raw.(bool)
	if !ok {
		return false, ErrorResult(fmt.Sprintf("%s must be boolean", key))
	}
	return value, nil
}

func parseSearchLimit(args map[string]any) (int, *ToolResult) {
	raw, ok := args["limit"]
	if !ok {
		return defaultMemorySearchLimit, nil
	}

	var limit int
	switch v := raw.(type) {
	case float64:
		limit = int(v)
	case int:
		limit = v
	default:
		return 0, ErrorResult("limit must be a number")
	}

	if limit <= 0 {
		return 0, ErrorResult("limit must be greater than 0")
	}
	if limit > maxMemorySearchLimit {
		limit = maxMemorySearchLimit
	}

	return limit, nil
}

func validateScopedMemoryContext(channel, chatID, senderID string, metadata map[string]string) *ToolResult {
	channel = strings.TrimSpace(channel)
	chatID = strings.TrimSpace(chatID)
	senderID = strings.TrimSpace(senderID)

	if channel == "" {
		return ErrorResult("scoped context required: missing channel")
	}

	model := strings.TrimSpace(metadata["model"])
	resID := strings.TrimSpace(metadata["res_id"])
	companyID := strings.TrimSpace(metadata["company_id"])

	if chatID == "" && senderID == "" && (model == "" || resID == "") && companyID == "" {
		return ErrorResult("scoped context required: missing chat/sender/entity identifiers")
	}

	return nil
}

func truncateMemorySnippet(content string, maxLen int) string {
	content = strings.TrimSpace(content)
	if maxLen <= 0 || len(content) <= maxLen {
		return content
	}
	return strings.TrimSpace(content[:maxLen]) + "…"
}

func cloneStringMap(src map[string]string) map[string]string {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func containsAny(text string, terms ...string) bool {
	for _, term := range terms {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}

func describeMemoryScope(channel, chatID, senderID string, metadata map[string]string) string {
	channel = strings.TrimSpace(channel)
	chatID = strings.TrimSpace(chatID)
	senderID = strings.TrimSpace(senderID)
	if channel == "" {
		return "unscoped"
	}

	model := strings.TrimSpace(metadata["model"])
	resID := strings.TrimSpace(metadata["res_id"])
	companyID := strings.TrimSpace(metadata["company_id"])

	parts := []string{channel}
	if companyID != "" {
		parts = append(parts, "company="+companyID)
	}
	if model != "" && resID != "" {
		parts = append(parts, "entity="+model+":"+resID)
	}
	if chatID != "" {
		parts = append(parts, "chat="+chatID)
	}
	if senderID != "" {
		parts = append(parts, "sender="+senderID)
	}

	return strings.Join(parts, "|")
}
