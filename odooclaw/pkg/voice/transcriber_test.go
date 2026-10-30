package voice

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/config"
)

// The transcriber must talk to whatever OpenAI-compatible endpoint is
// configured, not to a hardcoded provider.
func TestTranscriberPostsToConfiguredEndpoint(t *testing.T) {
	var gotPath, gotModel, gotLang, gotAuth, gotFile string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			t.Errorf("multipart: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		gotModel = r.FormValue("model")
		gotLang = r.FormValue("language")
		file, header, err := r.FormFile("file")
		if err == nil {
			defer file.Close()
			body, _ := io.ReadAll(file)
			gotFile = header.Filename + ":" + string(body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"  Apunta dos horas en la tarea 45.  ","language":"es"}`))
	}))
	defer srv.Close()

	dir := t.TempDir()
	audio := filepath.Join(dir, "nota.wav")
	if err := os.WriteFile(audio, []byte("RIFFfake"), 0o600); err != nil {
		t.Fatal(err)
	}

	tr := NewTranscriber(config.STTConfig{
		Provider: "phonon",
		BaseURL:  srv.URL + "/v1",
		Model:    "phonon-2.5",
		APIKey:   "secret",
		Language: "es",
	})
	if tr == nil || !tr.IsAvailable() {
		t.Fatal("transcriber should be available")
	}

	res, err := tr.Transcribe(context.Background(), audio)
	if err != nil {
		t.Fatalf("transcribe: %v", err)
	}
	if res.Text != "Apunta dos horas en la tarea 45." {
		t.Errorf("text not trimmed: %q", res.Text)
	}
	if gotPath != "/v1/audio/transcriptions" {
		t.Errorf("path = %q", gotPath)
	}
	if gotModel != "phonon-2.5" || gotLang != "es" {
		t.Errorf("model/lang = %q/%q", gotModel, gotLang)
	}
	if gotAuth != "Bearer secret" {
		t.Errorf("auth = %q", gotAuth)
	}
	if !strings.HasPrefix(gotFile, "nota.wav:RIFFfake") {
		t.Errorf("file part = %q", gotFile)
	}
}

func TestTranscriberDisabledWithoutBaseURL(t *testing.T) {
	if NewTranscriber(config.STTConfig{}) != nil {
		t.Fatal("no base_url must disable transcription")
	}
	if tr := NewTranscriber(config.STTConfig{BaseURL: "  "}); tr != nil {
		t.Fatal("blank base_url must disable transcription")
	}
}

func TestTranscriberReportsHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("boom"))
	}))
	defer srv.Close()

	dir := t.TempDir()
	audio := filepath.Join(dir, "a.wav")
	_ = os.WriteFile(audio, []byte("x"), 0o600)

	tr := NewTranscriber(config.STTConfig{BaseURL: srv.URL})
	_, err := tr.Transcribe(context.Background(), audio)
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected 500 error, got %v", err)
	}
}
