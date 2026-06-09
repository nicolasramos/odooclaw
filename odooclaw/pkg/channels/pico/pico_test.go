package pico

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

func newTestPicoChannel(t *testing.T) *PicoChannel {
	t.Helper()

	ch, err := NewPicoChannel(config.PicoConfig{Token: "test-token"}, bus.NewMessageBus())
	if err != nil {
		t.Fatalf("NewPicoChannel: %v", err)
	}
	if err := ch.Start(context.Background()); err != nil {
		t.Fatalf("Start: %v", err)
	}
	return ch
}

func TestCreateAndAddConnectionRespectsExactConcurrentLimit(t *testing.T) {
	ch := newTestPicoChannel(t)

	const (
		maxConns   = 5
		goroutines = 64
	)

	var wg sync.WaitGroup
	var mu sync.Mutex
	successCount := 0
	temporaryErrors := 0

	wg.Add(goroutines)
	for range goroutines {
		go func() {
			defer wg.Done()

			pc, err := ch.createAndAddConnection(nil, "session-a", maxConns)
			mu.Lock()
			defer mu.Unlock()
			switch {
			case err == nil:
				successCount++
				if pc == nil {
					t.Error("connection is nil on successful registration")
				}
			case errors.Is(err, channels.ErrTemporary):
				temporaryErrors++
			default:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()

	if successCount != maxConns {
		t.Fatalf("successful registrations=%d want=%d", successCount, maxConns)
	}
	if temporaryErrors != goroutines-maxConns {
		t.Fatalf("temporary errors=%d want=%d", temporaryErrors, goroutines-maxConns)
	}
	if got := ch.currentConnCount(); got != maxConns {
		t.Fatalf("current connection count=%d want=%d", got, maxConns)
	}
	ch.connsMu.RLock()
	defer ch.connsMu.RUnlock()
	bySession := ch.sessionConnections["session-a"]
	if len(bySession) != maxConns {
		t.Fatalf("session index connections=%d want=%d", len(bySession), maxConns)
	}
	for connID, pc := range ch.connections {
		if bySession[connID] != pc {
			t.Fatalf("connection %s is inconsistent between indexes", connID)
		}
	}
}

func TestRemoveConnectionPreservesOtherConnectionsInSession(t *testing.T) {
	ch := newTestPicoChannel(t)

	first, err := ch.createAndAddConnection(nil, "session-cleanup", 10)
	if err != nil {
		t.Fatalf("createAndAddConnection: %v", err)
	}
	second, err := ch.createAndAddConnection(nil, "session-cleanup", 10)
	if err != nil {
		t.Fatalf("createAndAddConnection: %v", err)
	}
	if removed := ch.removeConnection(first.id); removed != first {
		t.Fatalf("removed connection=%p want=%p", removed, first)
	}

	ch.connsMu.RLock()
	if _, ok := ch.connections[first.id]; ok {
		t.Fatalf("connection %s remains in global index", first.id)
	}
	if ch.connections[second.id] != second {
		t.Fatalf("connection %s missing from global index", second.id)
	}
	if ch.sessionConnections[second.sessionID][second.id] != second {
		t.Fatalf("connection %s missing from session index", second.id)
	}
	ch.connsMu.RUnlock()

	ch.removeConnection(second.id)
	ch.connsMu.RLock()
	defer ch.connsMu.RUnlock()
	if _, ok := ch.sessionConnections[second.sessionID]; ok {
		t.Fatalf("empty session %s remains in session index", second.sessionID)
	}
}

func TestCreateAndAddConnectionRejectsRegistrationAfterStop(t *testing.T) {
	ch := newTestPicoChannel(t)

	if err := ch.Stop(context.Background()); err != nil {
		t.Fatalf("Stop: %v", err)
	}
	if _, err := ch.createAndAddConnection(nil, "after-stop", 10); !errors.Is(err, channels.ErrNotRunning) {
		t.Fatalf("registration error=%v want ErrNotRunning", err)
	}
	if got := ch.currentConnCount(); got != 0 {
		t.Fatalf("current connection count=%d want=0", got)
	}
}

func TestStopCancelCannotCancelSubsequentStart(t *testing.T) {
	ch := newTestPicoChannel(t)
	oldCanceled := make(chan struct{})
	ch.connsMu.Lock()
	ch.cancel = func() { close(oldCanceled) }
	ch.connsMu.Unlock()

	_, cancel := ch.stopState()
	nextCtx, nextCancel := context.WithCancel(context.Background())
	defer nextCancel()
	if err := ch.Start(nextCtx); err != nil {
		t.Fatalf("Start: %v", err)
	}
	ch.connsMu.RLock()
	activeCtx := ch.ctx
	ch.connsMu.RUnlock()
	cancel()

	select {
	case <-oldCanceled:
	default:
		t.Fatal("captured cancel did not cancel the stopped lifecycle")
	}
	select {
	case <-activeCtx.Done():
		t.Fatal("stopped lifecycle canceled a subsequent Start")
	default:
	}
}

func TestStartStopConcurrentLifecycle(t *testing.T) {
	for range 100 {
		ch := newTestPicoChannel(t)
		nextCtx, nextCancel := context.WithCancel(context.Background())

		start := make(chan struct{})
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			<-start
			_ = ch.Stop(context.Background())
		}()
		go func() {
			defer wg.Done()
			<-start
			_ = ch.Start(nextCtx)
		}()
		close(start)
		wg.Wait()

		if ch.IsRunning() {
			ch.connsMu.RLock()
			activeCtx := ch.ctx
			ch.connsMu.RUnlock()
			select {
			case <-activeCtx.Done():
				t.Fatal("running lifecycle has a canceled context")
			default:
			}
		}
		nextCancel()
	}
}

func TestStartIsIdempotentWhenRepeatedConcurrently(t *testing.T) {
	ch := newTestPicoChannel(t)
	ch.connsMu.RLock()
	activeCtx := ch.ctx
	ch.connsMu.RUnlock()

	const starts = 64
	var wg sync.WaitGroup
	wg.Add(starts)
	for range starts {
		go func() {
			defer wg.Done()
			if err := ch.Start(context.Background()); err != nil {
				t.Errorf("Start: %v", err)
			}
		}()
	}
	wg.Wait()

	ch.connsMu.RLock()
	gotCtx := ch.ctx
	ch.connsMu.RUnlock()
	if gotCtx != activeCtx {
		t.Fatal("repeated Start replaced the active lifecycle context")
	}
	if err := ch.Stop(context.Background()); err != nil {
		t.Fatalf("Stop: %v", err)
	}
	select {
	case <-activeCtx.Done():
	default:
		t.Fatal("Stop did not cancel the original active lifecycle")
	}
}

func TestPingLoopUsesConnectionLifecycleAcrossStopStart(t *testing.T) {
	ch := newTestPicoChannel(t)
	if err := ch.Start(context.Background()); err != nil {
		t.Fatalf("initial Start: %v", err)
	}
	pc, err := ch.createAndAddConnection(nil, "old-lifecycle", 10)
	if err != nil {
		t.Fatalf("createAndAddConnection: %v", err)
	}
	pc.closed.Store(true)

	if err := ch.Stop(context.Background()); err != nil {
		t.Fatalf("Stop: %v", err)
	}
	if err := ch.Start(context.Background()); err != nil {
		t.Fatalf("subsequent Start: %v", err)
	}

	done := make(chan struct{})
	go func() {
		ch.pingLoop(pc, time.Hour)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(100 * time.Millisecond):
		t.Fatal("old connection loop observed the subsequent lifecycle context")
	}
}

func TestConnectionCloseForErrorDistinguishesLifecycleAndLimit(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		code   int
		reason string
	}{
		{name: "channel stopped", err: channels.ErrNotRunning, code: websocket.CloseGoingAway, reason: "channel not running"},
		{name: "connection limit", err: channels.ErrTemporary, code: websocket.CloseTryAgainLater, reason: "too many connections"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, reason := connectionCloseForError(tt.err)
			if code != tt.code || reason != tt.reason {
				t.Fatalf("close=(%d, %q) want=(%d, %q)", code, reason, tt.code, tt.reason)
			}
		})
	}
}

