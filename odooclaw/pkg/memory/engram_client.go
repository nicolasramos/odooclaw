package memory

import "context"

type EngramSaveInput struct {
	Title    string
	Type     string
	Content  string
	Project  string
	Scope    string
	TopicKey string
}

type EngramSearchInput struct {
	Query   string
	Project string
	Scope   string
	Type    string
	Limit   int
}

type EngramSearchResult struct {
	Title   string
	Type    string
	Content string
	Score   float64
}

type EngramSessionStartInput struct {
	ID        string
	Directory string
}

type EngramSessionSummaryInput struct {
	SessionID string
	Content   string
}

// EngramClient defines the strategic-memory boundary for OdooClaw.
// Implementations may use Engram MCP, HTTP, or CLI adapters. The default MVP
// client is a no-op so OdooClaw never depends on an Engram runtime at startup.
type EngramClient interface {
	StartSession(ctx context.Context, input EngramSessionStartInput) error
	Save(ctx context.Context, input EngramSaveInput) error
	Search(ctx context.Context, input EngramSearchInput) ([]EngramSearchResult, error)
	SummarizeSession(ctx context.Context, input EngramSessionSummaryInput) error
}

type NoopEngramClient struct{}

func NewNoopEngramClient() NoopEngramClient {
	return NoopEngramClient{}
}

func (NoopEngramClient) StartSession(context.Context, EngramSessionStartInput) error {
	return nil
}

func (NoopEngramClient) Save(context.Context, EngramSaveInput) error {
	return nil
}

func (NoopEngramClient) Search(context.Context, EngramSearchInput) ([]EngramSearchResult, error) {
	return nil, nil
}

func (NoopEngramClient) SummarizeSession(context.Context, EngramSessionSummaryInput) error {
	return nil
}
