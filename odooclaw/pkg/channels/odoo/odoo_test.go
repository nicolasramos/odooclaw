package odoo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

func TestServeHTTP_IgnoresGroupWhenDisabled(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: false}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":101,"model":"discuss.channel","res_id":15,"author_id":3,"author_user_id":3,"author_name":"Mitchell","body":"@odooclaw hola","is_dm":false,"reply_token":"tok-101"}`
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()

	channel.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d", w.Code, http.StatusOK)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if msg, ok := messageBus.ConsumeInbound(ctx); ok {
		t.Fatalf("expected no inbound message, got %+v", msg)
	}
}

func TestServeHTTP_AllowsGroupWhenEnabled(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: true}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":102,"model":"discuss.channel","res_id":25,"author_id":7,"author_user_id":8,"author_name":"Mitchell Admin","body":"@odooclaw asigna tarea","is_dm":false,"company_id":1,"allowed_company_ids":[1,2],"reply_token":"tok-102"}`
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()

	channel.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d", w.Code, http.StatusOK)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	msg, ok := messageBus.ConsumeInbound(ctx)
	if !ok {
		t.Fatal("expected inbound message")
	}

	if msg.ChatID != "discuss.channel_25" {
		t.Fatalf("ChatID = %q, want %q", msg.ChatID, "discuss.channel_25")
	}
	if msg.SenderID != "8" {
		t.Fatalf("SenderID = %q, want %q", msg.SenderID, "8")
	}
	if msg.Peer.Kind != "group" {
		t.Fatalf("Peer.Kind = %q, want %q", msg.Peer.Kind, "group")
	}
}

func TestServeHTTP_GroupMentionWithPrivateReplyTargetUsesDirectSession(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: true}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":104,"model":"discuss.channel","res_id":99,"reply_model":"discuss.channel","reply_res_id":1234,"author_id":33,"author_user_id":44,"author_name":"Mitchell Admin","body":"@odooclaw crea tarea","is_dm":false,"reply_token":"tok-104"}`
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()

	channel.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d", w.Code, http.StatusOK)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	msg, ok := messageBus.ConsumeInbound(ctx)
	if !ok {
		t.Fatal("expected inbound message")
	}

	if msg.ChatID != "discuss.channel_1234" {
		t.Fatalf("ChatID = %q, want %q", msg.ChatID, "discuss.channel_1234")
	}
	if msg.Peer.Kind != "direct" {
		t.Fatalf("Peer.Kind = %q, want %q", msg.Peer.Kind, "direct")
	}
	if msg.Peer.ID != "44" {
		t.Fatalf("Peer.ID = %q, want %q", msg.Peer.ID, "44")
	}
}

func TestServeHTTP_AllowsDMEvenWhenGroupDisabled(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: false}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":103,"model":"discuss.channel","res_id":30,"author_id":11,"author_user_id":12,"author_name":"Demo User","body":"necesito ayuda","is_dm":true,"reply_token":"tok-103"}`
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()

	channel.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d", w.Code, http.StatusOK)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	msg, ok := messageBus.ConsumeInbound(ctx)
	if !ok {
		t.Fatal("expected inbound message")
	}

	if msg.Peer.Kind != "direct" {
		t.Fatalf("Peer.Kind = %q, want %q", msg.Peer.Kind, "direct")
	}
	if msg.SenderID != "12" {
		t.Fatalf("SenderID = %q, want %q", msg.SenderID, "12")
	}
}

func TestBuildReplyEndpoint_TargetDBPriority(t *testing.T) {
	got := buildReplyEndpoint("http://odoo:8069", "devel", "otherdb")
	want := "http://odoo:8069/odooclaw/reply?db=devel"
	if got != want {
		t.Fatalf("buildReplyEndpoint() = %q, want %q", got, want)
	}
}

