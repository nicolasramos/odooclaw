package tools

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	_ "modernc.org/sqlite"
)

// DomainedTool is an optional interface that tools can implement
// to declare which Odoo domain they belong to.
type DomainedTool interface {
	Tool
	Domain() string
}

// Odoo domain constants used for filtering.
const (
	DomainAccounting = "accounting"
	DomainSales      = "sales"
	DomainInventory  = "inventory"
	DomainHR         = "hr"
	DomainCRM        = "crm"
	DomainProjects   = "projects"
	DomainMfg        = "manufacturing"
	DomainPurchases  = "purchases"
	DomainGeneral    = "general"
)

// QueryRewriter rewrites user queries before retrieval.
type QueryRewriter interface {
	Rewrite(query string) string
}

// NoopRewriter passes queries through unchanged.
type NoopRewriter struct{}

func (NoopRewriter) Rewrite(query string) string { return query }

// SynonymRewriter expands common synonyms using OR groups for FTS5.
type SynonymRewriter struct {
	synonyms map[string][]string
}

// NewSynonymRewriter creates a rewriter with common Odoo domain synonyms.
func NewSynonymRewriter() *SynonymRewriter {
	return &SynonymRewriter{
		synonyms: map[string][]string{
			"create":  {"new", "add", "register"},
			"search":  {"find", "look", "query", "buscar", "encontrar"},
			"delete":  {"remove", "destroy", "borrar", "eliminar"},
			"update":  {"modify", "edit", "change", "actualizar", "modificar"},
			"list":    {"show", "display", "mostrar"},
			"invoice": {"factura", "bill"},
			"sale":    {"venta", "order", "pedido"},
			"partner": {"customer", "client", "proveedor", "cliente"},
			"product": {"item", "articulo", "producto"},
			"stock":   {"inventory", "inventario", "almacen"},
		},
	}
}

// Rewrite expands synonyms using FTS5 OR syntax.
func (r *SynonymRewriter) Rewrite(query string) string {
	words := strings.Fields(strings.ToLower(query))
	var expanded []string

	for _, word := range words {
		if syns, ok := r.synonyms[word]; ok {
			// Build OR group: (word OR syn1 OR syn2)
			group := word
			for _, s := range syns {
				group += " OR " + s
			}
			expanded = append(expanded, group)
		} else {
			expanded = append(expanded, word)
		}
	}

	return strings.Join(expanded, " ")
}

// RetrievalEngine provides BM25-based tool retrieval using SQLite FTS5.
// Tools are indexed in-memory and can be queried for the most relevant subset.
type RetrievalEngine struct {
	db       *sql.DB
	rewriter QueryRewriter
	mu       sync.RWMutex
	indexed  bool
}

