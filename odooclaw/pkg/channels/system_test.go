// OdooClaw - Ultra-lightweight personal AI agent
// Inspired by and based on nanobot: https://github.com/HKUDS/nanobot
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package channels

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestSystemHandler(t *testing.T, token string, reload func() error) (*SystemHandler, string) {
	t.Helper()
	dir := t.TempDir()
	h := NewSystemHandler(dir, token, reload)
	return h, dir
}

func doSystemRequest(h *SystemHandler, method, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, h.WebhookPath(), bytes.NewBufferString(body))
	if token != "" {
		req.Header.Set("X-OdooClaw-Token", token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestSystemHandler_InvalidToken(t *testing.T) {
	h, _ := newTestSystemHandler(t, "secret", nil)
	rec := doSystemRequest(h, http.MethodPost, "wrong", `{"event":"modules_md_rebuild","content":"x"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestSystemHandler_UnknownEvent(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"bogus"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSystemHandler_EmptyContent(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"modules_md_rebuild","content":""}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestSystemHandler_MethodNotAllowed(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodGet, "", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
}

func TestSystemHandler_InvalidJSON(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodPost, "", `{not json`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSystemHandler_ModulesMDRebuild(t *testing.T) {
	h, dir := newTestSystemHandler(t, "", nil)
	content := "# Modules\n\n- sale\n- stock\n"
	payload, err := json.Marshal(SystemEvent{Event: "modules_md_rebuild", Content: content})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	rec := doSystemRequest(h, http.MethodPost, "", string(payload))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	data, err := os.ReadFile(filepath.Join(dir, "MODULES.md"))
	if err != nil {
		t.Fatalf("MODULES.md not written: %v", err)
	}
	if string(data) != content {
		t.Fatalf("MODULES.md content mismatch:\n got %q\nwant %q", string(data), content)
	}
}

func TestSystemHandler_ModulesChanged_ReloadsValidator(t *testing.T) {
	var reloaded bool
	h, _ := newTestSystemHandler(t, "", func() error {
		reloaded = true
		return nil
	})
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"modules_changed"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !reloaded {
		t.Fatal("expected reloadValidator to be called")
	}
}

func TestSystemHandler_ModulesChanged_ReloadError(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", func() error {
		return errors.New("reload failed")
	})
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"modules_changed"}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestSystemHandler_ModulesChanged_NoReloader(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"modules_changed"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestSystemHandler_WebhookPath(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	if got := h.WebhookPath(); got != "/system" {
		t.Fatalf("expected /system, got %q", got)
	}
}

func TestSystemHandler_ValidToken(t *testing.T) {
	h, _ := newTestSystemHandler(t, "secret", nil)
	rec := doSystemRequest(h, http.MethodPost, "secret", `{"event":"modules_md_rebuild","content":"x"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestSystemHandler_WhitespaceContentRejected(t *testing.T) {
	h, _ := newTestSystemHandler(t, "", nil)
	rec := doSystemRequest(h, http.MethodPost, "", `{"event":"modules_md_rebuild","content":"   "}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "MODULES.md") {
		t.Fatalf("expected error mentioning MODULES.md, got %q", rec.Body.String())
	}
}
