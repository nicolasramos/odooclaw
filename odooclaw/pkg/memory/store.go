package memory

import (
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode"

	_ "modernc.org/sqlite"
)

const (
	sqliteDriver     = "sqlite"
	sqliteDBFile     = "main.sqlite"
	defaultChunkSize = 40
	defaultOverlap   = 10
)

type Chunk struct {
	Content   string
	LineStart int
	LineEnd   int
}

type SearchOptions struct {
	Query    string
	Limit    int
	Channel  string
	ChatID   string
	SenderID string
	Metadata map[string]string
}

type SearchResult struct {
	Path       string
	Content    string
	Collection string
	Score      float64
}

type documentRecord struct {
	Path     string
	Content  string
	Modified int64
	Exists   bool
}

type Store struct {
	memoryDir string
	dbPath    string
	initErr   error
}

func NewStore(memoryDir string) *Store {
	store := &Store{
		memoryDir: memoryDir,
		dbPath:    filepath.Join(memoryDir, sqliteDBFile),
	}
	store.initErr = store.initialize()
	return store
}

func (s *Store) DBPath() string {
	return s.dbPath
}

func (s *Store) initialize() error {
	if err := os.MkdirAll(s.memoryDir, 0o755); err != nil {
		return fmt.Errorf("create memory dir: %w", err)
	}

	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	return initSchema(db)
}

func (s *Store) GetContext(days int, longTermPath string) (string, error) {
	if err := s.SyncWorkspace(); err != nil {
		return "", err
	}

	db, err := s.openDB()
	if err != nil {
		return "", err
	}
	defer db.Close()

	longTerm, err := getDocumentContent(db, longTermPath)
	if err != nil {
		return "", err
	}

	recentNotes, err := getRecentDailyNotes(db, days)
	if err != nil {
		return "", err
	}

	return buildMemoryContext(longTerm, recentNotes), nil
}

func (s *Store) SyncWorkspace() error {
	if s.initErr != nil {
		return s.initErr
	}

	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	markdownFiles, err := listMarkdownFiles(s.memoryDir)
	if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin memory sync tx: %w", err)
	}

	seen := make(map[string]struct{}, len(markdownFiles))
	for _, path := range markdownFiles {
		seen[path] = struct{}{}
		record, err := readDocumentRecord(path)
		if err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := upsertDocument(tx, record, collectionForPath(path, s.memoryDir)); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if err := deleteMissingDocuments(tx, seen); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit memory sync tx: %w", err)
	}

	return nil
}

func (s *Store) SyncFile(path string) error {
	if s.initErr != nil {
		return s.initErr
	}

	record, err := readDocumentRecord(path)
	if err != nil {
		return err
	}

	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin memory file sync tx: %w", err)
	}

	if err := upsertDocument(tx, record, collectionForPath(path, s.memoryDir)); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit memory file sync tx: %w", err)
	}

	return nil
}

func (s *Store) Search(query string, limit int) ([]string, error) {
	searchResults, err := s.SearchContext(SearchOptions{Query: query, Limit: limit})
	if err != nil {
		return nil, err
	}

	results := make([]string, 0, len(searchResults))
	for _, result := range searchResults {
		results = append(results, fmt.Sprintf("%s\n%s", result.Path, result.Content))
	}
	return results, nil
}

func (s *Store) SearchContext(opts SearchOptions) ([]SearchResult, error) {
	matchQuery := buildMatchQuery(opts.Query)
	if matchQuery == "" {
		return nil, nil
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 5
	}
	if err := s.SyncWorkspace(); err != nil {
		return nil, err
	}

	db, err := s.openDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	candidateLimit := limit * 4
	if candidateLimit < 12 {
		candidateLimit = 12
	}

	rows, err := db.Query(`
		SELECT f.doc_path, f.content, d.collection, bm25(chunks_fts) AS score
		FROM chunks_fts AS f
		JOIN documents AS d ON d.path = f.doc_path
		WHERE chunks_fts MATCH ?
		ORDER BY bm25(chunks_fts)
		LIMIT ?
	`, matchQuery, candidateLimit)
	if err != nil {
		return nil, fmt.Errorf("search memory: %w", err)
	}
	defer rows.Close()

	results := []SearchResult{}
	for rows.Next() {
		var result SearchResult
		if err := rows.Scan(&result.Path, &result.Content, &result.Collection, &result.Score); err != nil {
			return nil, fmt.Errorf("scan memory search row: %w", err)
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate memory search rows: %w", err)
	}

	return rankSearchResults(results, opts, limit), nil
}

func (s *Store) BuildRelevantContext(opts SearchOptions) (string, error) {
	results, err := s.SearchContext(opts)
	if err != nil {
		return "", err
	}
	return buildRelevantContext(results), nil
}

func (s *Store) openDB() (*sql.DB, error) {
	if s.initErr != nil {
		return nil, s.initErr
	}

	db, err := sql.Open(sqliteDriver, s.dbPath)
	if err != nil {
		return nil, fmt.Errorf("open memory db: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
		"PRAGMA synchronous = NORMAL",
	}
	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("set memory pragma %q: %w", pragma, err)
		}
	}

	return db, nil
}

