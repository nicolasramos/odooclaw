package proactive

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Deliverer sends an unsolicited offer to a user's private Odoo Discuss chat.
//
// Why this type exists as a separate thing from the human-reply path:
//
// The normal reply path (OdooChannel.Send) threads a SINGLE-USE reply token that
// Odoo mints when a human writes to the bot, and the Odoo controller rejects any
// reply that cannot present one. That gate is deliberate and correct — it is
// what makes sudo().message_post() safe on /odooclaw/reply. Its consequence, by
// construction, is that a reply to a message nobody sent is impossible: no human
// message, no token, no reply.
//
// Proactivity needs the opposite flow, so it cannot reuse that token. It uses a
// separate, explicitly opt-in service credential (the same X-OdooClaw-Token
// shared secret the webhook already uses, configured on both sides), sent to a
// dedicated endpoint that only ever posts to the bot's own private chat with the
// user. The single-use token stays exactly as it is: the solicited path is not
// weakened, and unsolicited writes are confined to one narrow, auditable route.
type Deliverer struct {
	// endpoint is the full Odoo URL, e.g. "http://odoo:8069/odooclaw/notify".
	endpoint string
	// token is the shared secret presented as X-OdooClaw-Token.
	token string
	client *http.Client
	// OnDelivered, when set, is called after a successful delivery — used to
	// commit the cooldown only once the message actually left.
	OnDelivered func(sig Signal, d Decision)
}

// NewDeliverer builds a Deliverer. A nil client gets a 10s timeout.
func NewDeliverer(endpoint, token string, client *http.Client) *Deliverer {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &Deliverer{endpoint: endpoint, token: token, client: client}
}

// notifyPayload is the body of POST /odooclaw/notify.
type notifyPayload struct {
	// UserID is the Odoo res.users id to deliver to. The endpoint resolves the
	// private channel from it and refuses to post anywhere else.
	UserID int `json:"user_id"`
	// Message is the rendered offer.
	Message string `json:"message"`
	// PlaybookID and Area are carried for auditability in Odoo's logs.
	PlaybookID string `json:"playbook_id"`
	Area       string `json:"area"`
	// Source marks this as a proactive intervention, never a reply.
	Source string `json:"source"`
}

// Deliver sends the offer. It returns an error on any non-2xx response so the
// caller can avoid recording a cooldown for a message that never arrived.
func (d *Deliverer) Deliver(ctx context.Context, sig Signal, dec Decision) error {
	if !dec.Speak {
		return fmt.Errorf("refusing to deliver a silent decision")
	}
	if strings.TrimSpace(d.endpoint) == "" {
		return fmt.Errorf("proactive endpoint not configured")
	}

	body, err := json.Marshal(notifyPayload{
		UserID:     sig.UserID,
		Message:    dec.Message,
		PlaybookID: dec.PlaybookID,
		Area:       sig.Area,
		Source:     "proactive",
	})
	if err != nil {
		return fmt.Errorf("failed to encode proactive payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.endpoint, strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if d.token != "" {
		req.Header.Set("X-OdooClaw-Token", d.token)
	}

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("proactive delivery failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		// Read a bounded slice of the body for the log — never the whole thing.
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("odoo rejected proactive delivery: status=%d body=%s",
			resp.StatusCode, strings.TrimSpace(string(detail)))
	}

	slog.Info("Proactive intervention delivered",
		"user_id", sig.UserID, "area", sig.Area,
		"playbook", dec.PlaybookID, "count", dec.Count)

	// Commit the cooldown only now: a failed delivery must not silence the
	// assistant for the next 24 hours.
	if d.OnDelivered != nil {
		d.OnDelivered(sig, dec)
	}
	return nil
}
