package memory

import (
	"context"
	"errors"
	"testing"
)

type fakeEngramClient struct {
	saves []EngramSaveInput
	err   error
}

func (f *fakeEngramClient) StartSession(context.Context, EngramSessionStartInput) error {
	return nil
}

func (f *fakeEngramClient) Save(_ context.Context, input EngramSaveInput) error {
	f.saves = append(f.saves, input)
	return f.err
}

func (f *fakeEngramClient) Search(context.Context, EngramSearchInput) ([]EngramSearchResult, error) {
	return nil, nil
}

func (f *fakeEngramClient) SummarizeSession(context.Context, EngramSessionSummaryInput) error {
	return nil
}

func TestMemoryRouterDoesNotCallEngramWhenDisabled(t *testing.T) {
	client := &fakeEngramClient{}
	router := NewMemoryRouter(false, client)

	result, err := router.Save(context.Background(), RoutedMemoryInput{
		Route:   MemoryRouteStrategic,
		Title:   "Architecture decision",
		Type:    "decision",
		Content: "Use Engram for strategic memory only.",
	})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}
	if result.Saved {
		t.Fatal("expected disabled Engram route not to persist")
	}
	if len(client.saves) != 0 {
		t.Fatalf("expected no Engram calls, got %d", len(client.saves))
	}
}

func TestMemoryRouterRoutesStrategicMemoryToEngram(t *testing.T) {
	client := &fakeEngramClient{}
	router := NewMemoryRouter(true, client)

	result, err := router.Save(context.Background(), RoutedMemoryInput{
		Route:    MemoryRouteStrategic,
		Title:    "Fixed scoped memory leakage",
		Type:     "bugfix",
		Content:  "**What**: Fixed leakage.\n**Why**: Scope isolation.",
		Project:  "odooclaw",
		Scope:    "project",
		TopicKey: "bugfix/scoped-memory-leakage",
	})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}
	if !result.Saved {
		t.Fatal("expected strategic memory to be saved")
	}
	if len(client.saves) != 1 {
		t.Fatalf("expected one Engram save, got %d", len(client.saves))
	}
	if client.saves[0].TopicKey != "bugfix/scoped-memory-leakage" {
		t.Fatalf("TopicKey = %q", client.saves[0].TopicKey)
	}
}

func TestMemoryRouterKeepsOperationalMemoryLocal(t *testing.T) {
	client := &fakeEngramClient{}
	router := NewMemoryRouter(true, client)

	result, err := router.Save(context.Background(), RoutedMemoryInput{
		Route:   MemoryRouteOperational,
		Content: "Current chat is reviewing invoice INV/2026/001.",
	})
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}
	if result.Destination != string(MemoryRouteOperational) {
		t.Fatalf("Destination = %q", result.Destination)
	}
	if len(client.saves) != 0 {
		t.Fatalf("expected no Engram calls for operational memory, got %d", len(client.saves))
	}
}

func TestMemoryRouterReturnsEngramErrors(t *testing.T) {
	wantErr := errors.New("engram unavailable")
	client := &fakeEngramClient{err: wantErr}
	router := NewMemoryRouter(true, client)

	_, err := router.Save(context.Background(), RoutedMemoryInput{
		Route:   MemoryRouteStrategic,
		Content: "Strategic memory should report Engram failures.",
	})
	if !errors.Is(err, wantErr) {
		t.Fatalf("Save() error = %v, want %v", err, wantErr)
	}
}
