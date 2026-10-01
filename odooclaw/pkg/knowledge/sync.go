package knowledge

// Query normalization and directory ingestion (NRA-3845).
//
// Two problems fixed here:
//
//  1. Search used to pass the raw user sentence to FTS5 MATCH. FTS5 treats
//     an unquoted multi-word string as an implicit AND, so a natural
//     question ("¿cómo configuro el VeriFactu en Odoo?") matched nothing.
//     BuildMatchQuery tokenizes, NFC-normalizes and joins with OR — the
//     same pattern pkg/memory uses (store.go buildMatchQuery).
//
//  2. The KB had no ingestion path from disk. SyncDirectory indexes
//     <dir>/**/*.md incrementally (mtime+size), normalizing content to
//     NFC because NAS volumes and macOS deliver NFD. Dropping a file in
//     the knowledge dir is enough; no command required.

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// NormalizeNFC converts s to Unicode NFC. Directory-sourced content and
// every search query go through this so composed/decomposed forms
// (NFD from the NAS/macOS vs NFC typed by the user) collapse to one
// canonical representation on both sides of the MATCH.
func NormalizeNFC(s string) string {
	return norm.NFC.String(s)
}

// BuildMatchQuery converts a natural-language query into an FTS5 MATCH
// expression: tokens NFC-normalized, lowercased, stopwords removed,
// joined with OR, each quoted to keep punctuation out of the FTS syntax.
// Returns "" when nothing searchable remains.
func BuildMatchQuery(query string) string {
	tokens := tokenizeQuery(query)
	if len(tokens) == 0 {
		return ""
	}
	parts := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if len(token) >= 3 {
			parts = append(parts, fmt.Sprintf("\"%s\"*", token))
			continue
		}
		parts = append(parts, fmt.Sprintf("\"%s\"", token))
	}
	return strings.Join(parts, " OR ")
}

// tokenizeQuery splits on non-letter/digit, lowercases with NFC first,
// drops stopwords and tokens shorter than 2 chars, dedupes.
func tokenizeQuery(query string) []string {
	stopWords := map[string]struct{}{
		"the": {}, "and": {}, "for": {}, "with": {}, "that": {}, "this": {},
		"from": {}, "into": {}, "please": {}, "prepare": {}, "about": {},
		"have": {}, "will": {}, "your": {},
		// Spanish interrogatives/articles that dominate natural questions.
		"como": {}, "cómo": {}, "que": {}, "qué": {}, "cual": {}, "cuál": {},
		"cuando": {}, "cuándo": {}, "donde": {}, "dónde": {}, "quien": {}, "quién": {},
		"para": {}, "con": {}, "por": {}, "los": {}, "las": {}, "una": {}, "uno": {},
		"del": {}, "al": {}, "es": {}, "esta": {}, "este": {}, "hay": {},
	}

	normalized := norm.NFC.String(strings.ToLower(query))
	fields := strings.FieldsFunc(normalized, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})

	tokens := make([]string, 0, len(fields))
	seen := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		field = strings.TrimSpace(field)
		if len(field) < 2 {
			continue
		}
		if _, skip := stopWords[field]; skip {
			continue
		}
		if _, ok := seen[field]; ok {
			continue
		}
		seen[field] = struct{}{}
		tokens = append(tokens, field)
	}
	return tokens
}

