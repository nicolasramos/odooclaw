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

// KnowledgeEntry represents a piece of domain knowledge.
type KnowledgeEntry struct {
	ID       int64
	Category string // e.g., "odoo_module", "tool_usage", "workflow", "api_pattern"
	Title    string
	Content  string
	Tags     []string
	Metadata map[string]string
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

	// Create a regular table for metadata
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS knowledge_meta (
			id INTEGER PRIMARY KEY,
			title TEXT,
			category TEXT,
			metadata TEXT
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create metadata table: %w", err)
	}

	return &KnowledgeBase{db: db}, nil
}

// Add inserts a knowledge entry into the base.
func (kb *KnowledgeBase) Add(entry KnowledgeEntry) error {
	kb.mu.Lock()
	defer kb.mu.Unlock()

	tags := strings.Join(entry.Tags, " ")

	_, err := kb.db.Exec(
		"INSERT INTO knowledge(title, content, tags, category) VALUES (?, ?, ?, ?)",
		entry.Title, entry.Content, tags, entry.Category,
	)
	if err != nil {
		return fmt.Errorf("failed to insert knowledge: %w", err)
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
			Category: "odoo_module",
			Title:    "CRM Module",
			Content:  "Odoo CRM manages leads, opportunities, and sales pipeline. Key models: crm.lead, crm.stage. Actions: create lead, convert to opportunity, set stage, schedule activity, send email.",
			Tags:     []string{"crm", "lead", "opportunity", "pipeline", "tool:search_crm_leads", "tool:create_crm_lead"},
		},
		{
			Category: "odoo_module",
			Title:    "Sales Module",
			Content:  "Odoo Sales manages quotations and sales orders. Key models: sale.order, sale.order.line. Actions: create quotation, confirm sale, add line, send by email.",
			Tags:     []string{"sale", "quotation", "order", "tool:search_sale_orders", "tool:create_sale_order"},
		},
		{
			Category: "odoo_module",
			Title:    "Inventory Module",
			Content:  "Odoo Inventory manages stock, warehouses, and transfers. Key models: stock.picking, stock.quant, stock.warehouse. Actions: check quantity, create transfer, validate picking.",
			Tags:     []string{"stock", "inventory", "warehouse", "tool:check_stock_quantity"},
		},
		{
			Category: "odoo_module",
			Title:    "Accounting Module",
			Content:  "Odoo Accounting manages invoices, payments, and journal entries. Key models: account.move, account.payment, account.journal. Actions: create invoice, register payment, post entry.",
			Tags:     []string{"account", "invoice", "payment", "tool:create_invoice", "tool:search_invoices"},
		},
		{
			Category: "odoo_module",
			Title:    "HR Module",
			Content:  "Odoo HR manages employees, attendance, and leave. Key models: hr.employee, hr.attendance, hr.leave. Actions: check in/out, request leave, list employees.",
			Tags:     []string{"hr", "employee", "attendance", "leave", "tool:search_employees"},
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
