package pipeline

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type fakeProcessor struct {
	mu      sync.Mutex
	jobs    []Job
	err     error
	delay   time.Duration
	attempt int32
	gate    chan struct{}
}

func (f *fakeProcessor) Process(ctx context.Context, job Job) error {
	atomic.AddInt32(&f.attempt, 1)
	f.mu.Lock()
	f.jobs = append(f.jobs, job)
	f.mu.Unlock()
	if f.gate != nil {
		select {
		case <-f.gate:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	if f.delay > 0 {
		select {
		case <-time.After(f.delay):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return f.err
}

func (f *fakeProcessor) seen() []Job {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Job(nil), f.jobs...)
}

func newTestJob(model string, resID, messageID int) Job {
	return Job{
		RunID:     messageID,
		Model:     model,
		ResID:     resID,
		MessageID: messageID,
		Mode:      "draft",
	}
}

func eventually(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", timeout)
}

func TestDuplicateMessageIsOneJob(t *testing.T) {
	proc := &fakeProcessor{delay: 30 * time.Millisecond}
	q := NewQueue(proc, Options{Retries: 1, Backoff: time.Millisecond})
	defer q.Stop()
	job := newTestJob("helpdesk.ticket", 1, 10)
	if !q.Enqueue(job, true) {
		t.Fatal("first enqueue must be accepted")
	}
	if q.Enqueue(job, true) {
		t.Fatal("duplicate must be rejected")
	}
	eventually(t, time.Second, func() bool { return len(proc.seen()) == 1 })
	time.Sleep(20 * time.Millisecond)
	if got := len(proc.seen()); got != 1 {
		t.Fatalf("expected one processed job, got %d", got)
	}
}

func TestHighPriorityRunsFirst(t *testing.T) {
	gate := make(chan struct{})
	proc := &fakeProcessor{gate: gate}
	q := NewQueue(proc, Options{Retries: 1, Backoff: time.Millisecond})
	defer q.Stop()
	q.Enqueue(newTestJob("helpdesk.ticket", 1, 1), false)
	eventually(t, time.Second, func() bool { return len(proc.seen()) == 1 })
	q.Enqueue(newTestJob("helpdesk.ticket", 2, 2), false)
	q.Enqueue(newTestJob("helpdesk.ticket", 3, 3), true)
	close(gate)
	eventually(t, time.Second, func() bool { return len(proc.seen()) == 3 })
	got := proc.seen()
	if got[1].MessageID != 3 {
		t.Fatalf("expected the high priority job second, got message %d", got[1].MessageID)
	}
}

func TestRetriesUntilAttemptsRunOut(t *testing.T) {
	proc := &fakeProcessor{err: errors.New("boom")}
	q := NewQueue(proc, Options{Retries: 2, Backoff: time.Millisecond})
	defer q.Stop()
	q.Enqueue(newTestJob("crm.lead", 1, 1), true)
	eventually(t, time.Second, func() bool { return atomic.LoadInt32(&proc.attempt) == 2 })
	time.Sleep(20 * time.Millisecond)
	if got := atomic.LoadInt32(&proc.attempt); got != 2 {
		t.Fatalf("expected exactly 2 attempts, got %d", got)
	}
}

func TestTimeoutEndsTheAttempt(t *testing.T) {
	proc := &fakeProcessor{delay: time.Second}
	q := NewQueue(proc, Options{Retries: 1, Timeout: 30 * time.Millisecond})
	defer q.Stop()
	q.Enqueue(newTestJob("crm.lead", 1, 1), true)
	eventually(t, time.Second, func() bool { return atomic.LoadInt32(&proc.attempt) == 1 })
	time.Sleep(80 * time.Millisecond)
	if got := atomic.LoadInt32(&proc.attempt); got != 1 {
		t.Fatalf("a timed out job must not be attempted again when retries=1, got %d", got)
	}
}

func TestEnqueueAfterStopIsRejected(t *testing.T) {
	proc := &fakeProcessor{}
	q := NewQueue(proc, Options{})
	q.Stop()
	if q.Enqueue(newTestJob("crm.lead", 1, 1), true) {
		t.Fatal("a closed queue must reject new jobs")
	}
}

func TestHandlerAcceptsValidJob(t *testing.T) {
	proc := &fakeProcessor{}
	q := NewQueue(proc, Options{})
	defer q.Stop()
	h := NewHandler(q, "secret")
	body := `{"run_id":5,"model":"helpdesk.ticket","res_id":2,"message_id":9,"mode":"observe"}`
	req := httptest.NewRequest(http.MethodPost, "/odooclaw/job", strings.NewReader(body))
	req.Header.Set("X-OdooClaw-Token", "secret")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", rec.Code, rec.Body.String())
	}
	eventually(t, time.Second, func() bool { return len(proc.seen()) == 1 })
	if got := proc.seen()[0]; got.RunID != 5 || got.Mode != "observe" {
		t.Fatalf("unexpected job: %+v", got)
	}
}

func TestHandlerRejectsBadToken(t *testing.T) {
	q := NewQueue(&fakeProcessor{}, Options{})
	defer q.Stop()
	h := NewHandler(q, "secret")
	req := httptest.NewRequest(http.MethodPost, "/odooclaw/job", strings.NewReader(`{}`))
	req.Header.Set("X-OdooClaw-Token", "wrong")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandlerRejectsInvalidJob(t *testing.T) {
	q := NewQueue(&fakeProcessor{}, Options{})
	defer q.Stop()
	h := NewHandler(q, "")
	req := httptest.NewRequest(http.MethodPost, "/odooclaw/job", strings.NewReader(`{"model":"crm.lead"}`))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRouterSendsJobToThePipeline(t *testing.T) {
	hit := ""
	proactive := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hit = "proactive" })
	job := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hit = "job" })
	router := Router(proactive, job)

	req := httptest.NewRequest(http.MethodPost, "/odooclaw/job", nil)
	router.ServeHTTP(httptest.NewRecorder(), req)
	if hit != "job" {
		t.Fatalf("expected the job handler, got %q", hit)
	}
	req = httptest.NewRequest(http.MethodPost, "/odooclaw/signal", nil)
	router.ServeHTTP(httptest.NewRecorder(), req)
	if hit != "proactive" {
		t.Fatalf("expected the proactive handler, got %q", hit)
	}
}
