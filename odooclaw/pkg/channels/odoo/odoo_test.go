package odoo

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

func TestServeHTTP_IgnoresGroupWhenDisabled(t *testing.T) {
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: false}, messageBus)
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":101,"model":"discuss.channel","res_id":15,"author_id":3,"author_user_id":3,"author_name":"Mitchell","body":"@odooclaw hola","is_dm":false}`
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
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: true}, messageBus)
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":102,"model":"discuss.channel","res_id":25,"author_id":7,"author_user_id":8,"author_name":"Mitchell Admin","body":"@odooclaw asigna tarea","is_dm":false,"company_id":1,"allowed_company_ids":[1,2]}`
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
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: true}, messageBus)
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":104,"model":"discuss.channel","res_id":99,"reply_model":"discuss.channel","reply_res_id":1234,"author_id":33,"author_user_id":44,"author_name":"Mitchell Admin","body":"@odooclaw crea tarea","is_dm":false}`
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
	channel, err := NewOdooChannel(config.OdooConfig{AllowGroupMentions: false}, messageBus)
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}

	body := `{"message_id":103,"model":"discuss.channel","res_id":30,"author_id":11,"author_user_id":12,"author_name":"Demo User","body":"necesito ayuda","is_dm":true}`
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
