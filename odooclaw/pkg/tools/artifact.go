package tools

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

// ArtifactCreateTool stores something the assistant built as a named Odoo
// artifact, so the conversation is not the only place it exists.
//
// The tool is deliberately dumb: it validates presence, posts, and reports the
// id. The record, its ownership and its privacy rule live in Odoo.
type ArtifactCreateTool struct {
	baseURL string
	token   string
	client  *http.Client
}

func NewArtifactCreateTool(baseURL, token string) *ArtifactCreateTool {
	return &ArtifactCreateTool{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (t *ArtifactCreateTool) Name() string { return "artifact_create" }

func (t *ArtifactCreateTool) Description() string {
	return "Save something you produced in the conversation (a summary, a table, a code " +
		"snippet, a small chart) as a named artifact in Odoo, so the user can find it " +
		"later. Call it when the user asks to keep it or clearly wants it stored. Pass " +
		"the content as HTML."
}

func (t *ArtifactCreateTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"name": map[string]any{
				"type":        "string",
				"description": "Short, human title",
			},
			"artifact_type": map[string]any{
				"type":        "string",
				"enum":        []string{"document", "table", "code", "chart", "other"},
				"description": "Kind of artifact; document if unsure",
			},
			"content": map[string]any{
				"type":        "string",
				"description": "The artifact itself, as HTML",
			},
			"tags": map[string]any{
				"type":        "string",
				"description": "Optional comma-separated tags",
			},
			"user_id": map[string]any{
				"type":        "integer",
				"description": "Odoo user id who asked for it, when known",
			},
		},
		"required": []string{"name", "content"},
	}
}

func (t *ArtifactCreateTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	name, _ := args["name"].(string)
	content, _ := args["content"].(string)
	name = strings.TrimSpace(name)
	content = strings.TrimSpace(content)
	if name == "" || content == "" {
		return ErrorResult("name and content are required")
	}
	payload := map[string]any{
		"name":          name,
		"artifact_type": args["artifact_type"],
		"content":       content,
	}
	if tags, _ := args["tags"].(string); strings.TrimSpace(tags) != "" {
		payload["tags"] = tags
	}
	switch v := args["user_id"].(type) {
	case int:
		payload["user_id"] = v
	case float64:
		payload["user_id"] = int(v)
	case json.Number:
		if n, err := v.Int64(); err == nil {
			payload["user_id"] = n
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return ErrorResult(err.Error())
	}
	url := t.baseURL + "/odooclaw/artifact"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return ErrorResult(err.Error())
	}
	req.Header.Set("Content-Type", "application/json")
	if t.token != "" {
		req.Header.Set("X-OdooClaw-Token", t.token)
	}
	resp, err := t.client.Do(req)
	if err != nil {
		return ErrorResult(fmt.Sprintf("could not reach Odoo to save the artifact: %v", err))
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode >= 300 {
		return ErrorResult(fmt.Sprintf("Odoo refused the artifact (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw))))
	}
	var out struct {
		ID int `json:"id"`
	}
	_ = json.Unmarshal(raw, &out)
	if out.ID == 0 {
		return NewToolResult("Artifact saved.")
	}
	return NewToolResult(fmt.Sprintf("Artifact '%s' saved with id %d.", name, out.ID))
}
