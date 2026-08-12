// Package knowledge provides a specialized knowledge base for Odoo domain
// information. It feeds context into the Tool Retrieval Engine and provides
// domain-aware scoring for tool relevance.
package knowledge

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	_ "modernc.org/sqlite"
)

// RiskLevel represents the risk classification of a tool.
type RiskLevel string

const (
	RiskLow      RiskLevel = "low"       // Read-only, no data mutation
	RiskMedium   RiskLevel = "medium"    // Creates/modifies data, reversible
	RiskHigh     RiskLevel = "high"      // Destructive or irreversible operations
	RiskCritical RiskLevel = "critical"  // Financial, legal, or system-breaking impact
)

// Category represents a knowledge entry category.
type Category string

const (
	CatToolUsage    Category = "tool_usage"     // How to use a specific tool
	CatOdooModule   Category = "odoo_module"    // Odoo module domain knowledge
	CatWorkflow     Category = "workflow"       // Multi-step workflows
	CatApiPattern   Category = "api_pattern"    // API usage patterns
	CatAlias        Category = "alias"          // Tool aliases and synonyms
	CatDependency   Category = "dependency"     // Tool-to-tool dependencies
	CatExample      Category = "example"        // Usage examples
	CatRisk         Category = "risk"           // Risk and safety info
)

// KnowledgeEntry represents a piece of domain knowledge.
type KnowledgeEntry struct {
	ID        int64
	Category  Category
	Title     string
	Content   string
	Tags      []string
	Metadata  map[string]string // flexible KV: "tool_name", "odoo_version", "module", etc.
	RiskLevel RiskLevel
	Aliases   []string // manual aliases for this entry
}

// ToolKnowledge is a knowledge entry specifically about a registered tool.
type ToolKnowledge struct {
	ToolName    string
	Description string
	Category    Category
	Tags        []string
	Metadata    map[string]string // "odoo_version", "module", "risk_level", etc.
	Aliases     []string
	RiskLevel   RiskLevel
	Dependencies []string // tool names this tool depends on
	Examples    []string  // usage examples
}

// KnowledgeBase stores and retrieves domain-specific knowledge entries.
// It uses SQLite FTS5 for full-text search over knowledge content.
type KnowledgeBase struct {
	db  *sql.DB
	mu  sync.RWMutex
}