// SyncDirectory incrementally indexes every *.md file under dir into the KB.
// Files whose (mtime, size) are unchanged since the last sync are skipped;
// modified files replace their previous rows; files removed from disk are
// deleted from the KB. Content and title are NFC-normalized.
//
// Returns the number of files (re)ingested this pass.
func (kb *KnowledgeBase) SyncDirectory(dir string) (int, error) {
	if kb.path == "" || kb.path == ":memory:" {
		// Still allowed (tests), but the norm is a persistent KB.
		_ = kb.path
	}

	var files []string
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		if d.IsDir() {
			name := d.Name()
			if name == ".git" || strings.HasPrefix(name, ".") && path != dir {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.EqualFold(filepath.Ext(path), ".md") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("walk knowledge dir: %w", err)
	}

	kb.mu.Lock()
	defer kb.mu.Unlock()

	tx, err := kb.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("begin knowledge sync tx: %w", err)
	}

	seen := make(map[string]struct{}, len(files))
	ingested := 0
	for _, path := range files {
		info, err := os.Stat(path)
		if err != nil {
			continue
		}
		source := filepath.ToSlash(path)
		seen[source] = struct{}{}

		var mod, size int64
		_ = tx.QueryRow("SELECT modified, size FROM knowledge_files WHERE source = ?", source).Scan(&mod, &size)
		if mod == info.ModTime().Unix() && size == info.Size() {
			continue
		}

		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		content := NormalizeNFC(string(data))
		title, body := splitMarkdownTitle(content, filepath.Base(path))
		tags := deriveTagsFromBody(body)

		// Replace any previous rows for this source.
		if _, err := tx.Exec("DELETE FROM knowledge WHERE source = ?", source); err != nil {
			tx.Rollback()
			return 0, fmt.Errorf("clear previous entries for %s: %w", source, err)
		}
		if _, err := tx.Exec(
			"INSERT INTO knowledge(title, content, tags, category, source) VALUES (?, ?, ?, ?, ?)",
			title, body, strings.Join(tags, " "), string(CatWorkflow), source,
		); err != nil {
			tx.Rollback()
			return 0, fmt.Errorf("index %s: %w", source, err)
		}
		if _, err := tx.Exec(`
			INSERT INTO knowledge_files(source, modified, size, ingested_at)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(source) DO UPDATE SET modified=excluded.modified, size=excluded.size, ingested_at=excluded.ingested_at`,
			source, info.ModTime().Unix(), info.Size(), time.Now().Unix(),
		); err != nil {
			tx.Rollback()
			return 0, fmt.Errorf("record sync of %s: %w", source, err)
		}
		ingested++
	}

	// Drop files that disappeared from disk.
	rows, err := tx.Query("SELECT source FROM knowledge_files")
	if err != nil {
		tx.Rollback()
		return 0, fmt.Errorf("list synced files: %w", err)
	}
	var gone []string
	for rows.Next() {
		var src string
		if err := rows.Scan(&src); err == nil {
			if _, ok := seen[src]; !ok {
				gone = append(gone, src)
			}
		}
	}
	rows.Close()
	for _, src := range gone {
		if _, err := tx.Exec("DELETE FROM knowledge WHERE source = ?", src); err != nil {
			tx.Rollback()
			return 0, fmt.Errorf("remove stale entries for %s: %w", src, err)
		}
		if _, err := tx.Exec("DELETE FROM knowledge_files WHERE source = ?", src); err != nil {
			tx.Rollback()
			return 0, fmt.Errorf("remove sync record for %s: %w", src, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit knowledge sync tx: %w", err)
	}
	return ingested, nil
}

// splitMarkdownTitle uses the first "# " heading as the entry title,
// falling back to the filename (without extension). The heading line is
// removed from the body to avoid duplicating it.
func splitMarkdownTitle(content, fallbackName string) (string, string) {
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "# ") {
			title := strings.TrimSpace(strings.TrimPrefix(trimmed, "#"))
			rest := strings.Join(append(lines[:i:i], lines[i+1:]...), "\n")
			return title, strings.TrimSpace(rest)
		}
	}
	return strings.TrimSuffix(fallbackName, filepath.Ext(fallbackName)), strings.TrimSpace(content)
}

// deriveTagsFromBody pulls a few top-level headings as tags so category-
// style queries hit file-sourced entries.
func deriveTagsFromBody(body string) []string {
	var tags []string
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "## ") {
			h := strings.TrimSpace(strings.TrimPrefix(trimmed, "##"))
			h = strings.ToLower(NormalizeNFC(h))
			if h != "" && len(tags) < 8 {
				tags = append(tags, h)
			}
		}
	}
	return tags
}
