package voice

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/logger"
)

// Transcriber turns an audio file into text through any OpenAI-compatible
// /v1/audio/transcriptions endpoint (Phonon, faster-whisper server, OpenAI).
//
// The endpoint is configuration, not code: OdooClaw stays model-agnostic and a
// local server costs nothing per request. An empty BaseURL means transcription
// is disabled, so callers can check once with IsAvailable.
type Transcriber struct {
	baseURL  string
	model    string
	apiKey   string
	language string
	client   *http.Client
}

// TranscriptionResponse is the subset of the OpenAI response we rely on.
type TranscriptionResponse struct {
	Text     string  `json:"text"`
	Language string  `json:"language,omitempty"`
	Duration float64 `json:"duration,omitempty"`
}

// NewTranscriber builds a transcriber from the voice.stt config block. It
// returns nil when no endpoint is configured.
func NewTranscriber(cfg config.STTConfig) *Transcriber {
	base := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if base == "" {
		return nil
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = "whisper-1"
	}
	return &Transcriber{
		baseURL:  base,
		model:    model,
		apiKey:   cfg.APIKey,
		language: strings.TrimSpace(cfg.Language),
		client:   &http.Client{Timeout: 120 * time.Second},
	}
}

// IsAvailable reports whether a usable endpoint is configured.
func (t *Transcriber) IsAvailable() bool {
	return t != nil && t.baseURL != ""
}

// Transcribe uploads the audio file and returns the transcript.
func (t *Transcriber) Transcribe(ctx context.Context, audioFilePath string) (*TranscriptionResponse, error) {
	if !t.IsAvailable() {
		return nil, fmt.Errorf("no transcription endpoint configured")
	}

	audioFile, err := os.Open(audioFilePath)
	if err != nil {
		return nil, fmt.Errorf("open audio file: %w", err)
	}
	defer audioFile.Close()

	fileInfo, err := audioFile.Stat()
	if err != nil {
		return nil, fmt.Errorf("stat audio file: %w", err)
	}

	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)
	part, err := writer.CreateFormFile("file", filepath.Base(audioFilePath))
	if err != nil {
		return nil, fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, audioFile); err != nil {
		return nil, fmt.Errorf("copy audio content: %w", err)
	}
	if err := writer.WriteField("model", t.model); err != nil {
		return nil, fmt.Errorf("write model field: %w", err)
	}
	if err := writer.WriteField("response_format", "json"); err != nil {
		return nil, fmt.Errorf("write response_format field: %w", err)
	}
	if t.language != "" {
		if err := writer.WriteField("language", t.language); err != nil {
			return nil, fmt.Errorf("write language field: %w", err)
		}
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("close multipart writer: %w", err)
	}

	url := t.baseURL + "/audio/transcriptions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &requestBody)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if t.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+t.apiKey)
	}

	logger.DebugCF("voice", "Sending transcription request", map[string]any{
		"url":         url,
		"model":       t.model,
		"bytes":       requestBody.Len(),
		"file_bytes":  fileInfo.Size(),
		"has_api_key": t.apiKey != "",
	})

	started := time.Now()
	resp, err := t.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("transcribe request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		logger.ErrorCF("voice", "Transcription API error", map[string]any{
			"status_code": resp.StatusCode,
			"response":    string(body),
		})
		return nil, fmt.Errorf("transcribe failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result TranscriptionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	result.Text = strings.TrimSpace(result.Text)

	logger.InfoCF("voice", "Transcription completed", map[string]any{
		"model":    t.model,
		"chars":    len(result.Text),
		"language": result.Language,
		"elapsed":  time.Since(started).String(),
	})

	return &result, nil
}