func TestBuildReplyEndpoint_FallbackEnvDB(t *testing.T) {
	got := buildReplyEndpoint("http://odoo:8069/", "", "devel")
	want := "http://odoo:8069/odooclaw/reply?db=devel"
	if got != want {
		t.Fatalf("buildReplyEndpoint() = %q, want %q", got, want)
	}
}

func TestBuildReplyEndpoint_NoDB(t *testing.T) {
	got := buildReplyEndpoint("http://odoo:8069", "", "")
	want := "http://odoo:8069/odooclaw/reply"
	if got != want {
		t.Fatalf("buildReplyEndpoint() = %q, want %q", got, want)
	}
}

// ---------------------------------------------------------------------------
// System webhook: POST /webhook/odoo/system
// ---------------------------------------------------------------------------

const testSystemContent = "# Installed Odoo Modules\n\n## account\nAccounting\n"

func newSystemTestChannel(t *testing.T, cfg config.OdooConfig, workspace string) (*OdooChannel, *bus.MessageBus, *int) {
	t.Helper()
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(cfg, messageBus, workspace)
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	resetCalls := 0
	channel.SetAllowlistCacheResetter(func(ctx context.Context) error {
		resetCalls++
		return nil
	})
	return channel, messageBus, &resetCalls
}

func doSystemRequest(t *testing.T, channel *OdooChannel, method, path, body, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("X-OdooClaw-Token", token)
	}
	w := httptest.NewRecorder()
	channel.ServeHTTP(w, req)
	return w
}

func TestSystemWebhook_ModulesChanged_ReturnsOKAndResets(t *testing.T) {
	channel, _, resetCalls := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_changed"}`, "")

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if strings.TrimSpace(w.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("body = %q, want {\"status\":\"ok\"}", w.Body.String())
	}
	if *resetCalls != 1 {
		t.Fatalf("allowlist cache reset calls = %d, want 1", *resetCalls)
	}
}

func TestSystemWebhook_ConfigChanged_ResetsRegardlessOfKeys(t *testing.T) {
	channel, _, resetCalls := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())

	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"config_changed","keys":["odooclaw.denied_models"]}`, "")
	if w.Code != http.StatusOK {
		t.Fatalf("with keys: status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if *resetCalls != 1 {
		t.Fatalf("with keys: reset calls = %d, want 1", *resetCalls)
	}

	w = doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"config_changed"}`, "")
	if w.Code != http.StatusOK {
		t.Fatalf("without keys: status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if *resetCalls != 2 {
		t.Fatalf("without keys: reset calls = %d, want 2 (must invalidate regardless of keys)", *resetCalls)
	}
}

func TestSystemWebhook_ModulesMD_WritesVerbatim(t *testing.T) {
	workspace := t.TempDir()
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, workspace)

	payload, err := json.Marshal(OdooSystemWebhookPayload{Event: "modules_md_rebuild", Content: testSystemContent})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", string(payload), "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}

	got, err := os.ReadFile(filepath.Join(workspace, "memory", "MODULES.md"))
	if err != nil {
		t.Fatalf("MODULES.md not written: %v", err)
	}
	if string(got) != testSystemContent {
		t.Fatalf("MODULES.md content mismatch:\n got %q\nwant %q", string(got), testSystemContent)
	}
}

func TestSystemWebhook_ModulesMD_OverwritesCompleteFile(t *testing.T) {
	workspace := t.TempDir()
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, workspace)

	first := `{"event":"modules_md_rebuild","content":"# First\n"}`
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", first, "")
	if w.Code != http.StatusOK {
		t.Fatalf("first write status = %d, want 200", w.Code)
	}

	second := `{"event":"modules_md_rebuild","content":"# Second\nNew content\n"}`
	w = doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", second, "")
	if w.Code != http.StatusOK {
		t.Fatalf("second write status = %d, want 200", w.Code)
	}

	got, err := os.ReadFile(filepath.Join(workspace, "memory", "MODULES.md"))
	if err != nil {
		t.Fatalf("MODULES.md not written: %v", err)
	}
	want := "# Second\nNew content\n"
	if string(got) != want {
		t.Fatalf("MODULES.md not overwritten: got %q, want %q", string(got), want)
	}
}

