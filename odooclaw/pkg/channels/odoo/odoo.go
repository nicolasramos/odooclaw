package odoo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"sync"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/utils"
)

type OdooChannel struct {
	*channels.BaseChannel
	config        config.OdooConfig
	client        *http.Client
	pendingTokens sync.Map // replyChatID -> replyToken (string), single-use
}

type OdooWebhookPayload struct {
	MessageID         int    `json:"message_id"`
	Model             string `json:"model"`
	ResID             int    `json:"res_id"`
	ReplyModel        string `json:"reply_model"`
	ReplyResID        int    `json:"reply_res_id"`
	AuthorID          int    `json:"author_id"`
	AuthorUserID      int    `json:"author_user_id"`
	AuthorName        string `json:"author_name"`
	Body              string `json:"body"`
	IsDM              bool   `json:"is_dm"`
	CompanyID         int    `json:"company_id"`
	AllowedCompanyIDs []int  `json:"allowed_company_ids"`
	ReplyToken        string `json:"reply_token,omitempty"`
}

type OdooReplyPayload struct {
	Model      string `json:"model"`
	ResID      int    `json:"res_id"`
	Message    string `json:"message"`
	ReplyToken string `json:"reply_token,omitempty"`
}

func NewOdooChannel(cfg config.OdooConfig, messageBus *bus.MessageBus) (*OdooChannel, error) {
	base := channels.NewBaseChannel("odoo", cfg, messageBus, cfg.AllowFrom,
		channels.WithReasoningChannelID(cfg.ReasoningChannelID),
	)

	ch := &OdooChannel{
		BaseChannel: base,
		config:      cfg,
		client:      &http.Client{Timeout: 10 * time.Second},
	}

	base.SetOwner(ch)
	return ch, nil
}

func (c *OdooChannel) Start(ctx context.Context) error {
	c.SetRunning(true)
	slog.Info("Odoo channel started (Webhook Mode)")
	return nil
}

func (c *OdooChannel) Stop(ctx context.Context) error {
	c.SetRunning(false)
	return nil
}

