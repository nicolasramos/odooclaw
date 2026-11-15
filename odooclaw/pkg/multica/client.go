// Package multica is the HTTP client that opens an issue in a Multica project.
//
// It is the "mouth → hands" cable: when a client writes in their own Odoo
// Discuss, the OdooClaw engine files that request in the client's Multica
// project so the development chain can pick it up. The client is deliberately
// narrow — one endpoint, one call — and every failure is returned as an error
// for the caller to log; nothing here panics or retries on its own.
package multica

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

// DefaultTimeout bounds a single API call. The cable runs off the request
// path, so a slow Multica must never hold anything open.
const DefaultTimeout = 10 * time.Second

// Config points the client at one Multica deployment and project.
type Config struct {
	BaseURL   string
	Token     string
	ProjectID string
	Timeout   time.Duration // 0 → DefaultTimeout
}

// Client creates issues over the Multica HTTP API.
type Client struct {
	baseURL string
	token   string
	client  *http.Client
}

// IssueRequest is the payload for one new issue.
type IssueRequest struct {
	Title       string
	Description string
	ProjectID   string
}

// Issue is the subset of the created issue the engine needs to log and trace.
type Issue struct {
	ID         string `json:"id"`
	Identifier string `json:"identifier"`
	Number     int    `json:"number"`
}

func New(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	return &Client{
		baseURL: strings.TrimSuffix(cfg.BaseURL, "/"),
		token:   cfg.Token,
		client:  &http.Client{Timeout: timeout},
	}
}

// CreateIssue files one issue in the configured project. A non-2xx response
// or an unparsable body is returned as an error carrying the status and a
// bounded slice of the body, mirroring how the Odoo channel logs reply
// rejections.
func (c *Client) CreateIssue(ctx context.Context, req IssueRequest) (*Issue, error) {
	payload := map[string]string{
		"title":       req.Title,
		"description": req.Description,
		"project_id":  req.ProjectID,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("multica: encode issue request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/issues", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("multica: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("multica: request failed: %w", err)
	}
	defer resp.Body.Close()

	// The API echoes the full description back, so the response is bounded
	// by the request size, not by a fixed small cap: reading only a slice
	// truncates the JSON and turns a successful creation into a decode
	// error. 64 KB is far above any single-issue response.
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("multica api error: %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var issue Issue
	if err := json.Unmarshal(respBody, &issue); err != nil {
		return nil, fmt.Errorf("multica: decode response: %w", err)
	}
	return &issue, nil
}
