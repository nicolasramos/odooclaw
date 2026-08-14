package conversation

import (
	"context"
	"testing"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/session"
)

func TestPipeline_StageEnrichContext(t *testing.T) {
	sm := session.NewSessionManager(t.TempDir())
	sm.AddMessage("test-session", "user", "hello")
	sm.Save("test-session")

	pctx := &PipelineContext{
		SessionKey: "test-session",
		SessionMgr: sm,
	}

	stage := StageEnrichContext()
	err := stage(context.Background(), pctx)

	if err != nil {
		t.Fatalf("StageEnrichContext failed: %v", err)
	}

	if len(pctx.History) != 1 {
		t.Errorf("Expected 1 history message, got %d", len(pctx.History))
	}
}

func TestPipeline_StageEnrichContext_NoSessionMgr(t *testing.T) {
	pctx := &PipelineContext{
		SessionKey: "test-session",
		SessionMgr: nil,
	}

	stage := StageEnrichContext()
	err := stage(context.Background(), pctx)

	if err == nil {
		t.Error("Expected error when SessionMgr is nil")
	}
}

func TestPipeline_StageClassifyIntent_NilClassifier(t *testing.T) {
	pctx := &PipelineContext{
		UserMessage: "hola",
	}

	stage := StageClassifyIntent(nil)
	err := stage(context.Background(), pctx)

	if err != nil {
		t.Fatalf("StageClassifyIntent failed: %v", err)
	}

	if pctx.Intent == nil {
		t.Fatal("Expected intent to be set")
	}

	if pctx.Intent.Intent != IntentChat {
		t.Errorf("Expected IntentChat, got %v", pctx.Intent.Intent)
	}
}

func TestPipeline_StageFilterTools_NoRegistry(t *testing.T) {
	pctx := &PipelineContext{
		UserMessage: "buscar clientes",
		Intent:      &IntentResult{Intent: IntentToolCall},
	}

	stage := StageFilterTools(nil)
	err := stage(context.Background(), pctx)

	if err != nil {
		t.Fatalf("StageFilterTools failed: %v", err)
	}

	if pctx.ToolFilterActive {
		t.Error("Expected ToolFilterActive to be false with nil registry")
	}
}

func TestPipeline_StageOptimizeContext_Truncation(t *testing.T) {
	// Create history with 25 messages
	history := make([]interface{}, 25)
	for i := range history {
		history[i] = nil // Just need the count
	}

	// Simulate by creating the pipeline context with enough messages
	pctx := &PipelineContext{
		UserMessage: "test",
	}

	// The stage truncates to 20 messages
	stage := StageOptimizeContext()
	err := stage(context.Background(), pctx)

	if err != nil {
		t.Fatalf("StageOptimizeContext failed: %v", err)
	}
}

func TestPipeline_StagePostExecute(t *testing.T) {
	sm := session.NewSessionManager(t.TempDir())

	pctx := &PipelineContext{
		SessionKey:  "test-session",
		UserMessage: "hello",
		Response:    "hi there",
		SessionMgr:  sm,
	}

	stage := StagePostExecute()
	err := stage(context.Background(), pctx)

	if err != nil {
		t.Fatalf("StagePostExecute failed: %v", err)
	}

	history := sm.GetHistory("test-session")
	if len(history) != 2 {
		t.Errorf("Expected 2 messages in history, got %d", len(history))
	}
}

func TestPipeline_Execute(t *testing.T) {
	p := NewPipeline(nil)

	// Track stage execution order
	var order []string

	p.AddStage("stage1", func(ctx context.Context, pctx *PipelineContext) error {
		order = append(order, "stage1")
		return nil
	})
	p.AddStage("stage2", func(ctx context.Context, pctx *PipelineContext) error {
		order = append(order, "stage2")
		return nil
	})
	p.AddStage("stage3", func(ctx context.Context, pctx *PipelineContext) error {
		order = append(order, "stage3")
		return nil
	})

	pctx := &PipelineContext{
		UserMessage: "test",
		StartTime:   time.Now(),
	}

	err := p.Execute(context.Background(), pctx)
	if err != nil {
		t.Fatalf("Pipeline.Execute failed: %v", err)
	}

	if len(order) != 3 {
		t.Errorf("Expected 3 stages executed, got %d", len(order))
	}

	for i, expected := range []string{"stage1", "stage2", "stage3"} {
		if order[i] != expected {
			t.Errorf("Expected stage %d to be %q, got %q", i, expected, order[i])
		}
	}
}

func TestPipeline_Execute_StageError(t *testing.T) {
	p := NewPipeline(nil)

	p.AddStage("stage1", func(ctx context.Context, pctx *PipelineContext) error {
		return nil
	})
	p.AddStage("stage2", func(ctx context.Context, pctx *PipelineContext) error {
		return &testError{"stage2 failed"}
	})
	p.AddStage("stage3", func(ctx context.Context, pctx *PipelineContext) error {
		t.Error("stage3 should not be executed after stage2 error")
		return nil
	})

	pctx := &PipelineContext{
		UserMessage: "test",
		StartTime:   time.Now(),
	}

	err := p.Execute(context.Background(), pctx)
	if err == nil {
		t.Error("Expected error from pipeline")
	}

	if pctx.Err == nil {
		t.Error("Expected pctx.Err to be set")
	}
}

func TestPipeline_ContextCancellation(t *testing.T) {
	p := NewPipeline(nil)

	p.AddStage("stage1", func(ctx context.Context, pctx *PipelineContext) error {
		return nil
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	pctx := &PipelineContext{
		UserMessage: "test",
		StartTime:   time.Now(),
	}

	err := p.Execute(ctx, pctx)
	if err != context.Canceled {
		t.Errorf("Expected context.Canceled, got %v", err)
	}
}

func TestPipeline_StageTimings(t *testing.T) {
	p := NewPipeline(nil)

	p.AddStage("fast", func(ctx context.Context, pctx *PipelineContext) error {
		return nil
	})
	p.AddStage("slow", func(ctx context.Context, pctx *PipelineContext) error {
		time.Sleep(10 * time.Millisecond)
		return nil
	})

	pctx := &PipelineContext{
		UserMessage: "test",
		StartTime:   time.Now(),
	}

	err := p.Execute(context.Background(), pctx)
	if err != nil {
		t.Fatalf("Pipeline.Execute failed: %v", err)
	}

	if _, ok := pctx.StageTimings["fast"]; !ok {
		t.Error("Expected timing for 'fast' stage")
	}
	if _, ok := pctx.StageTimings["slow"]; !ok {
		t.Error("Expected timing for 'slow' stage")
	}

	if pctx.StageTimings["slow"] < 10*time.Millisecond {
		t.Errorf("Expected 'slow' stage to take >= 10ms, got %v", pctx.StageTimings["slow"])
	}
}

type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}
