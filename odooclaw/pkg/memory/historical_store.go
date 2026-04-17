package memory

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const historicalSQLiteDBFile = "historical.sqlite"

const (
	defaultHistoricalFactsLimit = 10
	maxHistoricalFactsLimit     = 50
	defaultTimelineLimit        = 20
	maxTimelineLimit            = 100
	defaultImportMaxFiles       = 500
	maxImportMaxFiles           = 5000
)

type HistoricalStore struct {
	memoryDir string
	dbPath    string
	initErr   error
}

type HistoricalSaveInput struct {
	Content  string
	Source   string
	Channel  string
	ChatID   string
	SenderID string
	Metadata map[string]string
}

type HistoricalImportOptions struct {
	IncludeLongTerm   bool
	IncludeDailyNotes bool
	IncludeScoped     bool
	IncludeMemoryNote bool
	MaxFiles          int
	Source            string
	DryRun            bool
}

type HistoricalImportResult struct {
	Scanned  int  `json:"scanned"`
	Selected int  `json:"selected"`
	Imported int  `json:"imported"`
	Deduped  int  `json:"deduped"`
	Skipped  int  `json:"skipped"`
	DryRun   bool `json:"dry_run"`
}

type HistoricalFactInput struct {
	Subject    string
	Predicate  string
	Object     string
	ValidFrom  int64
	ValidTo    int64
	Confidence float64
	Source     string
	Channel    string
	ChatID     string
	SenderID   string
	Metadata   map[string]string
}

type HistoricalFactSaveResult struct {
	FactID   int64
	Deduped  bool
	FactPath string
}

type FactQueryOptions struct {
	Query           string
	Limit           int
	AsOf            int64
	IncludeInactive bool
	Channel         string
	ChatID          string
	SenderID        string
	Metadata        map[string]string
}