// NewKnowledgeBase creates a new in-memory knowledge base.
func NewKnowledgeBase() (*KnowledgeBase, error) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		return nil, fmt.Errorf("failed to open knowledge base: %w", err)
	}

	// Create FTS5 table for knowledge entries
	_, err = db.Exec(`
		CREATE VIRTUAL TABLE knowledge USING fts5(
			title,
			content,
			tags,
			category,
			tokenize='porter unicode61'
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create knowledge table: %w", err)
	}

	// Create a regular table for metadata (aliases, risk, versions, etc.)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS knowledge_meta (
			id INTEGER PRIMARY KEY,
			title TEXT,
			category TEXT,
			aliases TEXT,
			risk_level TEXT,
			metadata TEXT
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create metadata table: %w", err)
	}

	// Tool knowledge table: links tools to their enriched metadata
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tool_knowledge (
			tool_name TEXT PRIMARY KEY,
			description TEXT,
			category TEXT,
			tags TEXT,
			metadata TEXT,
			aliases TEXT,
			risk_level TEXT,
			dependencies TEXT,
			examples TEXT
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create tool_knowledge table: %w", err)
	}

	return &KnowledgeBase{db: db}, nil
}

// Add inserts a knowledge entry into the base.
func (kb *KnowledgeBase) Add(entry KnowledgeEntry) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	tags := strings.Join(entry.Tags, " ")
	aliases := strings.Join(entry.Aliases, ";")

	_, err := kb.db.Exec(
		"INSERT INTO knowledge(title, content, tags, category) VALUES (?, ?, ?, ?)",
		entry.Title, entry.Content, tags, entry.Category,
	)
	if err != nil {
		return fmt.Errorf("failed to insert knowledge: %w", err)
	}

	// Store metadata separately
	riskStr := string(entry.RiskLevel)
	metaJSON := ""
	if len(entry.Metadata) > 0 {
		metaJSON = toJSON(entry.Metadata)
	}

	_, err = kb.db.Exec(
		"INSERT INTO knowledge_meta(title, category, aliases, risk_level, metadata) VALUES (?, ?, ?, ?, ?)",
		entry.Title, entry.Category, aliases, riskStr, metaJSON,
	)
	if err != nil {
		return fmt.Errorf("failed to insert metadata: %w", err)
	}

	logger.DebugCF("knowledge", "Entry added", map[string]any{
		"title":    entry.Title,
		"category": entry.Category,
	})

	return nil
}

// Search finds knowledge entries matching a query. Returns the most relevant
// entries limited by count.
func (kb *KnowledgeBase) Search(query string, category string, limit int) ([]KnowledgeEntry, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	if limit <= 0 {
		limit = 5
	}

	var rows *sql.Rows
	var err error

	if category != "" {
		rows, err = kb.db.Query(`
			SELECT title, content, tags, category
			FROM knowledge
			WHERE knowledge MATCH ? AND category = ?
			ORDER BY rank
			LIMIT ?
		`, query, category, limit)
	} else {
		rows, err = kb.db.Query(`
			SELECT title, content, tags, category
			FROM knowledge
			WHERE knowledge MATCH ?
			ORDER BY rank
			LIMIT ?
		`, query, limit)
	}

	if err != nil {
		// Fallback to LIKE search
		return kb.fallbackSearch(query, category, limit)
	}
	defer rows.Close()

	var results []KnowledgeEntry
	for rows.Next() {
		var entry KnowledgeEntry
		var tags string
		if err := rows.Scan(&entry.Title, &entry.Content, &tags, &entry.Category); err != nil {
			continue
		}
		entry.Tags = strings.Fields(tags)
		results = append(results, entry)
	}

	return results, nil
}

// fallbackSearch does a LIKE-based search when FTS5 fails.
func (kb *KnowledgeBase) fallbackSearch(query, category string, limit int) ([]KnowledgeEntry, error) {
	likePattern := "%" + strings.ToLower(query) + "%"

	var rows *sql.Rows
	var err error

	if category != "" {
		rows, err = kb.db.Query(`
			SELECT title, content, tags, category
			FROM knowledge
			WHERE (lower(title) LIKE ? OR lower(content) LIKE ?) AND category = ?
			LIMIT ?
		`, likePattern, likePattern, category, limit)
	} else {
		rows, err = kb.db.Query(`
			SELECT title, content, tags, category
			FROM knowledge
			WHERE lower(title) LIKE ? OR lower(content) LIKE ?
			LIMIT ?
		`, likePattern, likePattern, limit)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []KnowledgeEntry
	for rows.Next() {
		var entry KnowledgeEntry
		var tags string
		if err := rows.Scan(&entry.Title, &entry.Content, &tags, &entry.Category); err != nil {
			continue
		}
		entry.Tags = strings.Fields(tags)
		results = append(results, entry)
	}

	return results, nil
}

// GetRelevantTools returns tool names that are relevant to a knowledge query.
// This bridges the Knowledge Base with the Tool Retrieval Engine.
func (kb *KnowledgeBase) GetRelevantTools(query string, limit int) ([]string, error) {
	entries, err := kb.Search(query, "tool_usage", limit)
	if err != nil {
		return nil, err
	}

	var toolNames []string
	seen := make(map[string]bool)
	for _, entry := range entries {
		for _, tag := range entry.Tags {
			if !seen[tag] && strings.HasPrefix(tag, "tool:") {
				name := strings.TrimPrefix(tag, "tool:")
				toolNames = append(toolNames, name)
				seen[name] = true
			}
		}
	}

	return toolNames, nil
}

// LoadOdooDomainKnowledge seeds the knowledge base with common Odoo module
// knowledge to improve tool retrieval accuracy.
func (kb *KnowledgeBase) LoadOdooDomainKnowledge() error {
	domains := []KnowledgeEntry{
		{
			Category:  CatOdooModule,
			Title:     "CRM Module",
			Content:   "Odoo CRM manages leads, opportunities, and sales pipeline. Key models: crm.lead, crm.stage. Actions: create lead, convert to opportunity, set stage, schedule activity, send email.",
			Tags:      []string{"crm", "lead", "opportunity", "pipeline"},
			Metadata:  map[string]string{"module": "crm"},
		},
		{
			Category:  CatOdooModule,
			Title:     "Sales Module",
			Content:   "Odoo Sales manages quotations and sales orders. Key models: sale.order, sale.order.line. Actions: create quotation, confirm sale, add line, send by email.",
			Tags:      []string{"sale", "quotation", "order"},
			Metadata:  map[string]string{"module": "sale"},
		},
		{
			Category:  CatOdooModule,
			Title:     "Inventory Module",
			Content:   "Odoo Inventory manages stock, warehouses, and transfers. Key models: stock.picking, stock.quant, stock.warehouse. Actions: check quantity, create transfer, validate picking.",
			Tags:      []string{"stock", "inventory", "warehouse"},
			Metadata:  map[string]string{"module": "stock"},
		},
		{
			Category:  CatOdooModule,
			Title:     "Accounting Module",
			Content:   "Odoo Accounting manages invoices, payments, and journal entries. Key models: account.move, account.payment, account.journal. Actions: create invoice, register payment, post entry.",
			Tags:      []string{"account", "invoice", "payment"},
			Metadata:  map[string]string{"module": "account"},
		},
		{
			Category:  CatOdooModule,
			Title:     "HR Module",
			Content:   "Odoo HR manages employees, attendance, and leave. Key models: hr.employee, hr.attendance, hr.leave. Actions: check in/out, request leave, list employees.",
			Tags:      []string{"hr", "employee", "attendance", "leave"},
			Metadata:  map[string]string{"module": "hr"},
		},
	}

	for _, entry := range domains {
		if err := kb.Add(entry); err != nil {
			return fmt.Errorf("failed to load domain knowledge: %w", err)
		}
	}

	logger.InfoCF("knowledge", "Odoo domain knowledge loaded", map[string]any{
		"entries": len(domains),
	})
	return nil
}

// Close releases the database connection.
func (kb *KnowledgeBase) Close() error {
	if kb.db != nil {
		return kb.db.Close()
	}
	return nil
}

// Count returns the number of knowledge entries.
func (kb *KnowledgeBase) Count() int {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	var count int
	kb.db.QueryRow("SELECT COUNT(*) FROM knowledge").Scan(&count)
	return count
}

// --- Tool Knowledge API ---

// RegisterToolKnowledge stores enriched metadata for a registered tool.
func (kb *KnowledgeBase) RegisterToolKnowledge(tk ToolKnowledge) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	tags := strings.Join(tk.Tags, " ")
	aliases := strings.Join(tk.Aliases, ";")
	deps := strings.Join(tk.Dependencies, " ")
	examples := strings.Join(tk.Examples, " ")
	metaJSON := toJSON(tk.Metadata)

	_, err := kb.db.Exec(`
		INSERT OR REPLACE INTO tool_knowledge(
			tool_name, description, category, tags, metadata,
			aliases, risk_level, dependencies, examples
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, tk.ToolName, tk.Description, tk.Category, tags, metaJSON, aliases, string(tk.RiskLevel), deps, examples)
	if err != nil {
		return fmt.Errorf("failed to register tool knowledge for %q: %w", tk.ToolName, err)
	}

	logger.DebugCF("knowledge", "Tool knowledge registered", map[string]any{
		"tool": tk.ToolName,
	})
	return nil
}

