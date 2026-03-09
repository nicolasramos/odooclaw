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

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/utils"
)

type OdooChannel struct {
	*channels.BaseChannel
	config config.OdooConfig
	client *http.Client
}

type OdooWebhookPayload struct {
	MessageID         int    `json:"message_id"`
	Model             string `json:"model"`
	ResID             int    `json:"res_id"`
	AuthorID          int    `json:"author_id"`
	AuthorUserID      int    `json:"author_user_id"`
	AuthorName        string `json:"author_name"`
	Body              string `json:"body"`
	IsDM              bool   `json:"is_dm"`
	CompanyID         int    `json:"company_id"`
	AllowedCompanyIDs []int  `json:"allowed_company_ids"`
}

type OdooReplyPayload struct {
	Model   string `json:"model"`
	ResID   int    `json:"res_id"`
	Message string `json:"message"`
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

	jsonData, err := json.Marshal(reply)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/odooclaw/reply", strings.TrimSuffix(odooURL, "/"))
	if odooDB := os.Getenv("ODOO_DB"); odooDB != "" {
		endpoint = fmt.Sprintf("%s?db=%s", endpoint, odooDB)
	}
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

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

	var payload OdooWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		slog.Error("Failed to parse Odoo webhook", "error", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	chatID := fmt.Sprintf("%s_%d", payload.Model, payload.ResID)
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
	if payload.IsDM {
		peerKind = "direct"
	}

	peer := bus.Peer{
		Kind: peerKind,
		ID:   chatID,
	}

	content := strings.TrimSpace(payload.Body)

	// Odoo filters mentions server-side before sending to the webhook.
	var mediaPaths []string
	metadata := map[string]string{
		"model":  payload.Model,
		"res_id": strconv.Itoa(payload.ResID),
	}
	if payload.CompanyID > 0 {
		metadata["company_id"] = strconv.Itoa(payload.CompanyID)
	}
	if len(payload.AllowedCompanyIDs) > 0 {
		if b, err := json.Marshal(payload.AllowedCompanyIDs); err == nil {
			metadata["allowed_company_ids"] = string(b)
		}
	}

	c.HandleMessage(r.Context(), peer, strconv.Itoa(payload.MessageID), senderID, chatID, content, mediaPaths, metadata, sender)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
