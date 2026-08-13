package memory

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// RecipeStore is the local "how-to" memory: it stores resolved
// query → tool + args pairs so the agent can reuse them as few-shot
// examples before calling the LLM. Always enabled by default;
// Engram is an optional external layer on top.
type RecipeStore struct {
	db *sql.DB
}

// Recipe is a single resolved intent.
type Recipe struct {
	ID         int64     `json:"id"`
	Query      string    `json:"query"`
	Tool       string    `json:"tool"`
	Arguments  string    `json:"arguments"`
	Channel    string    `json:"channel"`
	ChatID     string    `json:"chat_id"`
	SenderID   string    `json:"sender_id"`
	Success    bool      `json:"success"`
	CreatedAt  time.Time `json:"created_at"`
	UsedCount  int       `json:"used_count"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

// NewRecipeStore opens (or creates) the recipe SQLite database.
// If the directory does not exist it is created.
func NewRecipeStore(memoryDir string) (*RecipeStore, error) {
	if err := os.MkdirAll(memoryDir, 0o755); err != nil {
		return nil, fmt.Errorf("create memory dir: %w", err)
	}
	dbPath := filepath.Join(memoryDir, "recipes.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open recipe db: %w", err)
	}
	// WAL for concurrent read/write without locking stalls.
	if _, err := db.Exec(`PRAGMA journal_mode=WAL`); err != nil {
		return nil, fmt.Errorf("enable WAL: %w", err)
	}
	schema := `
CREATE TABLE IF NOT EXISTS recipes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    query       TEXT NOT NULL,
    tool        TEXT NOT NULL,
    arguments   TEXT NOT NULL DEFAULT '{}',
    channel     TEXT NOT NULL DEFAULT '',
    chat_id     TEXT NOT NULL DEFAULT '',
    sender_id   TEXT NOT NULL DEFAULT '',
    success     INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_count  INTEGER NOT NULL DEFAULT 0,
    last_used_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_recipes_query ON recipes(query);
CREATE INDEX IF NOT EXISTS idx_recipes_tool ON recipes(tool);
CREATE INDEX IF NOT EXISTS idx_recipes_success ON recipes(success);
`
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("init recipe schema: %w", err)
	}
	return &RecipeStore{db: db}, nil
}

// SaveRecipe stores a resolved query→tool+args pair. Only successful
// executions should be saved (Success=true) so the store stays clean.
// Upserts on exact (query, tool, channel) match to avoid duplicates.
func (s *RecipeStore) SaveRecipe(q, tool, args, channel, chatID, senderID string, success bool) (int64, error) {
	if strings.TrimSpace(q) == "" || strings.TrimSpace(tool) == "" {
		return 0, fmt.Errorf("recipe requires query and tool")
	}
	successInt := 0
	if success {
		successInt = 1
	}
	// Upsert: if the same query+tool+channel exists, update instead of dup.
	var existing int64
	err := s.db.QueryRow(
		`SELECT id FROM recipes WHERE query = ? AND tool = ? AND channel = ? AND chat_id = ? LIMIT 1`,
		q, tool, channel, chatID,
	).Scan(&existing)
	if err == nil {
		_, err = s.db.Exec(
			`UPDATE recipes SET arguments = ?, sender_id = ?, success = ?, used_count = used_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?`,
			args, senderID, successInt, existing,
		)
		return existing, err
	}
	res, err := s.db.Exec(
		`INSERT INTO recipes (query, tool, arguments, channel, chat_id, sender_id, success, used_count) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
		q, tool, args, channel, chatID, senderID, successInt,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// GetRelevantRecipes returns the top-N recipes whose query shares the
// most significant tokens with the incoming message. Only successful
// recipes are candidates. Scoped to channel/chat when provided.
func (s *RecipeStore) GetRelevantRecipes(query, channel, chatID string, limit int) ([]Recipe, error) {
	if limit <= 0 {
		limit = 3
	}
	if limit > 10 {
		limit = 10
	}
	// Token overlap scoring done in SQL over a simple word-match.
	// Keep it deterministic: split query into tokens, build OR LIKE.
	tokens := tokenize(query)
	if len(tokens) == 0 {
		return nil, nil
	}
	likeClauses := make([]string, 0, len(tokens))
	params := make([]any, 0, len(tokens)+4)
	for _, t := range tokens {
		likeClauses = append(likeClauses, "query LIKE ?")
		params = append(params, "%"+t+"%")
	}
	where := "success = 1 AND (" + strings.Join(likeClauses, " OR ") + ")"
	if channel != "" {
		where += " AND (channel = ? OR channel = '')"
		params = append(params, channel)
	}
	if chatID != "" {
		where += " AND (chat_id = ? OR chat_id = '')"
		params = append(params, chatID)
	}
	params = append(params, limit)

	rows, err := s.db.Query(
		`SELECT id, query, tool, arguments, channel, chat_id, sender_id, success, created_at, used_count, last_used_at
		 FROM recipes WHERE `+where+`
		 ORDER BY used_count DESC, id DESC
		 LIMIT ?`, params...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipes := make([]Recipe, 0, limit)
	for rows.Next() {
		var r Recipe
		var successInt int
		var lastUsed sql.NullTime
		if err := rows.Scan(&r.ID, &r.Query, &r.Tool, &r.Arguments, &r.Channel,
			&r.ChatID, &r.SenderID, &successInt, &r.CreatedAt, &r.UsedCount, &lastUsed); err != nil {
			return nil, err
		}
		r.Success = successInt == 1
		if lastUsed.Valid {
			t := lastUsed.Time
			r.LastUsedAt = &t
		}
		recipes = append(recipes, r)
	}
	return recipes, rows.Err()
}

// BuildRecipeContext formats the relevant recipes as few-shot examples
// for the system prompt. Returns "" when nothing relevant is found.
func (s *RecipeStore) BuildRecipeContext(query, channel, chatID string, limit int) (string, error) {
	recipes, err := s.GetRelevantRecipes(query, channel, chatID, limit)
	if err != nil || len(recipes) == 0 {
		return "", err
	}
	var sb strings.Builder
	sb.WriteString("## Known Resolved Patterns\n")
	sb.WriteString("The following similar questions were resolved before. Follow the same tool and arguments.\n\n")
	for i, r := range recipes {
		sb.WriteString(fmt.Sprintf("%d. User: %q\n   Tool: %s\n   Args: %s\n", i+1, r.Query, r.Tool, r.Arguments))
	}
	return sb.String(), nil
}

// CountRecipes is used for diagnostics / metrics.
func (s *RecipeStore) CountRecipes() (int, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM recipes`).Scan(&n)
	return n, err
}

// Close closes the underlying database.
func (s *RecipeStore) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// tokenize extracts meaningful lowercase tokens (>=3 chars, no stopwords).
func tokenize(s string) []string {
	stopwords := map[string]bool{
		"que": true, "con": true, "por": true, "para": true, "del": true,
		"una": true, "unos": true, "unas": true, "los": true, "las": true,
		"dime": true, "dame": true, "cuanto": true, "cuantos": true, "cuantas": true,
		"esta": true, "este": true, "estas": true, "hay": true, "tiene": true,
		"tienen": true, "tengo": true, "estan": true, "son": true, "the": true,
		"and": true, "with": true, "for": true, "what": true, "how": true,
	}
	raw := strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != 'ñ'
	})
	out := make([]string, 0, len(raw))
	for _, w := range raw {
		if len(w) >= 3 && !stopwords[w] {
			out = append(out, w)
		}
	}
	return out
}

// Ensure the JSON marshal helper is available for tool args normalization.
func normalizeArgs(args any) string {
	if args == nil {
		return "{}"
	}
	if s, ok := args.(string); ok {
		if s == "" {
			return "{}"
		}
		return s
	}
	b, err := json.Marshal(args)
	if err != nil {
		return "{}"
	}
	return string(b)
}
