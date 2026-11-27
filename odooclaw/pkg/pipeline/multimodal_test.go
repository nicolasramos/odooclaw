package pipeline

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestOmniClientReadsAnImage(t *testing.T) {
	var got map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Errorf("missing bearer token")
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"Factura de Acme, total 121,00 EUR"}}]}`))
	}))
	defer server.Close()
	client := NewOmniClient(server.URL, "secret", "LFM3-Omni-2B-MLX-4bit", 5*time.Second)
	data := base64.StdEncoding.EncodeToString([]byte("png"))
	text, err := client.Read(context.Background(), Attachment{Name: "f.png", MimeType: "image/png", Data: data})
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if !strings.Contains(text, "121,00") {
		t.Fatalf("unexpected text %q", text)
	}
	if got["model"] != "LFM3-Omni-2B-MLX-4bit" {
		t.Fatalf("wrong model %v", got["model"])
	}
	content := got["messages"].([]any)[0].(map[string]any)["content"].([]any)
	part := content[1].(map[string]any)
	if part["type"] != "image_url" {
		t.Fatalf("expected image_url, got %v", part["type"])
	}
	url := part["image_url"].(map[string]any)["url"].(string)
	if !strings.HasPrefix(url, "data:image/png;base64,") {
		t.Fatalf("wrong data url %q", url)
	}
}

func TestOmniClientReadsAudio(t *testing.T) {
	var got map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"El cliente pide el estado de su pedido."}}]}`))
	}))
	defer server.Close()
	client := NewOmniClient(server.URL, "", "omni", time.Second)
	text, err := client.Read(context.Background(), Attachment{Name: "voz.ogg", MimeType: "audio/ogg", Data: "YXVkaW8="})
	if err != nil || !strings.Contains(text, "estado") {
		t.Fatalf("read=%q err=%v", text, err)
	}
	content := got["messages"].([]any)[0].(map[string]any)["content"].([]any)
	part := content[1].(map[string]any)
	audio := part["input_audio"].(map[string]any)
	if part["type"] != "input_audio" || audio["format"] != "ogg" {
		t.Fatalf("wrong audio part %v", part)
	}
}

func TestOmniClientReportsHttpErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusBadGateway)
	}))
	defer server.Close()
	client := NewOmniClient(server.URL, "", "omni", time.Second)
	if _, err := client.Read(context.Background(), Attachment{Name: "a", MimeType: "image/png", Data: "x"}); err == nil {
		t.Fatal("expected an error")
	}
}

func TestReadAttachmentsKeepsGoingAfterAFailure(t *testing.T) {
	p := NewAgentProcessor(nil, nil)
	p.WithAttachments(fakeReader{texts: map[string]string{"voz.ogg": "Transcripcion"}})
	text := p.readAttachments(context.Background(), []Attachment{
		{Name: "foto.png", MimeType: "image/png", Data: "x"},
		{Name: "voz.ogg", MimeType: "audio/ogg", Data: "y"},
	})
	if !strings.Contains(text, "no se pudo leer") || !strings.Contains(text, "Transcripcion") {
		t.Fatalf("unexpected %q", text)
	}
}

type fakeReader struct{ texts map[string]string }

func (f fakeReader) Read(_ context.Context, a Attachment) (string, error) {
	if text, ok := f.texts[a.Name]; ok {
		return text, nil
	}
	return "", context.DeadlineExceeded
}