// GetToolKnowledge retrieves enriched metadata for a tool by name.
func (kb *KnowledgeBase) GetToolKnowledge(toolName string) (*ToolKnowledge, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	var desc, category, tags, metaJSON, aliases, riskLevel, deps, examples string
	err := kb.db.QueryRow(`
		SELECT description, category, tags, metadata, aliases, risk_level, dependencies, examples
		FROM tool_knowledge WHERE tool_name = ?
	`, toolName).Scan(&desc, &category, &tags, &metaJSON, &aliases, &riskLevel, &deps, &examples)
	if err != nil {
		return nil, fmt.Errorf("tool knowledge not found for %q: %w", toolName, err)
	}

	tk := &ToolKnowledge{
		ToolName:    toolName,
		Description: desc,
		Category:    Category(category),
		RiskLevel:   RiskLevel(riskLevel),
	}

	tk.Tags = strings.Fields(tags)
	tk.Aliases = strings.Split(aliases, ";")
	tk.Dependencies = strings.Fields(deps)
	tk.Examples = strings.Split(examples, "\n")

	// Parse metadata JSON
	if metaJSON != "" {
		tk.Metadata = fromJSON(metaJSON)
	}

	return tk, nil
}

// GetToolRiskLevel returns the risk level for a tool.
func (kb *KnowledgeBase) GetToolRiskLevel(toolName string) RiskLevel {
	tk, err := kb.GetToolKnowledge(toolName)
	if err != nil {
		return RiskLow // default to low if unknown
	}
	return tk.RiskLevel
}

