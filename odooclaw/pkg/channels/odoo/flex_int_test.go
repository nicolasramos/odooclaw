package odoo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

// The Odoo module serialises empty relations as `false`
// (`author_user_id: message.author_id.user_ids[:1].id or False`). A bare false
// used to fail the whole decode and the message was dropped before the agent
// saw it, which is how an invoice attachment disappeared without a reply.
func TestWebhookPayload_AcceptsFalseForIntegerFields(t *testing.T) {
	body := `{"message_id":508,"model":"discuss.channel","res_id":3,` +
		`"reply_res_id":false,"author_id":7,"author_user_id":false,` +
		`"author_name":"Mitchell Admin","body":"@odooclaw factura adjunta",` +
		`"is_dm":false,"reply_token":"tok-508"}`

	var payload OdooWebhookPayload
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}
	if payload.MessageID != 508 {
		t.Errorf("MessageID = %d, want 508", payload.MessageID)
	}
	if payload.AuthorUserID != 0 {
		t.Errorf("AuthorUserID = %d, want 0", payload.AuthorUserID)
	}
	if payload.AuthorID != 7 {
		t.Errorf("AuthorID = %d, want 7", payload.AuthorID)
	}
}

func TestWebhookPayload_FlexIntAcceptsVariants(t *testing.T) {
	cases := map[string]FlexInt{
		`5`:     5,
		`"5"`:   5,
		`null`:  0,
		`false`: 0,
		`true`:  0,
		`"5.0"`: 0, // not an integer: decode error, value untouched is fine
	}
	for raw, want := range cases {
		var got FlexInt
		err := json.Unmarshal([]byte(raw), &got)
		if raw == `"5.0"` {
			if err == nil {
				t.Errorf("%s: expected an error", raw)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: unexpected error %v", raw, err)
			continue
		}
		if got != want {
			t.Errorf("%s: got %d, want %d", raw, got, want)
		}
	}
}

// End to end through ServeHTTP: the message must reach the bus, not be dropped.
func TestServeHTTP_ProcessesMessageWhenAuthorUserIDIsFalse(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: true}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":509,"model":"discuss.channel","res_id":3,"author_id":7,` +
		`"author_user_id":false,"author_name":"Mitchell Admin",` +
		`"body":"factura adjunta","is_dm":false,"reply_token":"tok-509"}`
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()

	channel.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d", w.Code, http.StatusOK)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	msg, ok := messageBus.ConsumeInbound(ctx)
	if !ok {
		t.Fatal("expected an inbound message, got none: the webhook was dropped")
	}
	if msg.Content != "factura adjunta" {
		t.Errorf("Content = %q, want %q", msg.Content, "factura adjunta")
	}
}