type HistoricalFact struct {
	ID         int64             `json:"id"`
	Path       string            `json:"path"`
	Subject    string            `json:"subject"`
	Predicate  string            `json:"predicate"`
	Object     string            `json:"object"`
	ValidFrom  int64             `json:"valid_from,omitempty"`
	ValidTo    int64             `json:"valid_to,omitempty"`
	Status     string            `json:"status"`
	Confidence float64           `json:"confidence"`
	Source     string            `json:"source"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	CreatedAt  int64             `json:"created_at"`
	UpdatedAt  int64             `json:"updated_at"`
}

type TimelineOptions struct {
	Limit    int
	FromUnix int64
	ToUnix   int64
	Channel  string
	ChatID   string
	SenderID string
	Metadata map[string]string
}

type TimelineEvent struct {
	Timestamp int64  `json:"timestamp"`
	Type      string `json:"type"`
	Path      string `json:"path"`
	Source    string `json:"source"`
	Summary   string `json:"summary"`
	FactID    int64  `json:"fact_id,omitempty"`
}

func NewHistoricalStore(memoryDir string) *HistoricalStore {
	store := &HistoricalStore{
		memoryDir: memoryDir,
		dbPath:    filepath.Join(memoryDir, historicalSQLiteDBFile),
	}
	store.initErr = store.initialize()
	return store
}

func (s *HistoricalStore) DBPath() string {
	return s.dbPath
}

func (s *HistoricalStore) Save(input HistoricalSaveInput) (int64, error) {
	if s.initErr != nil {
		return 0, s.initErr
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		return 0, fmt.Errorf("historical memory content is required")
	}

	source := strings.TrimSpace(input.Source)
	if source == "" {
		source = "manual"
	}

	metadataJSON := "{}"
	if len(input.Metadata) > 0 {
		encoded, err := json.Marshal(input.Metadata)
		if err != nil {
			return 0, fmt.Errorf("encode historical metadata: %w", err)
		}
		metadataJSON = string(encoded)
	}

	scopeOpts := SearchOptions{
		Channel:  input.Channel,
		ChatID:   input.ChatID,
		SenderID: input.SenderID,
		Metadata: input.Metadata,
	}
	path := historicalPathForScope(scopeOpts)
	now := time.Now().Unix()

	db, err := s.openDB()
	if err != nil {
		return 0, err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return 0, fmt.Errorf("begin historical save tx: %w", err)
	}

	result, err := tx.Exec(`
		INSERT INTO historical_entries(path, content, source, metadata_json, created_at, updated_at)
		VALUES(?, ?, ?, ?, ?, ?)
	`, path, content, source, metadataJSON, now, now)
	if err != nil {
		_ = tx.Rollback()
		return 0, fmt.Errorf("insert historical entry: %w", err)
	}

	entryID, err := result.LastInsertId()
	if err != nil {
		_ = tx.Rollback()
		return 0, fmt.Errorf("read historical entry id: %w", err)
	}

	if _, err := tx.Exec(`
		INSERT INTO historical_entries_fts(content, entry_id, path)
		VALUES(?, ?, ?)
	`, content, entryID, path); err != nil {
		_ = tx.Rollback()
		return 0, fmt.Errorf("insert historical fts row: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit historical save tx: %w", err)
	}

	return entryID, nil
}

func (s *HistoricalStore) ImportFromMarkdown(opts HistoricalImportOptions) (HistoricalImportResult, error) {
	if s.initErr != nil {
		return HistoricalImportResult{}, s.initErr
	}

	opts = normalizeHistoricalImportOptions(opts)
	result := HistoricalImportResult{DryRun: opts.DryRun}

	markdownFiles, err := listMarkdownFiles(s.memoryDir)
	if err != nil {
		return result, err
	}

	db, err := s.openDB()
	if err != nil {
		return result, err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return result, fmt.Errorf("begin historical import tx: %w", err)
	}

	now := time.Now().Unix()
	selectedCount := 0
	for _, sourcePath := range markdownFiles {
		result.Scanned++

		relPath, err := filepath.Rel(s.memoryDir, sourcePath)
		if err != nil {
			_ = tx.Rollback()
			return result, fmt.Errorf("resolve markdown relative path %q: %w", sourcePath, err)
		}
		relPath = filepath.ToSlash(relPath)

		importKind, destinationPath, ok := classifyImportPath(relPath, opts)
		if !ok {
			result.Skipped++
			continue
		}

		selectedCount++
		if selectedCount > opts.MaxFiles {
			result.Skipped += len(markdownFiles) - result.Scanned + 1
			break
		}
		result.Selected++

		record, err := readDocumentRecord(sourcePath)
		if err != nil {
			_ = tx.Rollback()
			return result, err
		}

		content := strings.TrimSpace(record.Content)
		if content == "" {
			result.Skipped++
			continue
		}

		metadataJSON, err := json.Marshal(map[string]string{
			"import_source_path": relPath,
			"import_kind":        importKind,
		})
		if err != nil {
			_ = tx.Rollback()
			return result, fmt.Errorf("encode historical import metadata: %w", err)
		}

		createdAt := record.Modified
		if createdAt <= 0 {
			createdAt = now
		}

		deduped, err := insertHistoricalEntryTx(tx, destinationPath, content, opts.Source, string(metadataJSON), createdAt)
		if err != nil {
			_ = tx.Rollback()
			return result, err
		}
		if deduped {
			result.Deduped++
			continue
		}
		result.Imported++
	}

	if opts.DryRun {
		if err := tx.Rollback(); err != nil {
			return result, fmt.Errorf("rollback dry-run historical import tx: %w", err)
		}
		return result, nil
	}

	if err := tx.Commit(); err != nil {
		return result, fmt.Errorf("commit historical import tx: %w", err)
	}

	return result, nil
}

func (s *HistoricalStore) SaveFact(input HistoricalFactInput) (HistoricalFactSaveResult, error) {
	if s.initErr != nil {
		return HistoricalFactSaveResult{}, s.initErr
	}

	subject := strings.TrimSpace(input.Subject)
	predicate := strings.TrimSpace(input.Predicate)
	object := strings.TrimSpace(input.Object)
	if subject == "" || predicate == "" || object == "" {
		return HistoricalFactSaveResult{}, fmt.Errorf("historical fact requires subject, predicate and object")
	}

	if input.ValidTo > 0 && input.ValidFrom > 0 && input.ValidTo < input.ValidFrom {
		return HistoricalFactSaveResult{}, fmt.Errorf("historical fact valid_to must be >= valid_from")
	}

	confidence := input.Confidence
	if confidence <= 0 {
		confidence = 0.8
	}
	if confidence > 1 {
		confidence = 1
	}

	source := strings.TrimSpace(input.Source)
	if source == "" {
		source = "memory_add_fact"
	}

	metadataJSON := "{}"
	if len(input.Metadata) > 0 {
		encoded, err := json.Marshal(input.Metadata)
		if err != nil {
			return HistoricalFactSaveResult{}, fmt.Errorf("encode historical fact metadata: %w", err)
		}
		metadataJSON = string(encoded)
	}

	path := historicalPathForScope(SearchOptions{
		Channel:  input.Channel,
		ChatID:   input.ChatID,
		SenderID: input.SenderID,
		Metadata: input.Metadata,
	})

	validFrom := nullableUnix(input.ValidFrom)
	validTo := nullableUnix(input.ValidTo)
	now := time.Now().Unix()

	db, err := s.openDB()
	if err != nil {
		return HistoricalFactSaveResult{}, err
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return HistoricalFactSaveResult{}, fmt.Errorf("begin historical fact save tx: %w", err)
	}

	var existingID int64
	err = tx.QueryRow(`
		SELECT id
		FROM historical_facts
		WHERE path = ?
		  AND lower(subject) = lower(?)
		  AND lower(predicate) = lower(?)
		  AND lower(object) = lower(?)
		  AND status = 'active'
		  AND coalesce(valid_from, 0) = ?
		  AND coalesce(valid_to, 0) = ?
		LIMIT 1
	`, path, subject, predicate, object, input.ValidFrom, input.ValidTo).Scan(&existingID)
	if err == nil {
		if err := tx.Commit(); err != nil {
			return HistoricalFactSaveResult{}, fmt.Errorf("commit historical fact dedupe tx: %w", err)
		}
		return HistoricalFactSaveResult{FactID: existingID, Deduped: true, FactPath: path}, nil
	}
	if err != nil && err != sql.ErrNoRows {
		_ = tx.Rollback()
		return HistoricalFactSaveResult{}, fmt.Errorf("query historical fact dedupe: %w", err)
	}

	result, err := tx.Exec(`
		INSERT INTO historical_facts(
			path, subject, predicate, object, valid_from, valid_to, status, confidence,
			source, metadata_json, created_at, updated_at
		)
		VALUES(?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
	`, path, subject, predicate, object, validFrom, validTo, confidence, source, metadataJSON, now, now)
	if err != nil {
		_ = tx.Rollback()
		return HistoricalFactSaveResult{}, fmt.Errorf("insert historical fact: %w", err)
	}

	factID, err := result.LastInsertId()
	if err != nil {
		_ = tx.Rollback()
		return HistoricalFactSaveResult{}, fmt.Errorf("read historical fact id: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return HistoricalFactSaveResult{}, fmt.Errorf("commit historical fact save tx: %w", err)
	}

	return HistoricalFactSaveResult{FactID: factID, Deduped: false, FactPath: path}, nil
}

func (s *HistoricalStore) QueryFacts(opts FactQueryOptions) ([]HistoricalFact, error) {
	if s.initErr != nil {
		return nil, s.initErr
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = defaultHistoricalFactsLimit
	}
	if limit > maxHistoricalFactsLimit {
		limit = maxHistoricalFactsLimit
	}
	candidateLimit := limit * 5
	if candidateLimit < 20 {
		candidateLimit = 20
	}

	db, err := s.openDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	clauses := []string{"1=1"}
	args := make([]any, 0, 6)
	if !opts.IncludeInactive {
		clauses = append(clauses, "status = 'active'")
	}
	if opts.AsOf > 0 {
		clauses = append(clauses, "(valid_from IS NULL OR valid_from <= ?)")
		clauses = append(clauses, "(valid_to IS NULL OR valid_to >= ?)")
		args = append(args, opts.AsOf, opts.AsOf)
	}

	query := fmt.Sprintf(`
		SELECT id, path, subject, predicate, object, valid_from, valid_to, status, confidence, source, metadata_json, created_at, updated_at
		FROM historical_facts
		WHERE %s
		ORDER BY created_at DESC
		LIMIT ?
	`, strings.Join(clauses, " AND "))
	args = append(args, candidateLimit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query historical facts: %w", err)
	}
	defer rows.Close()

	patterns := buildScopePatterns(SearchOptions{
		Channel:  opts.Channel,
		ChatID:   opts.ChatID,
		SenderID: opts.SenderID,
		Metadata: opts.Metadata,
	})
	queryTokens := tokenizeQuery(opts.Query)

	facts := make([]HistoricalFact, 0, candidateLimit)
	for rows.Next() {
		var fact HistoricalFact
		var validFrom sql.NullInt64
		var validTo sql.NullInt64
		var metadataJSON string
		if err := rows.Scan(
			&fact.ID,
			&fact.Path,
			&fact.Subject,
			&fact.Predicate,
			&fact.Object,
			&validFrom,
			&validTo,
			&fact.Status,
			&fact.Confidence,
			&fact.Source,
			&metadataJSON,
			&fact.CreatedAt,
			&fact.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan historical fact row: %w", err)
		}

		if validFrom.Valid {
			fact.ValidFrom = validFrom.Int64
		}
		if validTo.Valid {
			fact.ValidTo = validTo.Int64
		}
		if metadataJSON != "" {
			_ = json.Unmarshal([]byte(metadataJSON), &fact.Metadata)
		}

		if len(queryTokens) > 0 && !factMatchesTokens(fact, queryTokens) {
			continue
		}
		if shouldExcludeScopedPath(fact.Path, patterns) {
			continue
		}

		facts = append(facts, fact)
		if len(facts) == limit {
			break
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate historical fact rows: %w", err)
	}

	return facts, nil
}

func (s *HistoricalStore) GetTimeline(opts TimelineOptions) ([]TimelineEvent, error) {
	if s.initErr != nil {
		return nil, s.initErr
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = defaultTimelineLimit
	}
	if limit > maxTimelineLimit {
		limit = maxTimelineLimit
	}
	candidateLimit := limit * 4
	if candidateLimit < 20 {
		candidateLimit = 20
	}

	db, err := s.openDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	patterns := buildScopePatterns(SearchOptions{
		Channel:  opts.Channel,
		ChatID:   opts.ChatID,
		SenderID: opts.SenderID,
		Metadata: opts.Metadata,
	})

	events := make([]TimelineEvent, 0, candidateLimit*2)

	entryRows, err := db.Query(`
		SELECT path, content, source, created_at
		FROM historical_entries
		WHERE (? = 0 OR created_at >= ?)
		  AND (? = 0 OR created_at <= ?)
		ORDER BY created_at DESC
		LIMIT ?
	`, opts.FromUnix, opts.FromUnix, opts.ToUnix, opts.ToUnix, candidateLimit)
	if err != nil {
		return nil, fmt.Errorf("query historical timeline entries: %w", err)
	}
	for entryRows.Next() {
		var path string
		var content string
		var source string
		var createdAt int64
		if err := entryRows.Scan(&path, &content, &source, &createdAt); err != nil {
			entryRows.Close()
			return nil, fmt.Errorf("scan historical timeline entry row: %w", err)
		}
		if shouldExcludeScopedPath(path, patterns) {
			continue
		}
		events = append(events, TimelineEvent{
			Timestamp: createdAt,
			Type:      "entry",
			Path:      path,
			Source:    source,
			Summary:   truncateSnippet(content, 200),
		})
	}
	if err := entryRows.Err(); err != nil {
		entryRows.Close()
		return nil, fmt.Errorf("iterate historical timeline entries: %w", err)
	}
	entryRows.Close()

	factRows, err := db.Query(`
		SELECT id, path, subject, predicate, object, source, created_at
		FROM historical_facts
		WHERE status = 'active'
		  AND (? = 0 OR created_at >= ?)
		  AND (? = 0 OR created_at <= ?)
		ORDER BY created_at DESC
		LIMIT ?
	`, opts.FromUnix, opts.FromUnix, opts.ToUnix, opts.ToUnix, candidateLimit)
	if err != nil {
		return nil, fmt.Errorf("query historical timeline facts: %w", err)
	}
	for factRows.Next() {
		var id int64
		var path, subject, predicate, object, source string
		var createdAt int64
		if err := factRows.Scan(&id, &path, &subject, &predicate, &object, &source, &createdAt); err != nil {
			factRows.Close()
			return nil, fmt.Errorf("scan historical timeline fact row: %w", err)
		}
		if shouldExcludeScopedPath(path, patterns) {
			continue
		}
		events = append(events, TimelineEvent{
			Timestamp: createdAt,
			Type:      "fact",
			Path:      path,
			Source:    source,
			Summary:   fmt.Sprintf("%s %s %s", subject, predicate, object),
			FactID:    id,
		})
	}
	if err := factRows.Err(); err != nil {
		factRows.Close()
		return nil, fmt.Errorf("iterate historical timeline facts: %w", err)
	}
	factRows.Close()

	sort.SliceStable(events, func(i, j int) bool {
		if events[i].Timestamp == events[j].Timestamp {
			return events[i].Type < events[j].Type
		}
		return events[i].Timestamp > events[j].Timestamp
	})

	if len(events) > limit {
		events = events[:limit]
	}

	return events, nil
}

func (s *HistoricalStore) SearchContext(opts SearchOptions) ([]SearchResult, error) {
	if s.initErr != nil {
		return nil, s.initErr
	}

	matchQuery := buildMatchQuery(opts.Query)
	if matchQuery == "" {
		return nil, nil
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 5
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
		SELECT f.path, f.content, 'historical' AS collection, bm25(historical_entries_fts) AS score, e.source, e.created_at
		FROM historical_entries_fts AS f
		JOIN historical_entries AS e ON e.id = f.entry_id
		WHERE historical_entries_fts MATCH ?
		ORDER BY bm25(historical_entries_fts)
		LIMIT ?
	`, matchQuery, candidateLimit)
	if err != nil {
		return nil, fmt.Errorf("search historical memory: %w", err)
	}
	defer rows.Close()

	results := make([]SearchResult, 0, candidateLimit)
	for rows.Next() {
		var result SearchResult
		if err := rows.Scan(&result.Path, &result.Content, &result.Collection, &result.Score, &result.Source, &result.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan historical search row: %w", err)
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate historical search rows: %w", err)
	}

	ranked := rankHistoricalSearchResults(results, opts, limit)
	patterns := buildScopePatterns(opts)
	if len(patterns) == 0 {
		return ranked, nil
	}

	strict := make([]SearchResult, 0, len(ranked))
	for _, result := range ranked {
		if shouldExcludeScopedPath(result.Path, patterns) {
			continue
		}
		strict = append(strict, result)
	}
	return strict, nil
}

func (s *HistoricalStore) BuildRelevantContext(opts SearchOptions) (string, error) {
	results, err := s.SearchContext(opts)
	if err != nil {
		return "", err
	}
	return buildRelevantContext(results), nil
}

func (s *HistoricalStore) initialize() error {
	if err := os.MkdirAll(s.memoryDir, 0o755); err != nil {
		return fmt.Errorf("create historical memory dir: %w", err)
	}

	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	return initHistoricalSchema(db)
}

func (s *HistoricalStore) openDB() (*sql.DB, error) {
	if s.initErr != nil {
		return nil, s.initErr
	}

	db, err := sql.Open(sqliteDriver, s.dbPath)
	if err != nil {
		return nil, fmt.Errorf("open historical memory db: %w", err)
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
			return nil, fmt.Errorf("set historical memory pragma %q: %w", pragma, err)
		}
	}

	return db, nil
}

