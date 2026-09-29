package agent

import (
	"strings"
	"testing"
)

// The marker is injected by mail_bot_odooclaw (models/mail_thread.py) when a
// user attaches a voice note to a channel message. These cases are copied from
// real production log lines.
func TestFindVoiceAttachment(t *testing.T) {
	cases := []struct {
		name    string
		message string
		wantID  int
		wantOK  bool
	}{
		{
			name:    "real production marker",
			message: "🎤 [Nota de voz: Voice-2026-09-29-3099.mp3 (ID: 48324)]",
			wantID:  48324,
			wantOK:  true,
		},
		{
			name:    "marker with surrounding text",
			message: "mira esto\n🎤 [Nota de voz: Voice-2026-09-29-3099.mp3 (ID: 48324)]\ny dime",
			wantID:  48324,
			wantOK:  true,
		},
		{
			name:    "marker with no space before the id",
			message: "🎤 [Nota de voz: nota.ogg (ID:77)]",
			wantID:  77,
			wantOK:  true,
		},
		{
			name:    "invoice marker must NOT match",
			message: "🧾 [Factura/Documento: factura.pdf (ID: 876)]",
			wantOK:  false,
		},
		{
			name:    "plain text",
			message: "dame el resumen de horas",
			wantOK:  false,
		},
		{
			name:    "empty",
			message: "",
			wantOK:  false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			id, ok := findVoiceAttachment(tc.message)
			if ok != tc.wantOK {
				t.Fatalf("ok = %v, want %v", ok, tc.wantOK)
			}
			if ok && id != tc.wantID {
				t.Fatalf("id = %d, want %d", id, tc.wantID)
			}
		})
	}
}

// The invoice matcher and the voice matcher must stay disjoint: a message with
// both attachments (possible in Odoo) must route to the right deterministic
// path, and neither marker may be mistaken for the other.
func TestVoiceAndInvoiceMarkersAreDisjoint(t *testing.T) {
	invoice := "🧾 [Factura/Documento: f.pdf (ID: 876)]"
	voice := "🎤 [Nota de voz: v.mp3 (ID: 48324)]"

	if _, ok := findVoiceAttachment(invoice); ok {
		t.Error("the invoice marker matched the voice matcher")
	}
	if _, ok := findInvoiceAttachment(voice); ok {
		t.Error("the voice marker matched the invoice matcher")
	}
	if _, ok := findInvoiceAttachment(invoice); !ok {
		t.Error("the invoice marker no longer matches its own matcher")
	}
	if _, ok := findVoiceAttachment(voice); !ok {
		t.Error("the voice marker no longer matches its own matcher")
	}
}

func TestParseVoiceTranscript(t *testing.T) {
	cases := []struct {
		name     string
		raw      string
		wantText string
		wantLang string
	}{
		{
			name:     "whisper-stt json payload (the real shape)",
			raw:      `{"success": true, "text": "Hola, hola, esto es una nota de voz. \u00bfPuedes procesarla?", "language": "es", "method": "whisper_api", "message": "Transcription complete."}`,
			wantText: "Hola, hola, esto es una nota de voz. ¿Puedes procesarla?",
			wantLang: "es",
		},
		{
			name:     "auto-detected language is preserved",
			raw:      `{"success": true, "text": "texto", "language": "auto-detected"}`,
			wantText: "texto",
			wantLang: "auto-detected",
		},
		{
			name:     "plain text fallback (a future server version)",
			raw:      "  solo texto plano  ",
			wantText: "solo texto plano",
		},
		{
			name:     "empty stays empty",
			raw:      "   ",
			wantText: "",
		},
		{
			name:     "explicit failure yields no transcript",
			raw:      `{"success": false, "text": "should not be used"}`,
			wantText: "",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			text, lang := parseVoiceTranscript(tc.raw)
			if text != tc.wantText {
				t.Errorf("text = %q, want %q", text, tc.wantText)
			}
			if lang != tc.wantLang {
				t.Errorf("language = %q, want %q", lang, tc.wantLang)
			}
		})
	}
}

func TestFormatVoiceTranscript(t *testing.T) {
	out := formatVoiceTranscript("¿Puedes procesarla?", "es")
	if !strings.Contains(out, "¿Puedes procesarla?") {
		t.Errorf("transcript missing from the rendered message: %q", out)
	}
	if !strings.Contains(out, "es") {
		t.Errorf("language missing: %q", out)
	}

	// "auto-detected" carries no information and must not be shown.
	auto := formatVoiceTranscript("hola", "auto-detected")
	if strings.Contains(auto, "auto-detected") {
		t.Errorf("auto-detected should not be rendered: %q", auto)
	}
	if !strings.Contains(auto, "hola") {
		t.Errorf("transcript missing: %q", auto)
	}
}
