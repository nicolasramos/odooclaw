package proactive

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// Store persists proactive-engine state: who was already offered what, when
// the assistant last spoke per area, and how many times it spoke today.
//
// This is deliberately NOT in-memory. An in-memory map forgets its cooldowns on
// every restart, which turns "at most once per area per day" into "once per
// deploy" — a promise the product cannot keep. SQLite gives durability with no
// extra moving part, using the same driver the knowledge base already uses.
type Store interface {
	// LastSpoke returns the last time the assistant spoke to the user in an
	// area, and whether it ever did.
	LastSpoke(userID int, area string) (time.Time, bool, error)
	// SentToday counts interventions delivered to the user on the local day
	// containing at.
	SentToday(userID int, at time.Time) (int, error)
	// AlreadyOffered reports whether a playbook was already offered to the
	// user, ever. Dedupe is global on purpose: the same offer never repeats.
	AlreadyOffered(userID int, playbookID string) (bool, error)
	// RecordSpoke persists a delivered intervention.
	RecordSpoke(userID int, area, playbookID string, at time.Time) error
	// Close releases the underlying handle.
	Close() error
}

const schema = `
CREATE TABLE IF NOT EXISTS proactive_intervention (
	id          INTEGER PRIMARY KEY,
	user_id     INTEGER NOT NULL,
	area        TEXT    NOT NULL,
	playbook_id TEXT    NOT NULL,
	spoken_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proactive_user_area ON proactive_intervention(user_id, area);
CREATE INDEX IF NOT EXISTS idx_proactive_user_playbook ON proactive_intervention(user_id, playbook_id);
CREATE INDEX IF NOT EXISTS idx_proactive_spoken_at ON proactive_intervention(spoken_at);
`

// SQLiteStore is the durable Store.
type SQLiteStore struct {
	db *sql.DB
	mu sync.Mutex
}

// NewSQLiteStore opens (creating if needed) a durable store at path. Use
// ":memory:" for tests.
func NewSQLiteStore(path string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("failed to open proactive store: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create proactive schema: %w", err)
	}
	return &SQLiteStore{db: db}, nil
}

// LastSpoke implements Store.
func (s *SQLiteStore) LastSpoke(userID int, area string) (time.Time, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var raw string
	err := s.db.QueryRow(
		`SELECT spoken_at FROM proactive_intervention
		 WHERE user_id = ? AND area = ?
		 ORDER BY spoken_at DESC LIMIT 1`, userID, area,
	).Scan(&raw)
	if err == sql.ErrNoRows {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}
	at, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return time.Time{}, false, err
	}
	return at, true, nil
}

// SentToday implements Store. The day is a 24h window ending at `at` rather
// than a calendar day: it needs no timezone configuration and cannot be gamed
// by crossing midnight.
func (s *SQLiteStore) SentToday(userID int, at time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM proactive_intervention
		 WHERE user_id = ? AND spoken_at > ?`,
		userID, at.Add(-24*time.Hour).Format(time.RFC3339Nano),
	).Scan(&n)
	return n, err
}

// AlreadyOffered implements Store.
func (s *SQLiteStore) AlreadyOffered(userID int, playbookID string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM proactive_intervention
		 WHERE user_id = ? AND playbook_id = ?`, userID, playbookID,
	).Scan(&n)
	return n > 0, err
}

// RecordSpoke implements Store.
func (s *SQLiteStore) RecordSpoke(userID int, area, playbookID string, at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(
		`INSERT INTO proactive_intervention(user_id, area, playbook_id, spoken_at)
		 VALUES (?, ?, ?, ?)`,
		userID, area, playbookID, at.Format(time.RFC3339Nano),
	)
	return err
}

// Close implements Store.
func (s *SQLiteStore) Close() error { return s.db.Close() }

// MemoryStore is a non-durable Store for tests and demos. It shares the exact
// semantics of SQLiteStore so behaviour verified here matches production.
type MemoryStore struct {
	mu   sync.Mutex
	rows []intervention
}

type intervention struct {
	userID     int
	area       string
	playbookID string
	at         time.Time
}

// NewMemoryStore returns an empty in-memory store.
func NewMemoryStore() *MemoryStore { return &MemoryStore{} }

// LastSpoke implements Store.
func (s *MemoryStore) LastSpoke(userID int, area string) (time.Time, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var last time.Time
	found := false
	for _, r := range s.rows {
		if r.userID == userID && r.area == area && (!found || r.at.After(last)) {
			last, found = r.at, true
		}
	}
	return last, found, nil
}

// SentToday implements Store.
func (s *MemoryStore) SentToday(userID int, at time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := at.Add(-24 * time.Hour)
	n := 0
	for _, r := range s.rows {
		if r.userID == userID && r.at.After(cutoff) {
			n++
		}
	}
	return n, nil
}

// AlreadyOffered implements Store.
func (s *MemoryStore) AlreadyOffered(userID int, playbookID string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, r := range s.rows {
		if r.userID == userID && r.playbookID == playbookID {
			return true, nil
		}
	}
	return false, nil
}

// RecordSpoke implements Store.
func (s *MemoryStore) RecordSpoke(userID int, area, playbookID string, at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.rows = append(s.rows, intervention{userID: userID, area: area, playbookID: playbookID, at: at})
	return nil
}

// Close implements Store.
func (s *MemoryStore) Close() error { return nil }