func TestTakeAllConnectionsCleansBothIndexes(t *testing.T) {
	ch := newTestPicoChannel(t)

	for _, sessionID := range []string{"session-a", "session-b"} {
		if _, err := ch.createAndAddConnection(nil, sessionID, 10); err != nil {
			t.Fatalf("createAndAddConnection(%s): %v", sessionID, err)
		}
	}

	if got := len(ch.takeAllConnections()); got != 2 {
		t.Fatalf("taken connections=%d want=2", got)
	}
	if got := ch.currentConnCount(); got != 0 {
		t.Fatalf("current connection count=%d want=0", got)
	}
	ch.connsMu.RLock()
	defer ch.connsMu.RUnlock()
	if len(ch.sessionConnections) != 0 {
		t.Fatalf("session index length=%d want=0", len(ch.sessionConnections))
	}
}

func TestBroadcastToSessionTargetsOnlyRequestedSessionAndReturnsExpectedError(t *testing.T) {
	ch := newTestPicoChannel(t)

	target := &picoConn{id: "target", sessionID: "s-target"}
	target.closed.Store(true)
	ch.addConnForTest(target)
	ch.addConnForTest(&picoConn{id: "other", sessionID: "s-other"})

	err := ch.broadcastToSession("pico:s-target", newMessage(TypeMessageCreate, map[string]any{"content": "hello"}))
	if !errors.Is(err, channels.ErrSendFailed) {
		t.Fatalf("broadcast error=%v want ErrSendFailed", err)
	}
}

func (c *PicoChannel) addConnForTest(pc *picoConn) {
	c.connsMu.Lock()
	defer c.connsMu.Unlock()
	if _, exists := c.connections[pc.id]; exists {
		panic(fmt.Sprintf("duplicate connection id in test: %s", pc.id))
	}
	c.connections[pc.id] = pc
	bySession := c.sessionConnections[pc.sessionID]
	if bySession == nil {
		bySession = make(map[string]*picoConn)
		c.sessionConnections[pc.sessionID] = bySession
	}
	bySession[pc.id] = pc
}