// GetToolsByRisk returns all tools with the given risk level.
func (kb *KnowledgeBase) GetToolsByRisk(level RiskLevel) []string {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	rows, err := kb.db.Query("SELECT tool_name FROM tool_knowledge WHERE risk_level = ?", string(level))
	if err != nil {
		return nil
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		rows.Scan(&name)
		names = append(names, name)
	}
	return names
}

// GetToolsByModule returns all tools associated with an Odoo module.
func (kb *KnowledgeBase) GetToolsByModule(module string) []string {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	// The metadata column stores compact JSON like: {"module":"crm"}
	likePattern := `%{"module":"` + module + `"}`
	rows, err := kb.db.Query(`
		SELECT tool_name FROM tool_knowledge
		WHERE metadata LIKE ?
	`, likePattern)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		rows.Scan(&name)
		names = append(names, name)
	}
	return names
}

// GetToolsByOdooVersion returns all tools supporting a specific Odoo version.
func (kb *KnowledgeBase) GetToolsByOdooVersion(version string) []string {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	// The metadata column stores compact JSON like: {"odoo_version":"17"}
	likePattern := `%{"odoo_version":"` + version + `"}`
	rows, err := kb.db.Query(`
		SELECT tool_name FROM tool_knowledge
		WHERE metadata LIKE ?
	`, likePattern)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		rows.Scan(&name)
		names = append(names, name)
	}
	return names
}

// SearchTools searches the tool knowledge base by query.
func (kb *KnowledgeBase) SearchTools(query string, limit int) ([]ToolKnowledge, error) {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	if limit <= 0 {
		limit = 10
	}

	rows, err := kb.db.Query(`
		SELECT tool_name, description, category, tags, metadata, aliases, risk_level, dependencies, examples
		FROM tool_knowledge
		WHERE tool_name MATCH ? OR description MATCH ?
		ORDER BY rank
		LIMIT ?
	`, query, query, limit)
	if err != nil {
		// Fallback: LIKE search
		return kb.searchToolsLike(query, limit)
	}
	defer rows.Close()

	var results []ToolKnowledge
	for rows.Next() {
		var tk ToolKnowledge
		var tags, metaJSON, aliases, deps, examples string
		var riskLevel string
		if err := rows.Scan(&tk.ToolName, &tk.Description, &tk.Category, &tags, &metaJSON, &aliases, &riskLevel, &deps, &examples); err != nil {
			continue
		}
		tk.RiskLevel = RiskLevel(riskLevel)
		tk.Tags = strings.Fields(tags)
		tk.Aliases = strings.Split(aliases, ";")
		tk.Dependencies = strings.Fields(deps)
		tk.Examples = strings.Split(examples, "\n")
		if metaJSON != "" {
			tk.Metadata = fromJSON(metaJSON)
		}
		results = append(results, tk)
	}

	return results, nil
}

