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
)

// Long-term memory (NRA-511 / NG AGENTE 3): user preferences, company
// profile and system configuration that survive across sessions. Persisted
// as JSON under <memoryDir>/long_term/<name>.json. This is the local,
// always-available layer; Mnemosyne (MCP) is the semantic layer on top.
type LongTermStore struct {
	dir string
}

// UserPreferences holds durable communication preferences.
type UserPreferences struct {
	Language              string `json:"language,omitempty"`
	Timezone              string `json:"timezone,omitempty"`
	CommunicationStyle    string `json:"communication_style,omitempty"`
	PreferredUpdateFreq   string `json:"preferred_update_frequency,omitempty"`
	PreferredUpdateFormat string `json:"preferred_update_format,omitempty"`
	ContactMethod         string `json:"contact_method,omitempty"`
}

// CompanyProfile holds durable facts about the Odoo company.
type CompanyProfile struct {
	CompanyID       int      `json:"company_id,omitempty"`
	Name            string   `json:"name,omitempty"`
	FiscalNumber    string   `json:"fiscal_number,omitempty"`
	Industry        string   `json:"industry,omitempty"`
	ActiveModules   []string `json:"active_modules,omitempty"`
	DefaultCurrency string   `json:"default_currency,omitempty"`
	FiscalYearStart string   `json:"fiscal_year_start,omitempty"`
}

// SystemConfig holds durable deployment configuration.
type SystemConfig struct {
	OdooVersion     string   `json:"odoo_version,omitempty"`
	Database        string   `json:"database,omitempty"`
	WebhookURL      string   `json:"webhook_url,omitempty"`
	MCPToolsEnabled []string `json:"mcp_tools_enabled,omitempty"`
}

// NewLongTermStore creates the store under <memoryDir>/long_term.
func NewLongTermStore(memoryDir string) *LongTermStore {
	dir := filepath.Join(memoryDir, "long_term")
	os.MkdirAll(dir, 0o755)
	return &LongTermStore{dir: dir}
}

func (s *LongTermStore) path(name string) string {
	return filepath.Join(s.dir, name+".json")
}

func loadJSON[T any](path string) (*T, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var v T
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, err
	}
	return &v, nil
}

func saveJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// GetPreferences returns stored preferences (nil if none).
func (s *LongTermStore) GetPreferences() (*UserPreferences, error) {
	return loadJSON[UserPreferences](s.path("preferences"))
}

// UpdatePreference sets one preference field by key.
func (s *LongTermStore) UpdatePreference(key, value string) error {
	prefs, err := s.GetPreferences()
	if err != nil {
		return err
	}
	if prefs == nil {
		prefs = &UserPreferences{}
	}
	switch key {
	case "language":
		prefs.Language = value
	case "timezone":
		prefs.Timezone = value
	case "communication_style":
		prefs.CommunicationStyle = value
	case "preferred_update_frequency":
		prefs.PreferredUpdateFreq = value
	case "preferred_update_format":
		prefs.PreferredUpdateFormat = value
	case "contact_method":
		prefs.ContactMethod = value
	default:
		return fmt.Errorf("unknown preference: %s", key)
	}
	return saveJSON(s.path("preferences"), prefs)
}

// GetCompanyProfile returns stored company profile (nil if none).
func (s *LongTermStore) GetCompanyProfile() (*CompanyProfile, error) {
	return loadJSON[CompanyProfile](s.path("company_profile"))
}

// UpdateCompanyProfile replaces the company profile.
func (s *LongTermStore) UpdateCompanyProfile(profile *CompanyProfile) error {
	return saveJSON(s.path("company_profile"), profile)
}

// GetConfig returns stored system config (nil if none).
func (s *LongTermStore) GetConfig() (*SystemConfig, error) {
	return loadJSON[SystemConfig](s.path("system_config"))
}

// UpdateConfig replaces the system config.
func (s *LongTermStore) UpdateConfig(cfg *SystemConfig) error {
	return saveJSON(s.path("system_config"), cfg)
}

// BuildPromptContext renders a compact, always-injected block with the
// durable facts. Empty string when nothing is stored.
func (s *LongTermStore) BuildPromptContext() (string, error) {
	var parts []string

	prefs, err := s.GetPreferences()
	if err != nil {
		return "", err
	}
	if prefs != nil {
		if prefs.Language != "" {
			parts = append(parts, fmt.Sprintf("user language: %s", prefs.Language))
		}
		if prefs.Timezone != "" {
			parts = append(parts, fmt.Sprintf("user timezone: %s", prefs.Timezone))
		}
		if prefs.CommunicationStyle != "" {
			parts = append(parts, fmt.Sprintf("communication style: %s", prefs.CommunicationStyle))
		}
	}

	company, err := s.GetCompanyProfile()
	if err != nil {
		return "", err
	}
	if company != nil {
		if company.Name != "" {
			parts = append(parts, fmt.Sprintf("company: %s", company.Name))
		}
		if company.Industry != "" {
			parts = append(parts, fmt.Sprintf("industry: %s", company.Industry))
		}
		if len(company.ActiveModules) > 0 {
			parts = append(parts, fmt.Sprintf("active modules: %s", strings.Join(company.ActiveModules, ", ")))
		}
	}

	cfg, err := s.GetConfig()
	if err != nil {
		return "", err
	}
	if cfg != nil {
		if cfg.OdooVersion != "" {
			parts = append(parts, fmt.Sprintf("odoo version: %s", cfg.OdooVersion))
		}
	}

	if len(parts) == 0 {
		return "", nil
	}
	return "profile: " + strings.Join(parts, "; "), nil
}
