// OdooClaw - Ultra-lightweight personal AI agent
// Inspired by and based on nanobot: https://github.com/HKUDS/nanobot
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package channels

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/logger"
)

// SystemHandler handles module sync events from Odoo via the /system endpoint.
// It implements WebhookHandler so the Manager registers it on the shared HTTP
// server alongside the channel webhook handlers.
type SystemHandler struct {
	workspace       string
	token           string
	reloadValidator func() error
}

// SystemEvent is the payload Odoo sends to the /system endpoint.
type SystemEvent struct {
	Event   string `json:"event"`
	Content string `json:"content,omitempty"`
}

// ErrEmptyContent is returned when a modules_md_rebuild event carries no content.
var ErrEmptyContent = errors.New("empty content")

// NewSystemHandler creates a SystemHandler.
//
// workspace is the directory where MODULES.md is written on a rebuild event.
// token is the expected X-OdooClaw-Token header value; an empty token disables
// authentication (matching the OdooChannel webhook behaviour).
// reloadValidator is invoked on a modules_changed event to rebuild the MCP tool
// validator; it may be nil to make modules_changed a no-op.
func NewSystemHandler(workspace, token string, reloadValidator func() error) *SystemHandler {
	return &SystemHandler{
		workspace:       workspace,
		token:           token,
		reloadValidator: reloadValidator,
	}
}

// WebhookPath returns the mount path for this handler.
func (h *SystemHandler) WebhookPath() string {
	return "/system"
}

// ServeHTTP handles module sync events. Only POST is allowed. The request is
// authenticated with the X-OdooClaw-Token header when a token is configured.
func (h *SystemHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Verify token if configured (same contract as OdooChannel).
	if h.token != "" && r.Header.Get("X-OdooClaw-Token") != h.token {
		logger.WarnCF("channels", "Rejected system event: invalid token", map[string]any{
			"remote": r.RemoteAddr,
		})
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var ev SystemEvent
	if err := json.Unmarshal(body, &ev); err != nil {
		logger.ErrorCF("channels", "Failed to parse system event", map[string]any{
			"error": err.Error(),
		})
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	switch ev.Event {
	case "modules_md_rebuild":
		if err := h.rebuildModulesMD(ev.Content); err != nil {
			logger.ErrorCF("channels", "Failed to rebuild MODULES.md", map[string]any{
				"error": err.Error(),
			})
			http.Error(w, "Failed to rebuild MODULES.md", http.StatusInternalServerError)
			return
		}
	case "modules_changed":
		if h.reloadValidator != nil {
			if err := h.reloadValidator(); err != nil {
				logger.ErrorCF("channels", "Failed to reload MCP tool validator", map[string]any{
					"error": err.Error(),
				})
				http.Error(w, "Failed to reload validator", http.StatusInternalServerError)
				return
			}
		}
	default:
		logger.WarnCF("channels", "Unknown system event", map[string]any{
			"event": ev.Event,
		})
		http.Error(w, "Unknown event", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

// rebuildModulesMD writes the module list to MODULES.md in the workspace.
func (h *SystemHandler) rebuildModulesMD(content string) error {
	if strings.TrimSpace(content) == "" {
		return ErrEmptyContent
	}
	path := filepath.Join(h.workspace, "MODULES.md")
	return os.WriteFile(path, []byte(content), 0o644)
}
