package odoo

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

// wantInvoiceRef is the attachment reference both payload shapes must yield
// for ir.attachment id 876 (NRA-5522 acceptance criterion).
const wantInvoiceRef = "media://odoo-attachment/876"

// postChatWebhook posts a chat webhook payload through the channel handler
// and returns the inbound message published on the bus.
func postChatWebhook(t *testing.T, body string) bus.InboundMessage {
	t.Helper()
	messageBus := bus.NewMessageBus()
	channel, err := NewOdooChannel(config.OdooConfig{}, messageBus, t.TempDir())
	if err != nil {
		t.Fatalf("NewOdooChannel() error = %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/webhook/odoo", strings.NewReader(body))
	w := httptest.NewRecorder()
	channel.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ServeHTTP() status = %d, want %d (body %s)", w.Code, http.StatusOK, w.Body.String())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	msg, ok := messageBus.ConsumeInbound(ctx)
	if !ok {
		t.Fatal("expected inbound message on the bus")
	}
	return msg
}

// oldPayload is what modules installed before the document-intake change
// send: no structured arrays, the attachment id only appears in the body
// text marker injected by mail_bot_odooclaw.
const oldPayload = `{"message_id":301,"model":"discuss.channel","res_id":40,` +
	`"reply_model":"discuss.channel","reply_res_id":40,` +
	`"author_id":7,"author_user_id":8,"author_name":"Mitchell Admin",` +
	`"body":"@odooclaw procesa esta factura\n\n🧾 [Factura/Documento: factura_demo_odoo.pdf (ID: 876)]\n",` +
	`"is_dm":true,"company_id":1,"reply_token":"tok-301"}`

// newPayload is what mail_bot_odooclaw sends since NRA-4504: the same body
// marker plus the structured attachment arrays.
const newPayload = `{"message_id":302,"model":"discuss.channel","res_id":40,` +
	`"reply_model":"discuss.channel","reply_res_id":40,` +
	`"author_id":7,"author_user_id":8,"author_name":"Mitchell Admin",` +
	`"body":"@odooclaw procesa esta factura\n\n🧾 [Factura/Documento: factura_demo_odoo.pdf (ID: 876)]\n",` +
	`"is_dm":true,"company_id":1,"reply_token":"tok-302",` +
	`"invoice_attachments":[{"id":876,"name":"factura_demo_odoo.pdf","mimetype":"application/pdf"}],` +
	`"voice_attachments":[],"attachments":[]}`

func TestWebhook_OldPayload_TextMarkerYieldsAttachmentRef(t *testing.T) {
	msg := postChatWebhook(t, oldPayload)

	want := []string{wantInvoiceRef}
	if !reflect.DeepEqual(msg.Media, want) {
		t.Fatalf("Media = %v, want %v", msg.Media, want)
	}
}

func TestWebhook_NewPayload_StructuredArraysYieldAttachmentRef(t *testing.T) {
	msg := postChatWebhook(t, newPayload)

	want := []string{wantInvoiceRef}
	if !reflect.DeepEqual(msg.Media, want) {
		t.Fatalf("Media = %v, want %v", msg.Media, want)
	}
}

// TestWebhook_OldAndNewPayload_ProduceSameAttachmentRef is the acceptance
// criterion of NRA-5522: an old payload (text marker only) and a new payload
// (structured arrays) must produce the same attachment reference, so the
// vision pipeline receives the attachment as media either way.
func TestWebhook_OldAndNewPayload_ProduceSameAttachmentRef(t *testing.T) {
	oldMsg := postChatWebhook(t, oldPayload)
	newMsg := postChatWebhook(t, newPayload)

	if len(oldMsg.Media) == 0 {
		t.Fatal("old payload produced no attachment reference")
	}
	if !reflect.DeepEqual(oldMsg.Media, newMsg.Media) {
		t.Fatalf("payload shapes disagree: old Media = %v, new Media = %v", oldMsg.Media, newMsg.Media)
	}
}