func initSchema(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS documents (
			path TEXT PRIMARY KEY,
			collection TEXT NOT NULL,
			content TEXT NOT NULL,
			modified INTEGER NOT NULL,
			indexed_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS chunks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			doc_path TEXT NOT NULL,
			content TEXT NOT NULL,
			line_start INTEGER NOT NULL,
			line_end INTEGER NOT NULL,
			FOREIGN KEY(doc_path) REFERENCES documents(path) ON DELETE CASCADE
		)`,
		`CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
			content,
			doc_path UNINDEXED
		)`,
		`CREATE INDEX IF NOT EXISTS idx_documents_collection_modified ON documents(collection, modified DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_chunks_doc_path ON chunks(doc_path)`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return fmt.Errorf("init memory schema: %w", err)
		}
	}

	return nil
}

func listMarkdownFiles(memoryDir string) ([]string, error) {
	files := []string{}
	err := filepath.WalkDir(memoryDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".md" {
			return nil
		}
		files = append(files, path)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("walk memory markdown files: %w", err)
	}
	sort.Strings(files)
	return files, nil
}

func readDocumentRecord(path string) (documentRecord, error) {
	info, err := os.Stat(path)
	if err != nil {
		return documentRecord{}, fmt.Errorf("stat memory document %q: %w", path, err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return documentRecord{}, fmt.Errorf("read memory document %q: %w", path, err)
	}

	return documentRecord{
		Path:     path,
		Content:  string(data),
		Modified: info.ModTime().Unix(),
		Exists:   true,
	}, nil
}

func upsertDocument(tx *sql.Tx, record documentRecord, collection string) error {
	if !record.Exists {
		return nil
	}

	now := time.Now().Unix()
	if _, err := tx.Exec(`
		INSERT INTO documents(path, collection, content, modified, indexed_at)
		VALUES(?, ?, ?, ?, ?)
		ON CONFLICT(path) DO UPDATE SET
			collection = excluded.collection,
			content = excluded.content,
			modified = excluded.modified,
			indexed_at = excluded.indexed_at
	`, record.Path, collection, record.Content, record.Modified, now); err != nil {
		return fmt.Errorf("upsert memory document %q: %w", record.Path, err)
	}

	if _, err := tx.Exec(`DELETE FROM chunks WHERE doc_path = ?`, record.Path); err != nil {
		return fmt.Errorf("delete old memory chunks for %q: %w", record.Path, err)
	}
	if _, err := tx.Exec(`DELETE FROM chunks_fts WHERE doc_path = ?`, record.Path); err != nil {
		return fmt.Errorf("delete old memory fts rows for %q: %w", record.Path, err)
	}

	for _, chunk := range chunkMarkdown(record.Content, defaultChunkSize, defaultOverlap) {
		if _, err := tx.Exec(`
			INSERT INTO chunks(doc_path, content, line_start, line_end)
			VALUES(?, ?, ?, ?)
		`, record.Path, chunk.Content, chunk.LineStart, chunk.LineEnd); err != nil {
			return fmt.Errorf("insert memory chunk for %q: %w", record.Path, err)
		}
		if _, err := tx.Exec(`
			INSERT INTO chunks_fts(content, doc_path)
			VALUES(?, ?)
		`, chunk.Content, record.Path); err != nil {
			return fmt.Errorf("insert memory fts row for %q: %w", record.Path, err)
		}
	}

	return nil
}

func deleteMissingDocuments(tx *sql.Tx, seen map[string]struct{}) error {
	rows, err := tx.Query(`SELECT path FROM documents`)
	if err != nil {
		return fmt.Errorf("query indexed memory documents: %w", err)
	}
	defer rows.Close()

	missing := []string{}
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return fmt.Errorf("scan indexed memory document: %w", err)
		}
		if _, ok := seen[path]; !ok {
			missing = append(missing, path)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate indexed memory documents: %w", err)
	}

	for _, path := range missing {
		if _, err := tx.Exec(`DELETE FROM chunks_fts WHERE doc_path = ?`, path); err != nil {
			return fmt.Errorf("delete missing memory fts row %q: %w", path, err)
		}
		if _, err := tx.Exec(`DELETE FROM documents WHERE path = ?`, path); err != nil {
			return fmt.Errorf("delete missing memory document %q: %w", path, err)
		}
	}

	return nil
}

func getDocumentContent(db *sql.DB, path string) (string, error) {
	var content string
	err := db.QueryRow(`SELECT content FROM documents WHERE path = ?`, path).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get memory document %q: %w", path, err)
	}
	return content, nil
}

func getRecentDailyNotes(db *sql.DB, days int) ([]string, error) {
	rows, err := db.Query(`
		SELECT content
		FROM documents
		WHERE collection = 'daily_note'
		ORDER BY modified DESC, path DESC
		LIMIT ?
	`, days)
	if err != nil {
		return nil, fmt.Errorf("query recent daily notes: %w", err)
	}
	defer rows.Close()

	notes := []string{}
	for rows.Next() {
		var content string
		if err := rows.Scan(&content); err != nil {
			return nil, fmt.Errorf("scan recent daily note: %w", err)
		}
		notes = append(notes, content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent daily notes: %w", err)
	}

	return notes, nil
}

func buildMemoryContext(longTerm string, recentNotes []string) string {
	if longTerm == "" && len(recentNotes) == 0 {
		return ""
	}

	parts := []string{}
	if longTerm != "" {
		parts = append(parts, "## Long-term Memory\n\n"+longTerm)
	}
	if len(recentNotes) > 0 {
		parts = append(parts, "## Recent Daily Notes\n\n"+strings.Join(recentNotes, "\n\n---\n\n"))
	}

	return strings.Join(parts, "\n\n---\n\n")
}

func collectionForPath(path string, memoryDir string) string {
	if filepath.Clean(path) == filepath.Join(memoryDir, "MEMORY.md") {
		return "long_term"
	}
	if isDailyNotePath(path) {
		return "daily_note"
	}
	return "memory_note"
}

func isDailyNotePath(path string) bool {
	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	if len(base) != 8 {
		return false
	}
	for _, char := range base {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func chunkMarkdown(content string, chunkSize int, overlap int) []Chunk {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return nil
	}

	lines := strings.Split(trimmed, "\n")
	if chunkSize <= 0 {
		chunkSize = defaultChunkSize
	}
	if overlap < 0 || overlap >= chunkSize {
		overlap = 0
	}

	chunks := []Chunk{}
	step := chunkSize - overlap
	if step <= 0 {
		step = chunkSize
	}

	for start := 0; start < len(lines); start += step {
		end := start + chunkSize
		if end > len(lines) {
			end = len(lines)
		}
		chunkContent := strings.TrimSpace(strings.Join(lines[start:end], "\n"))
		if chunkContent != "" {
			chunks = append(chunks, Chunk{
				Content:   chunkContent,
				LineStart: start + 1,
				LineEnd:   end,
			})
		}
		if end == len(lines) {
			break
		}
	}

	return chunks
}

func buildMatchQuery(query string) string {
	tokens := tokenizeQuery(query)
	if len(tokens) == 0 {
		return ""
	}

	parts := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if len(token) >= 3 {
			parts = append(parts, token+"*")
			continue
		}
		parts = append(parts, token)
	}

	return strings.Join(parts, " OR ")
}

func tokenizeQuery(query string) []string {
	stopWords := map[string]struct{}{
		"the": {}, "and": {}, "for": {}, "with": {}, "that": {}, "this": {},
		"from": {}, "into": {}, "please": {}, "prepare": {}, "about": {},
		"have": {}, "will": {}, "your": {}, "para": {}, "con": {}, "que": {},
		"por": {}, "los": {}, "las": {}, "una": {}, "uno": {},
	}

	fields := strings.FieldsFunc(strings.ToLower(query), func(r rune) bool {
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

func rankSearchResults(results []SearchResult, opts SearchOptions, limit int) []SearchResult {
	if len(results) == 0 {
		return nil
	}

	patterns := buildScopePatterns(opts)
	filtered := make([]SearchResult, 0, len(results))
	for _, result := range results {
		if shouldExcludeScopedPath(result.Path, patterns) {
			continue
		}
		filtered = append(filtered, result)
	}

	if len(filtered) == 0 {
		filtered = results
	}

	sort.SliceStable(filtered, func(i, j int) bool {
		left := scoreSearchResult(filtered[i], patterns)
		right := scoreSearchResult(filtered[j], patterns)
		if left == right {
			return filtered[i].Path < filtered[j].Path
		}
		return left > right
	})

	unique := make([]SearchResult, 0, len(filtered))
	seen := map[string]struct{}{}
	for _, result := range filtered {
		key := result.Path + "\x00" + result.Content
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		unique = append(unique, result)
		if len(unique) == limit {
			break
		}
	}

	return unique
}

func buildScopePatterns(opts SearchOptions) []string {
	channel := normalizeScopeValue(opts.Channel)
	if channel == "" {
		return nil
	}

	patterns := []string{}
	if chatID := normalizeScopeValue(opts.ChatID); chatID != "" {
		patterns = append(patterns, filepath.ToSlash(filepath.Join("scopes", channel, "chat-"+chatID+".md")))
	}
	if senderID := normalizeScopeValue(opts.SenderID); senderID != "" {
		patterns = append(patterns, filepath.ToSlash(filepath.Join("scopes", channel, "sender-"+senderID+".md")))
	}

	metadata := opts.Metadata
	model := normalizeScopeValue(metadata["model"])
	resID := normalizeScopeValue(metadata["res_id"])
	companyID := normalizeScopeValue(metadata["company_id"])
	if channel == "odoo" {
		if companyID != "" && model != "" && resID != "" {
			patterns = append(patterns, filepath.ToSlash(filepath.Join("scopes", channel, "company-"+companyID, "entity-"+model+"-"+resID+".md")))
		}
		if model != "" && resID != "" {
			patterns = append(patterns, filepath.ToSlash(filepath.Join("scopes", channel, "entity-"+model+"-"+resID+".md")))
		}
		if companyID != "" {
			patterns = append(patterns, filepath.ToSlash(filepath.Join("scopes", channel, "company-"+companyID, "channel-"+normalizeScopeValue(opts.ChatID)+".md")))
		}
	}

	return patterns
}

func shouldExcludeScopedPath(path string, patterns []string) bool {
	normalized := filepath.ToSlash(path)
	if !strings.Contains(normalized, "/scopes/") {
		return false
	}
	if len(patterns) == 0 {
		return false
	}
	for _, pattern := range patterns {
		if strings.HasSuffix(normalized, pattern) {
			return false
		}
	}
	return true
}

func scoreSearchResult(result SearchResult, patterns []string) float64 {
	score := -result.Score
	if result.Collection == "long_term" {
		score += 3
	}
	if result.Collection == "daily_note" {
		score += 1
	}

	normalized := filepath.ToSlash(result.Path)
	for _, pattern := range patterns {
		if strings.HasSuffix(normalized, pattern) {
			score += 10
		}
	}

	return score
}

func buildRelevantContext(results []SearchResult) string {
	if len(results) == 0 {
		return ""
	}

	parts := make([]string, 0, len(results))
	for _, result := range results {
		parts = append(parts, fmt.Sprintf("### %s\n%s", filepath.Base(result.Path), truncateSnippet(result.Content, 280)))
	}

	return "## Relevant Memory Recall\n\n" + strings.Join(parts, "\n\n")
}

func truncateSnippet(content string, maxLen int) string {
	content = strings.TrimSpace(content)
	if maxLen <= 0 || len(content) <= maxLen {
		return content
	}
	return strings.TrimSpace(content[:maxLen]) + "…"
}

func normalizeScopeValue(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(value))
	lastDash := false
	for _, r := range value {
		allowed := unicode.IsLetter(r) || unicode.IsNumber(r)
		if channelSep := r == '.' || r == '_' || r == '-'; allowed || channelSep {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}
