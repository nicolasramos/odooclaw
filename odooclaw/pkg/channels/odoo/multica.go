package odoo

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/multica"
)

// multicaCable files every accepted client message as exactly one issue in
// the client's Multica project. It is the mouth → hands cable: the Odoo
// Discuss message is the input, the Multica issue is the output. Nothing
// else lives here — staging, branches and PRs belong to later tasks.
type multicaCable struct {
	client    *multica.Client
	projectID string
	targetDB  string
	// seen holds the messages already filed (or being filed). The mark is
	// set before the HTTP call so concurrent retries collapse into one, and
	// released on failure so a resend after Multica recovers still files
	// the request — a message must never be lost to a transient outage.
	seen sync.Map
}

// SetMultica arms the cable for this channel. The cable stays off unless the
// instance is fully configured, so a half-configured deploy changes nothing.
func (c *OdooChannel) SetMultica(cfg config.MulticaConfig) {
	if !cfg.Enabled || cfg.BaseURL == "" || cfg.Token == "" || cfg.ProjectID == "" {
		return
	}
	c.multica = &multicaCable{
		client: multica.New(multica.Config{
			BaseURL:   cfg.BaseURL,
			Token:     cfg.Token,
			ProjectID: cfg.ProjectID,
		}),
		projectID: cfg.ProjectID,
		targetDB:  c.config.TargetDB,
	}
	slog.Info("multica cable armed", "project_id", cfg.ProjectID, "base_url", cfg.BaseURL)
}

// dispatchMultica fires the cable off the request path: the webhook response
// and the conversation never wait for Multica, and a Multica outage can never
// break the chat.
func (c *OdooChannel) dispatchMultica(payload OdooWebhookPayload) {
	cable := c.multica
	if cable == nil {
		return
	}
	key := cable.dedupKey(payload)
	if _, duplicate := cable.seen.LoadOrStore(key, struct{}{}); duplicate {
		slog.Info("multica cable: message already filed, skipping duplicate",
			"message_id", payload.MessageID, "model", payload.Model, "res_id", payload.ResID)
		return
	}
	go cable.file(key, payload)
}

func (cb *multicaCable) dedupKey(payload OdooWebhookPayload) string {
	return fmt.Sprintf("%s|%s|%d|%d", cb.targetDB, payload.Model, payload.ResID, payload.MessageID)
}

// file creates the Multica issue for one message. It runs in its own
// goroutine with its own context: the webhook request context is already
// cancelled by the time this runs.
func (cb *multicaCable) file(key string, payload OdooWebhookPayload) {
	defer func() {
		if r := recover(); r != nil {
			cb.seen.Delete(key)
			slog.Error("multica cable: panic while filing client request",
				"panic", r, "message_id", payload.MessageID)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	issue, err := cb.client.CreateIssue(ctx, multica.IssueRequest{
		Title:       cb.title(payload),
		Description: cb.description(payload),
		ProjectID:   cb.projectID,
	})
	if err != nil {
		// Release the dedupe mark: the message was not filed, and a resend
		// (or any later delivery of the same message) must still be able to.
		cb.seen.Delete(key)
		slog.Error("multica cable: could not file client request",
			"error", err,
			"message_id", payload.MessageID,
			"model", payload.Model,
			"res_id", payload.ResID,
			"project_id", cb.projectID)
		return
	}
	slog.Info("multica cable: client request filed",
		"issue", issue.Identifier,
		"message_id", payload.MessageID,
		"model", payload.Model,
		"res_id", payload.ResID)
}

func (cb *multicaCable) title(payload OdooWebhookPayload) string {
	sender := strings.TrimSpace(payload.AuthorName)
	if sender == "" {
		sender = fmt.Sprintf("user %d", cb.authorID(payload))
	}
	title := fmt.Sprintf("Client request from %s — %s #%d", sender, payload.Model, payload.ResID)
	if len(title) > 200 {
		title = title[:200]
	}
	return title
}

// description carries the three things the acceptance criteria demand: the
// literal message text, the sender, and the channel it arrived in.
func (cb *multicaCable) description(payload OdooWebhookPayload) string {
	peerKind := "group"
	if payload.IsDM {
		peerKind = "direct"
	}
	db := cb.targetDB
	if db == "" {
		db = "-"
	}
	var sb strings.Builder
	sb.WriteString("Message received in the client's Odoo Discuss.\n\n")
	fmt.Fprintf(&sb, "- Sender: %s (odoo user %d)\n", payload.AuthorName, cb.authorID(payload))
	fmt.Fprintf(&sb, "- Channel: %s #%d (%s)\n", payload.Model, payload.ResID, peerKind)
	fmt.Fprintf(&sb, "- Database: %s\n", db)
	fmt.Fprintf(&sb, "- Odoo message id: %d\n", payload.MessageID)
	sb.WriteString("\n---\n\n")
	sb.WriteString(payload.Body)
	return sb.String()
}

func (cb *multicaCable) authorID(payload OdooWebhookPayload) int {
	if id := int(payload.AuthorUserID); id > 0 {
		return id
	}
	return payload.AuthorID
}
