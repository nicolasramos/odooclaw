package browsercopilot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	defaultInternalURL = "http://browser-copilot:8765"
	defaultToken       = "dev-token"
	resolvePath        = "/browser-copilot/context/resolve"
	pairCreatePath     = "/browser-copilot/pairing/create"
)

type ResolveRequest struct {
	Channel  string `json:"channel"`
	ChatID   string `json:"chat_id"`
	SenderID string `json:"sender_id,omitempty"`
}

type PairingCreateRequest struct {
	Channel  string `json:"channel"`
	ChatID   string `json:"chat_id"`
	SenderID string `json:"sender_id,omitempty"`
}

type PairingCodeResponse struct {
	OK        bool   `json:"ok"`
	Code      string `json:"code"`
	ExpiresAt string `json:"expires_at"`
	Channel   string `json:"channel"`
	ChatID    string `json:"chat_id"`
}

type AppDetection struct {
	Detected           string   `json:"detected"`
	Model              string   `json:"model,omitempty"`
	RecordID           *int     `json:"record_id,omitempty"`
	ViewType           string   `json:"view_type,omitempty"`
	ChatterVisible     bool     `json:"chatter_visible"`
	FieldsVisible      []string `json:"fields_visible,omitempty"`
	MainButtonsVisible []string `json:"main_buttons_visible,omitempty"`
	ProbableRecordName string   `json:"probable_record_name,omitempty"`
	Confidence         float64  `json:"confidence"`
}

type ContextResponse struct {
	Found              bool           `json:"found"`
	SharedAt           string         `json:"shared_at,omitempty"`
	AgeSeconds         *int           `json:"age_seconds,omitempty"`
	PageURL            string         `json:"page_url,omitempty"`
	PageTitle          string         `json:"page_title,omitempty"`
	Domain             string         `json:"domain,omitempty"`
	App                AppDetection   `json:"app,omitempty"`
	Headings           []string       `json:"headings,omitempty"`
	Breadcrumbs        []string       `json:"breadcrumbs,omitempty"`
	VisibleFields      []string       `json:"visible_fields,omitempty"`
	MainButtons        []string       `json:"main_buttons,omitempty"`
	VisibleTextSummary string         `json:"visible_text_summary,omitempty"`
	VisibleTables      []VisibleTable `json:"visible_tables,omitempty"`
}

type VisibleTable struct {
	ID       string     `json:"id"`
	Title    string     `json:"title,omitempty"`
	Headers  []string   `json:"headers,omitempty"`
	Rows     [][]string `json:"rows,omitempty"`
	Footer   []string   `json:"footer,omitempty"`
	RowCount int        `json:"row_count,omitempty"`
}

type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func NewClientFromEnv() *Client {
	baseURL := strings.TrimSpace(os.Getenv("BROWSER_COPILOT_INTERNAL_URL"))
	if baseURL == "" {
		baseURL = defaultInternalURL
	}
	baseURL = strings.TrimRight(baseURL, "/")

	token := strings.TrimSpace(os.Getenv("BROWSER_COPILOT_TOKEN"))
	if token == "" {
		token = defaultToken
	}

	return &Client{
		baseURL:    baseURL,
		token:      token,
		httpClient: &http.Client{Timeout: 2 * time.Second},
	}
}

func (c *Client) ResolveContext(
	ctx context.Context,
	req ResolveRequest,
) (ContextResponse, error) {
	if c == nil || strings.TrimSpace(c.baseURL) == "" {
		return ContextResponse{}, fmt.Errorf("browser copilot client not configured")
	}
	payload, err := json.Marshal(req)
	if err != nil {
		return ContextResponse{}, err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+resolvePath,
		bytes.NewReader(payload),
	)
	if err != nil {
		return ContextResponse{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Browser-Copilot-Token", c.token)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return ContextResponse{}, err
	}
	defer resp.Body.Close()

	var body ContextResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return ContextResponse{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return ContextResponse{}, fmt.Errorf("browser copilot resolve failed: %d", resp.StatusCode)
	}
	return body, nil
}

func (c *Client) CreatePairing(
	ctx context.Context,
	req PairingCreateRequest,
) (PairingCodeResponse, error) {
	if c == nil || strings.TrimSpace(c.baseURL) == "" {
		return PairingCodeResponse{}, fmt.Errorf("browser copilot client not configured")
	}
	payload, err := json.Marshal(req)
	if err != nil {
		return PairingCodeResponse{}, err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+pairCreatePath,
		bytes.NewReader(payload),
	)
	if err != nil {
		return PairingCodeResponse{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Browser-Copilot-Token", c.token)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return PairingCodeResponse{}, err
	}
	defer resp.Body.Close()

	var body PairingCodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return PairingCodeResponse{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return PairingCodeResponse{}, fmt.Errorf("browser copilot pairing failed: %d", resp.StatusCode)
	}
	return body, nil
}