// NewRetrievalEngine creates a new in-memory FTS5 retrieval engine.
func NewRetrievalEngine(rewriter QueryRewriter) (*RetrievalEngine, error) {
	if rewriter == nil {
		rewriter = NoopRewriter{}
	}

	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		return nil, fmt.Errorf("failed to open in-memory SQLite: %w", err)
	}

	// Create FTS5 virtual table with weighted columns
	_, err = db.Exec(`
		CREATE VIRTUAL TABLE tool_index USING fts5(
			name,
			description,
			parameters,
			domain,
			tokenize='porter unicode61'
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create FTS5 table: %w", err)
	}

	return &RetrievalEngine{
		db:       db,
		rewriter: rewriter,
	}, nil
}

// IndexTools rebuilds the FTS5 index from all registered tools.
// This is a full rebuild — call after registering all tools at startup.
func (e *RetrievalEngine) IndexTools(registry *ToolRegistry) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Clear existing index
	_, err := e.db.Exec("DELETE FROM tool_index")
	if err != nil {
		return fmt.Errorf("failed to clear index: %w", err)
	}

	tools := registry.List()
	tx, err := e.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	stmt, err := tx.Prepare("INSERT INTO tool_index(name, description, parameters, domain) VALUES (?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to prepare insert: %w", err)
	}
	defer stmt.Close()

	for _, name := range tools {
		tool, ok := registry.Get(name)
		if !ok {
			continue
		}

		desc := tool.Description()
		params := flattenParams(tool.Parameters())
		domain := extractDomain(tool)

		if _, err := stmt.Exec(name, desc, params, domain); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to index tool %q: %w", name, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit index: %w", err)
	}

	e.indexed = true
	logger.InfoCF("retrieval", "Tool index built", map[string]any{
		"tool_count": len(tools),
	})

	return nil
}

// Retrieve finds the most relevant tools for a query using BM25 ranking.
// Returns up to limit tool names, ordered by relevance score.
// Returns nil when no engine is attached or index is empty.
func (e *RetrievalEngine) Retrieve(query string, module string, limit int) ([]string, error) {
	if e == nil || !e.indexed {
		return nil, nil
	}

	e.mu.RLock()
	defer e.mu.RUnlock()

	if limit <= 0 {
		limit = 5
	}

	// Rewrite the query (expand synonyms, etc.)
	rewritten := e.rewriter.Rewrite(query)

	// Build FTS5 MATCH query with BM25 ranking
	// BM25 weights: name=5.0, description=3.0, parameters=1.0, domain=0.5
	matchQuery := fmt.Sprintf(
		`SELECT name, bm25(tool_index, 5.0, 3.0, 1.0, 0.5) AS rank
		 FROM tool_index
		 WHERE tool_index MATCH ?
		 ORDER BY rank
		 LIMIT ?`,
	)

	args := []any{rewritten, limit}
	rows, err := e.db.Query(matchQuery, args...)
	if err != nil {
		// If FTS5 MATCH fails (e.g., syntax error), fall back to LIKE search
		logger.WarnCF("retrieval", "FTS5 MATCH failed, falling back to LIKE",
			map[string]any{"error": err.Error(), "query": rewritten})
		return e.fallbackSearch(query, module, limit)
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var name string
		var rank float64
		if err := rows.Scan(&name, &rank); err != nil {
			continue
		}
		results = append(results, name)
	}

	// If no results from FTS5 (e.g., query terms not in index), try LIKE fallback
	if len(results) == 0 {
		return e.fallbackSearch(query, module, limit)
	}

	// If module filter requested, re-rank by domain match
	if module != "" && len(results) > 0 {
		results = e.filterByDomain(results, module)
	}

	return results, nil
}

// fallbackSearch does a simple LIKE-based search when FTS5 MATCH fails.
func (e *RetrievalEngine) fallbackSearch(query, module string, limit int) ([]string, error) {
	// Split query into individual words and search for any match
	words := strings.Fields(strings.ToLower(query))
	if len(words) == 0 {
		return nil, nil
	}

	// Build OR conditions for each word
	conditions := make([]string, len(words))
	args := make([]any, len(words)*2)
	for i, word := range words {
		conditions[i] = "(lower(name) LIKE ? OR lower(description) LIKE ?)"
		args[i] = "%" + word + "%"
		args[len(words)+i] = "%" + word + "%"
	}

	queryStr := `SELECT name FROM tool_index WHERE ` + strings.Join(conditions, " OR ") + ` LIMIT ?`
	args = append(args, limit)

	rows, err := e.db.Query(queryStr, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		results = append(results, name)
	}
	return results, nil
}

// filterByDomain re-ranks results to prefer tools matching the given domain.
func (e *RetrievalEngine) filterByDomain(names []string, module string) []string {
	domain := strings.ToLower(module)

	rows, err := e.db.Query(`
		SELECT name, domain FROM tool_index
		WHERE name IN (`+placeholders(len(names))+`)
	`, namesToArgs(names)...)
	if err != nil {
		return names
	}
	defer rows.Close()

	domainMatch := make(map[string]bool)
	for rows.Next() {
		var name, d string
		if err := rows.Scan(&name, &d); err != nil {
			continue
		}
		if strings.Contains(d, domain) {
			domainMatch[name] = true
		}
	}

	// Stable partition: domain matches first, then the rest
	var matched, unmatched []string
	for _, name := range names {
		if domainMatch[name] {
			matched = append(matched, name)
		} else {
			unmatched = append(unmatched, name)
		}
	}

	return append(matched, unmatched...)
}

// Close releases the database connection.
func (e *RetrievalEngine) Close() error {
	if e.db != nil {
		return e.db.Close()
	}
	return nil
}

// IsIndexed returns whether the engine has been indexed.
func (e *RetrievalEngine) IsIndexed() bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.indexed
}

// --- helpers ---

// flattenParams flattens tool parameters into a searchable string.
func flattenParams(params map[string]any) string {
	var sb strings.Builder
	flattenMap(params, &sb, 0)
	return sb.String()
}

func flattenMap(m map[string]any, sb *strings.Builder, depth int) {
	for k, v := range m {
		sb.WriteString(k)
		sb.WriteString(" ")
		if nested, ok := v.(map[string]any); ok {
			flattenMap(nested, sb, depth+1)
		} else if v != nil {
			sb.WriteString(fmt.Sprintf("%v", v))
			sb.WriteString(" ")
		}
	}
}

// extractDomain returns the Odoo domain of a tool, if it implements DomainedTool.
func extractDomain(tool Tool) string {
	if dt, ok := tool.(DomainedTool); ok {
		return dt.Domain()
	}
	return DomainGeneral
}

// placeholders generates N comma-separated "?" placeholders.
func placeholders(n int) string {
	if n <= 0 {
		return ""
	}
	parts := make([]string, n)
	for i := range parts {
		parts[i] = "?"
	}
	return strings.Join(parts, ",")
}

// namesToArgs converts a string slice to []any for query args.
func namesToArgs(names []string) []any {
	args := make([]any, len(names))
	for i, name := range names {
		args[i] = name
	}
	return args
}
