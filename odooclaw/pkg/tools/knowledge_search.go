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

// KnowledgeSearchTool searches the company knowledge base (OCA document pages)
// through Odoo.
//
// The contract with the model is the citation: every hit carries the page name
// and its link, and the instructions say to cite the page used. An answer a
// person cannot open is an answer they cannot check.
type KnowledgeSearchTool struct {
	baseURL string
	token   string
	client  *http.Client
}

func NewKnowledgeSearchTool(baseURL, token string) *KnowledgeSearchTool {
	return &KnowledgeSearchTool{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (t *KnowledgeSearchTool) Name() string { return "knowledge_search" }

func (t *KnowledgeSearchTool) Description() string {
	return "Search the company knowledge base before answering questions about " +
		"policies, procedures or how things are done here. Pass the words a person " +
		"would search. Cite the page name and link of every fact you take from a " +
		"result; if nothing matches, say so instead of guessing."
}

func (t *KnowledgeSearchTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"query": map[string]any{
				"type":        "string",
				"description": "Words to look for in the page title or content",
			},
			"limit": map[string]any{
				"type":        "integer",
				"description": "How many pages to return, at most 20. Default 5.",
			},
		},
		"required": []string{"query"},
	}
}

type knowledgeHit struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Snippet    string `json:"snippet"`
	BackendURL string `json:"backend_url"`
	Updated    string `json:"updated"`
}

func (t *KnowledgeSearchTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	query, _ := args["query"].(string)
	query = strings.TrimSpace(query)
	if query == "" {
		return ErrorResult("query is required")
	}
	payload := map[string]any{"query": query}
	switch v := args["limit"].(type) {
	case int:
		payload["limit"] = v
	case float64:
		payload["limit"] = int(v)
	case json.Number:
		if n, err := v.Int64(); err == nil {
			payload["limit"] = n
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return ErrorResult(err.Error())
	}
	url := t.baseURL + "/odooclaw/knowledge/search"
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
		return ErrorResult(fmt.Sprintf("could not reach the knowledge base: %v", err))
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return ErrorResult(fmt.Sprintf("knowledge search refused (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw))))
	}
	var out struct {
		Results []knowledgeHit `json:"results"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return ErrorResult("unparseable knowledge answer: " + err.Error())
	}
	if len(out.Results) == 0 {
		return NewToolResult(fmt.Sprintf("No knowledge page matches %q. Do not invent an answer.", query))
	}
	var b strings.Builder
	fmt.Fprintf(&b, "Knowledge pages matching %q:\n", query)
	for index, hit := range out.Results {
		fmt.Fprintf(&b, "\n%d. %s (id %d)\n", index+1, hit.Name, hit.ID)
		if hit.Snippet != "" {
			fmt.Fprintf(&b, "%s\n", hit.Snippet)
		}
		if hit.BackendURL != "" {
			fmt.Fprintf(&b, "Link: %s\n", hit.BackendURL)
		}
		if hit.Updated != "" {
			fmt.Fprintf(&b, "Updated: %s\n", hit.Updated)
		}
	}
	return NewToolResult(b.String())
}