func (c *OdooChannel) Send(ctx context.Context, msg bus.OutboundMessage) error {
	parts := strings.Split(msg.ChatID, "_")
	if len(parts) != 2 {
		return fmt.Errorf("invalid odoo chatID format: %s", msg.ChatID)
	}

	modelName := parts[0]
	resID, err := strconv.Atoi(parts[1])
	if err != nil {
		return fmt.Errorf("invalid res_id in chatID: %s", parts[1])
	}

	odooURL := os.Getenv("ODOO_URL")
	if odooURL == "" {
		slog.Warn("ODOO_URL env var not set, cannot send message back to Odoo")
		return nil
	}

	reply := OdooReplyPayload{
		Model:   modelName,
		ResID:   resID,
		Message: utils.RemoveReasoning(msg.Content),
	}

	// Include reply token if one was registered for this chatID (single-use)
	if token, ok := c.pendingTokens.LoadAndDelete(msg.ChatID); ok {
		reply.ReplyToken = token.(string)
	} else {
		// No token — Odoo would reject this reply anyway, skip LLM cost
		slog.Warn("No reply token for chatID, skipping send", "chatID", msg.ChatID)
		return nil
	}

	jsonData, err := json.Marshal(reply)
	if err != nil {
		return err
	}

	endpoint := buildReplyEndpoint(odooURL, c.config.TargetDB, os.Getenv("ODOO_DB"))
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	if token := os.Getenv("ODOOCLAW_REPLY_TOKEN"); token != "" {
		req.Header.Set("X-OdooClaw-Token", token)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		slog.Error("Failed to send message to Odoo", "error", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("Odoo returned non-200 status", "status", resp.StatusCode)
		return fmt.Errorf("odoo api error: %d", resp.StatusCode)
	}

	slog.Info("Message sent to Odoo successfully", "chatID", msg.ChatID)
	return nil
}

func buildReplyEndpoint(odooURL, targetDB, fallbackEnvDB string) string {
	endpoint := fmt.Sprintf("%s/odooclaw/reply", strings.TrimSuffix(odooURL, "/"))

	resolvedDB := strings.TrimSpace(targetDB)
	if resolvedDB == "" {
		resolvedDB = strings.TrimSpace(fallbackEnvDB)
	}

	if resolvedDB != "" {
		endpoint = fmt.Sprintf("%s?db=%s", endpoint, resolvedDB)
	}

	return endpoint
}

func (c *OdooChannel) WebhookPath() string {
	if c.config.WebhookPath != "" {
		return c.config.WebhookPath
	}
	return "/webhook/odoo"
}

func (c *OdooChannel) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify webhook token if configured
	token := r.Header.Get("X-OdooClaw-Token")
	if c.config.WebhookToken != "" && token != c.config.WebhookToken {
		slog.Warn("Rejected webhook: invalid token", "remote", r.RemoteAddr)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var payload OdooWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		slog.Error("Failed to parse Odoo webhook", "error", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if !payload.IsDM && !c.config.AllowGroupMentions {
		slog.Info("Ignoring Odoo group mention because allow_group_mentions is disabled", "model", payload.Model, "res_id", payload.ResID)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ignored","reason":"group_mentions_disabled"}`))
		return
	}

	sourceChatID := fmt.Sprintf("%s_%d", payload.Model, payload.ResID)
	replyModel := strings.TrimSpace(payload.ReplyModel)
	if replyModel == "" {
		replyModel = payload.Model
	}
	replyResID := payload.ReplyResID
	if replyResID <= 0 {
		replyResID = payload.ResID
	}
	replyChatID := fmt.Sprintf("%s_%d", replyModel, replyResID)
	hasPrivateReplyTarget := !payload.IsDM && payload.ReplyModel != "" && payload.ReplyResID > 0

	senderNumericID := payload.AuthorUserID
	if senderNumericID <= 0 {
		senderNumericID = payload.AuthorID
	}
	senderID := fmt.Sprintf("%d", senderNumericID)

	sender := bus.SenderInfo{
		Platform:    "odoo",
		PlatformID:  senderID,
		Username:    payload.AuthorName,
		DisplayName: payload.AuthorName,
	}

	peerKind := "group"
	peerID := sourceChatID
	if payload.IsDM || hasPrivateReplyTarget {
		peerKind = "direct"
		peerID = senderID
	}

	peer := bus.Peer{
		Kind: peerKind,
		ID:   peerID,
	}

	content := strings.TrimSpace(payload.Body)

	// Enrich message with record context when coming from a non-channel model
	if payload.Model != "" && payload.Model != "discuss.channel" && payload.ResID > 0 {
		content = fmt.Sprintf(
			"[Odoo Context: %s ID=%d]\n%s",
			payload.Model,
			payload.ResID,
			content,
		)
	}

	// Odoo filters mentions server-side before sending to the webhook.
	var mediaPaths []string
	metadata := map[string]string{
		"model":        payload.Model,
		"res_id":       strconv.Itoa(payload.ResID),
		"reply_model":  replyModel,
		"reply_res_id": strconv.Itoa(replyResID),
	}
	if payload.CompanyID > 0 {
		metadata["company_id"] = strconv.Itoa(payload.CompanyID)
	}
	if len(payload.AllowedCompanyIDs) > 0 {
		if b, err := json.Marshal(payload.AllowedCompanyIDs); err == nil {
			metadata["allowed_company_ids"] = string(b)
		}
	}

	// Reject webhook if no reply token — Odoo did not generate one
	if payload.ReplyToken == "" {
		slog.Warn("Rejected Odoo webhook: missing reply_token", "model", payload.Model, "res_id", payload.ResID)
		http.Error(w, "Missing reply_token", http.StatusBadRequest)
		return
	}
	c.pendingTokens.Store(replyChatID, payload.ReplyToken)

	c.HandleMessage(r.Context(), peer, strconv.Itoa(payload.MessageID), senderID, replyChatID, content, mediaPaths, metadata, sender)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