func TestSystemWebhook_ModulesMD_MissingContent_400(t *testing.T) {
	workspace := t.TempDir()
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, workspace)

	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_md_rebuild"}`, "")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}

	if _, err := os.Stat(filepath.Join(workspace, "memory", "MODULES.md")); !os.IsNotExist(err) {
		t.Fatalf("MODULES.md should not exist after 400; stat err = %v", err)
	}
}

func TestSystemWebhook_UnknownEvent_400(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"evento_desconocido"}`, "")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
}

func TestSystemWebhook_MissingEvent_400(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{}`, "")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
}

func TestSystemWebhook_MalformedJSON_400(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{not-json`, "")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
}

func TestSystemWebhook_InvalidToken_401_NoSideEffects(t *testing.T) {
	workspace := t.TempDir()
	channel, _, resetCalls := newSystemTestChannel(t, config.OdooConfig{WebhookToken: "secret"}, workspace)

	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_changed"}`, "wrong")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body=%s", w.Code, w.Body.String())
	}
	if *resetCalls != 0 {
		t.Fatalf("reset calls = %d, want 0 (no side effect on 401)", *resetCalls)
	}

	w = doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_md_rebuild","content":"# X\n"}`, "wrong")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body=%s", w.Code, w.Body.String())
	}
	if _, err := os.Stat(filepath.Join(workspace, "memory", "MODULES.md")); !os.IsNotExist(err) {
		t.Fatalf("MODULES.md should not exist after 401; stat err = %v", err)
	}
}

func TestSystemWebhook_ValidToken_Accepted(t *testing.T) {
	channel, _, resetCalls := newSystemTestChannel(t, config.OdooConfig{WebhookToken: "secret"}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_changed"}`, "secret")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if *resetCalls != 1 {
		t.Fatalf("reset calls = %d, want 1", *resetCalls)
	}
}

func TestSystemWebhook_NonPost_405(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		w := doSystemRequest(t, channel, method, "/webhook/odoo/system", ``, "")
		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s status = %d, want 405", method, w.Code)
		}
	}
}

func TestSystemWebhook_PathDispatchedFromServeHTTP(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())

	// System path on the SAME handler must route to the system webhook,
	// not to the chat webhook (which would 400 on missing reply_token).
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_changed"}`, "")
	if w.Code != http.StatusOK {
		t.Fatalf("system path status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if strings.TrimSpace(w.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("system path body = %q, want {\"status\":\"ok\"}", w.Body.String())
	}
}

func TestSystemWebhook_NoReplyTokenRequired(t *testing.T) {
	// The whole point: system events carry no reply_token.
	channel, _, resetCalls := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"config_changed","keys":["odooclaw.denied_models"]}`, "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (no reply_token required); body=%s", w.Code, w.Body.String())
	}
	if *resetCalls != 1 {
		t.Fatalf("reset calls = %d, want 1", *resetCalls)
	}
}

func TestWebhookExtraPaths_IncludesSystemPath(t *testing.T) {
	channel, _, _ := newSystemTestChannel(t, config.OdooConfig{}, t.TempDir())
	paths := channel.WebhookExtraPaths()
	if len(paths) != 1 || paths[0] != "/webhook/odoo/system" {
		t.Fatalf("WebhookExtraPaths() = %v, want [/webhook/odoo/system]", paths)
	}
}

func TestSystemWebhook_ResetterErrorDoesNotFailRequest(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	channel.SetAllowlistCacheResetter(func(ctx context.Context) error {
		return context.DeadlineExceeded
	})
	w := doSystemRequest(t, channel, http.MethodPost, "/webhook/odoo/system", `{"event":"modules_changed"}`, "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (TTL 60s remains fallback); body=%s", w.Code, w.Body.String())
	}
}