// searchToolsLike is a LIKE-based fallback for tool search.
func (kb *KnowledgeBase) searchToolsLike(query string, limit int) ([]ToolKnowledge, error) {
	likePattern := "%" + strings.ToLower(query) + "%"

	rows, err := kb.db.Query(`
		SELECT tool_name, description, category, tags, metadata, aliases, risk_level, dependencies, examples
		FROM tool_knowledge
		WHERE lower(tool_name) LIKE ? OR lower(description) LIKE ?
		LIMIT ?
	`, likePattern, likePattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ToolKnowledge
	for rows.Next() {
		var tk ToolKnowledge
		var tags, metaJSON, aliases, deps, examples string
		var riskLevel string
		if err := rows.Scan(&tk.ToolName, &tk.Description, &tk.Category, &tags, &metaJSON, &aliases, &riskLevel, &deps, &examples); err != nil {
			continue
		}
		tk.RiskLevel = RiskLevel(riskLevel)
		tk.Tags = strings.Fields(tags)
		tk.Aliases = strings.Split(aliases, ";")
		tk.Dependencies = strings.Fields(deps)
		tk.Examples = strings.Split(examples, "\n")
		if metaJSON != "" {
			tk.Metadata = fromJSON(metaJSON)
		}
		results = append(results, tk)
	}

	return results, nil
}

// GetToolAliases returns all aliases for a tool.
func (kb *KnowledgeBase) GetToolAliases(toolName string) []string {
	tk, err := kb.GetToolKnowledge(toolName)
	if err != nil {
		return nil
	}
	return tk.Aliases
}

// GetToolDependencies returns the dependency list for a tool.
func (kb *KnowledgeBase) GetToolDependencies(toolName string) []string {
	tk, err := kb.GetToolKnowledge(toolName)
	if err != nil {
		return nil
	}
	return tk.Dependencies
}

// CountTools returns the number of tools with knowledge entries.
func (kb *KnowledgeBase) CountTools() int {
	kb.mu.RLock()
	defer kb.mu.RUnlock()

	var count int
	kb.db.QueryRow("SELECT COUNT(*) FROM tool_knowledge").Scan(&count)
	return count
}

// --- helpers ---

// toJSON converts a map to a simple JSON string.
func toJSON(m map[string]string) string {
	if len(m) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("{")
	first := true
	for k, v := range m {
		if !first {
			sb.WriteString(",")
		}
		first = false
		sb.WriteString(`"` + k + `":"` + v + `"`)
	}
	sb.WriteString("}")
	return sb.String()
}

// fromJSON parses a simple JSON string back to a map.
func fromJSON(s string) map[string]string {
	if s == "" {
		return nil
	}
	result := make(map[string]string)
	// Simple parser for our format: {"key":"value","key2":"value2"}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return nil
	}
	pairs := strings.Split(s, ",")
	for _, pair := range pairs {
		pair = strings.TrimSpace(pair)
		kv := strings.SplitN(pair, ":", 2)
		if len(kv) == 2 {
			k := strings.Trim(kv[0], `"`)
			v := strings.Trim(kv[1], `"`)
			result[k] = v
		}
	}
	return result
}
