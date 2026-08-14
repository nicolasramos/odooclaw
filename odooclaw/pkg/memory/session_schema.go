// OdooClaw - Ultra-lightweight personal AI agent
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package memory

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// SessionMemory is the structured per-session memory (NRA-511 / NG AGENTE 3).
// Unlike raw conversation history, it captures the business state of the
// session: which partner/document/module is being worked on and which
// actions are pending confirmation. It is persisted as JSON per session key
// under <memoryDir>/session/<session_key>.json.
type SessionMemory struct {
	Key             string           `json:"key"`
	Channel         string           `json:"channel,omitempty"`
	ChatID          string           `json:"chat_id,omitempty"`
	SenderID        string           `json:"sender_id,omitempty"`
	CurrentCompany  int              `json:"current_company,omitempty"`
	CurrentPartner  int              `json:"current_partner,omitempty"`
	CurrentDocument *DocumentContext `json:"current_document,omitempty"`
	CurrentModule   string           `json:"current_module,omitempty"`
	PendingConfirm  []PendingAction  `json:"pending_confirmation,omitempty"`
	LastActivity    time.Time        `json:"last_activity"`
	MessageCount    int              `json:"message_count"`
}

// DocumentContext identifies the record currently being processed.
type DocumentContext struct {
	Model  string `json:"model"`
	ResID  int    `json:"res_id"`
	Action string `json:"action"` // review, create, edit, confirm
}

// PendingAction is a tool call awaiting explicit user confirmation.
type PendingAction struct {
	Tool   string         `json:"tool"`
	Args   map[string]any `json:"args,omitempty"`
	Reason string         `json:"reason,omitempty"`
}

// SessionMemoryStore persists SessionMemory per session key.
type SessionMemoryStore struct {
	dir string
}

// NewSessionMemoryStore creates the store under <memoryDir>/session.
func NewSessionMemoryStore(memoryDir string) *SessionMemoryStore {
	dir := filepath.Join(memoryDir, "session")
	os.MkdirAll(dir, 0o755)
	return &SessionMemoryStore{dir: dir}
}

func (s *SessionMemoryStore) path(key string) string {
	// Sanitize key for filesystem: channel:chatID -> channel_chatID
	safe := strings.NewReplacer(":", "_", "/", "_", " ", "_").Replace(key)
	return filepath.Join(s.dir, safe+".json")
}

// Load returns the session memory for key, or nil if none exists.
func (s *SessionMemoryStore) Load(key string) (*SessionMemory, error) {
	data, err := os.ReadFile(s.path(key))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var mem SessionMemory
	if err := json.Unmarshal(data, &mem); err != nil {
		return nil, err
	}
	return &mem, nil
}

// Save persists the session memory.
func (s *SessionMemoryStore) Save(key string, mem *SessionMemory) error {
	mem.Key = key
	mem.LastActivity = time.Now().UTC()
	data, err := json.MarshalIndent(mem, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path(key), data, 0o644)
}

// Touch increments the message counter and updates last activity.
func (s *SessionMemoryStore) Touch(key string) error {
	mem, err := s.Load(key)
	if err != nil {
		return err
	}
	if mem == nil {
		mem = &SessionMemory{Key: key}
	}
	mem.MessageCount++
	return s.Save(key, mem)
}

// UpdateField sets a single field by name (smallest possible edit API).
// Supported: current_company, current_partner, current_module.
// current_document takes a JSON object: {"model": "...", "res_id": N, "action": "..."}
// pending_confirmation appends a PendingAction JSON object.
func (s *SessionMemoryStore) UpdateField(key, field string, value any) error {
	mem, err := s.Load(key)
	if err != nil {
		return err
	}
	if mem == nil {
		mem = &SessionMemory{Key: key}
	}
	switch field {
	case "current_company":
		if v, ok := value.(float64); ok {
			mem.CurrentCompany = int(v)
		}
	case "current_partner":
		if v, ok := value.(float64); ok {
			mem.CurrentPartner = int(v)
		}
	case "current_module":
		mem.CurrentModule = fmt.Sprintf("%v", value)
	case "current_document":
		if v, ok := value.(map[string]any); ok {
			doc := &DocumentContext{}
			if m, ok := v["model"].(string); ok {
				doc.Model = m
			}
			if r, ok := v["res_id"].(float64); ok {
				doc.ResID = int(r)
			}
			if a, ok := v["action"].(string); ok {
				doc.Action = a
			}
			mem.CurrentDocument = doc
		}
	case "pending_confirmation":
		if v, ok := value.(map[string]any); ok {
			pa := PendingAction{}
			if t, ok := v["tool"].(string); ok {
				pa.Tool = t
			}
			if args, ok := v["args"].(map[string]any); ok {
				pa.Args = args
			}
			if r, ok := v["reason"].(string); ok {
				pa.Reason = r
			}
			mem.PendingConfirm = append(mem.PendingConfirm, pa)
		}
	default:
		return fmt.Errorf("unknown session memory field: %s", field)
	}
	return s.Save(key, mem)
}

// ClearPendingConfirmations empties the pending confirmation queue.
func (s *SessionMemoryStore) ClearPendingConfirmations(key string) error {
	mem, err := s.Load(key)
	if err != nil {
		return err
	}
	if mem == nil {
		return nil
	}
	mem.PendingConfirm = nil
	return s.Save(key, mem)
}

// GetSessionSummary renders a compact prompt-injectable summary of the
// structured memory. Empty string when nothing relevant is set, so callers
// can skip injection entirely and save tokens.
func (s *SessionMemoryStore) GetSessionSummary(key string) string {
	mem, err := s.Load(key)
	if err != nil || mem == nil {
		return ""
	}
	var parts []string
	if mem.CurrentCompany > 0 {
		parts = append(parts, fmt.Sprintf("current company: %d", mem.CurrentCompany))
	}
	if mem.CurrentPartner > 0 {
		parts = append(parts, fmt.Sprintf("current partner: %d", mem.CurrentPartner))
	}
	if mem.CurrentDocument != nil && mem.CurrentDocument.Model != "" {
		parts = append(parts, fmt.Sprintf("current document: %s/%d (%s)",
			mem.CurrentDocument.Model, mem.CurrentDocument.ResID, mem.CurrentDocument.Action))
	}
	if mem.CurrentModule != "" {
		parts = append(parts, fmt.Sprintf("current module: %s", mem.CurrentModule))
	}
	for _, p := range mem.PendingConfirm {
		parts = append(parts, fmt.Sprintf("pending confirmation: %s (%s)", p.Tool, p.Reason))
	}
	if len(parts) == 0 {
		return ""
	}
	return "session: " + strings.Join(parts, "; ")
}