func initHistoricalSchema(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS historical_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			path TEXT NOT NULL,
			content TEXT NOT NULL,
			source TEXT NOT NULL,
			metadata_json TEXT NOT NULL DEFAULT '{}',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE VIRTUAL TABLE IF NOT EXISTS historical_entries_fts USING fts5(
			content,
			entry_id UNINDEXED,
			path UNINDEXED
		)`,
		`CREATE TABLE IF NOT EXISTS historical_facts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			path TEXT NOT NULL,
			subject TEXT NOT NULL,
			predicate TEXT NOT NULL,
			object TEXT NOT NULL,
			valid_from INTEGER,
			valid_to INTEGER,
			status TEXT NOT NULL DEFAULT 'active',
			confidence REAL NOT NULL DEFAULT 0.8,
			source TEXT NOT NULL,
			metadata_json TEXT NOT NULL DEFAULT '{}',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_historical_entries_path_created ON historical_entries(path, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_historical_entries_created ON historical_entries(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_historical_facts_path_created ON historical_facts(path, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_historical_facts_status_created ON historical_facts(status, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_historical_facts_spo ON historical_facts(subject, predicate, object)`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return fmt.Errorf("init historical schema: %w", err)
		}
	}

	return nil
}

func historicalPathForScope(opts SearchOptions) string {
	channel := normalizeScopeValue(opts.Channel)
	if channel == "" {
		return filepath.ToSlash(filepath.Join("historical", "global.md"))
	}

	chatID := normalizeScopeValue(opts.ChatID)
	senderID := normalizeScopeValue(opts.SenderID)
	model := normalizeScopeValue(opts.Metadata["model"])
	resID := normalizeScopeValue(opts.Metadata["res_id"])
	companyID := normalizeScopeValue(opts.Metadata["company_id"])

	if channel == "odoo" {
		if companyID != "" && model != "" && resID != "" {
			return filepath.ToSlash(filepath.Join("historical", "scopes", channel, "company-"+companyID, "entity-"+model+"-"+resID+".md"))
		}
		if model != "" && resID != "" {
			return filepath.ToSlash(filepath.Join("historical", "scopes", channel, "entity-"+model+"-"+resID+".md"))
		}
	}

	if chatID != "" {
		return filepath.ToSlash(filepath.Join("historical", "scopes", channel, "chat-"+chatID+".md"))
	}
	if senderID != "" {
		return filepath.ToSlash(filepath.Join("historical", "scopes", channel, "sender-"+senderID+".md"))
	}

	return filepath.ToSlash(filepath.Join("historical", "scopes", channel, "general.md"))
}

func normalizeHistoricalImportOptions(opts HistoricalImportOptions) HistoricalImportOptions {
	if !opts.IncludeLongTerm && !opts.IncludeDailyNotes && !opts.IncludeScoped && !opts.IncludeMemoryNote {
		opts.IncludeLongTerm = true
		opts.IncludeDailyNotes = true
		opts.IncludeScoped = true
	}

	if opts.MaxFiles <= 0 {
		opts.MaxFiles = defaultImportMaxFiles
	}
	if opts.MaxFiles > maxImportMaxFiles {
		opts.MaxFiles = maxImportMaxFiles
	}

	opts.Source = strings.TrimSpace(opts.Source)
	if opts.Source == "" {
		opts.Source = "import_markdown"
	}

	return opts
}

func classifyImportPath(relPath string, opts HistoricalImportOptions) (kind string, destination string, ok bool) {
	cleanRel := filepath.ToSlash(relPath)
	if strings.HasPrefix(cleanRel, "historical/") {
		return "", "", false
	}

	if cleanRel == "MEMORY.md" {
		if !opts.IncludeLongTerm {
			return "", "", false
		}
		return "long_term", filepath.ToSlash(filepath.Join("historical", "import", "long-term.md")), true
	}

	if strings.HasPrefix(cleanRel, "scopes/") {
		if !opts.IncludeScoped {
			return "", "", false
		}
		return "scoped", filepath.ToSlash(filepath.Join("historical", cleanRel)), true
	}

	if isDailyNotePath(cleanRel) {
		if !opts.IncludeDailyNotes {
			return "", "", false
		}
		base := strings.TrimSuffix(filepath.Base(cleanRel), filepath.Ext(cleanRel))
		month := ""
		if len(base) >= 6 {
			month = base[:6]
		}
		if month != "" {
			return "daily_note", filepath.ToSlash(filepath.Join("historical", "import", "daily", month, base+".md")), true
		}
		return "daily_note", filepath.ToSlash(filepath.Join("historical", "import", "daily", filepath.Base(cleanRel))), true
	}

	if !opts.IncludeMemoryNote {
		return "", "", false
	}

	base := strings.TrimSuffix(filepath.Base(cleanRel), filepath.Ext(cleanRel))
	if base == "" {
		base = "note"
	}
	return "memory_note", filepath.ToSlash(filepath.Join("historical", "import", "notes", base+".md")), true
}

func insertHistoricalEntryTx(tx *sql.Tx, path string, content string, source string, metadataJSON string, createdAt int64) (bool, error) {
	var existingID int64
	err := tx.QueryRow(`
		SELECT id
		FROM historical_entries
		WHERE path = ? AND content = ?
		LIMIT 1
	`, path, content).Scan(&existingID)
	if err == nil {
		return true, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return false, fmt.Errorf("query historical entry dedupe: %w", err)
	}

	result, err := tx.Exec(`
		INSERT INTO historical_entries(path, content, source, metadata_json, created_at, updated_at)
		VALUES(?, ?, ?, ?, ?, ?)
	`, path, content, source, metadataJSON, createdAt, createdAt)
	if err != nil {
		return false, fmt.Errorf("insert historical import entry: %w", err)
	}

	entryID, err := result.LastInsertId()
	if err != nil {
		return false, fmt.Errorf("read historical import entry id: %w", err)
	}

	if _, err := tx.Exec(`
		INSERT INTO historical_entries_fts(content, entry_id, path)
		VALUES(?, ?, ?)
	`, content, entryID, path); err != nil {
		return false, fmt.Errorf("insert historical import fts row: %w", err)
	}

	return false, nil
}

func rankHistoricalSearchResults(results []SearchResult, opts SearchOptions, limit int) []SearchResult {
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

	now := time.Now().Unix()
	sort.SliceStable(filtered, func(i, j int) bool {
		if filtered[i].Path == filtered[j].Path && filtered[i].CreatedAt != filtered[j].CreatedAt {
			return filtered[i].CreatedAt > filtered[j].CreatedAt
		}

		left := scoreHistoricalResult(filtered[i], patterns, now)
		right := scoreHistoricalResult(filtered[j], patterns, now)
		if left == right {
			if filtered[i].CreatedAt != filtered[j].CreatedAt {
				return filtered[i].CreatedAt > filtered[j].CreatedAt
			}
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

func scoreHistoricalResult(result SearchResult, patterns []string, now int64) float64 {
	score := scoreSearchResult(result, patterns)

	source := strings.ToLower(strings.TrimSpace(result.Source))
	switch source {
	case "memory_save_decision":
		score += 1.2
	case "memory_add_fact":
		score += 1.0
	case "memory_save":
		score += 0.8
	case "import_markdown":
		score += 0.2
	}

	if result.CreatedAt > 0 && now > result.CreatedAt {
		ageHours := float64(now-result.CreatedAt) / 3600
		switch {
		case ageHours <= 24:
			score += 1.5
		case ageHours <= 24*7:
			score += 1.0
		case ageHours <= 24*30:
			score += 0.5
		}
	}

	normalizedPath := filepath.ToSlash(result.Path)
	if strings.Contains(normalizedPath, "/scopes/odoo/company-") {
		score += 0.4
	}
	if strings.Contains(normalizedPath, "/scopes/odoo/entity-") {
		score += 0.2
	}

	return score
}

func nullableUnix(value int64) any {
	if value <= 0 {
		return nil
	}
	return value
}

func factMatchesTokens(fact HistoricalFact, tokens []string) bool {
	if len(tokens) == 0 {
		return true
	}
	haystack := strings.ToLower(strings.Join([]string{
		fact.Subject,
		fact.Predicate,
		fact.Object,
		fact.Source,
	}, " "))
	for _, token := range tokens {
		if !strings.Contains(haystack, token) {
			return false
		}
	}
	return true
}
