package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OmniClient reads attachments with an OpenAI-compatible multimodal model: a
// picture becomes a description with its data, a voice note becomes a
// transcript with the customer's request. It is deliberately a separate step
// from the agent: the agent gets text, one brain for every modality.
type OmniClient struct {
	BaseURL string
	APIKey  string
	Model   string
	HTTP    *http.Client
}

func NewOmniClient(baseURL, apiKey, model string, timeout time.Duration) *OmniClient {
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &OmniClient{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		Model:   model,
		HTTP:    &http.Client{Timeout: timeout},
	}
}

const (
	imagePrompt = "Eres un extractor documental. Describe la imagen y extrae todos los datos visibles: proveedor, CIF, numero de documento, fecha, base, IVA, total y lineas. Devuelve texto plano, maximo 800 caracteres. No inventes nada."
	audioPrompt = "Transcribe literalmente el audio (en espanol) y resume en una frase que pide el cliente. Devuelve texto plano, maximo 800 caracteres."
)

func (c *OmniClient) Read(ctx context.Context, attachment Attachment) (string, error) {
	if strings.TrimSpace(attachment.Data) == "" {
		return "", fmt.Errorf("empty attachment")
	}
	var part map[string]any
	var prompt string
	switch {
	case strings.HasPrefix(attachment.MimeType, "image/"):
		prompt = imagePrompt
		part = map[string]any{
			"type":      "image_url",
			"image_url": map[string]any{"url": "data:" + attachment.MimeType + ";base64," + attachment.Data},
		}
	case strings.HasPrefix(attachment.MimeType, "audio/"):
		prompt = audioPrompt
		part = map[string]any{
			"type": "input_audio",
			"input_audio": map[string]any{
				"data":   attachment.Data,
				"format": audioFormat(attachment.MimeType),
			},
		}
	default:
		return "", fmt.Errorf("unsupported attachment type %q", attachment.MimeType)
	}
	payload := map[string]any{
		"model": c.Model,
		"messages": []map[string]any{
			{"role": "user", "content": []any{
				map[string]any{"type": "text", "text": prompt},
				part,
			}},
		},
		"max_tokens":           700,
		"chat_template_kwargs": map[string]any{"enable_thinking": false},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		detail := strings.TrimSpace(string(raw))
		if len(detail) > 200 {
			detail = detail[:200]
		}
		return "", fmt.Errorf("multimodal model returned %s: %s", resp.Status, detail)
	}
	var completion struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &completion); err != nil {
		return "", err
	}
	if len(completion.Choices) == 0 {
		return "", fmt.Errorf("multimodal model returned no choices")
	}
	return strings.TrimSpace(completion.Choices[0].Message.Content), nil
}

func audioFormat(mimeType string) string {
	switch {
	case strings.Contains(mimeType, "mpeg"), strings.Contains(mimeType, "mp3"):
		return "mp3"
	case strings.Contains(mimeType, "ogg"):
		return "ogg"
	case strings.Contains(mimeType, "mp4"), strings.Contains(mimeType, "m4a"):
		return "m4a"
	case strings.Contains(mimeType, "webm"):
		return "webm"
	default:
		return "wav"
	}
}
