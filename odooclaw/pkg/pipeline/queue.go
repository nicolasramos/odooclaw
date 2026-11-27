// Package pipeline turns a customer message into work for the agent and keeps
// that work ordered, deduplicated and bounded.
//
// The Odoo side decides *what* should happen (area, stage, mode) and writes the
// run row before calling here, so this package never repeats the stage lookup
// and a failed delivery leaves a trace in Odoo. Its only job is to run the
// decisions reliably: one worker, highest priority first, one job per message,
// retries with backoff, and a hard deadline per job.
package pipeline

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

// Attachment is a picture or a voice note the customer attached to the
// message. Data is base64 on purpose: the engine has no access to the Odoo
// filestore, and the Odoo side already holds the only copy.
type Attachment struct {
	Name     string `json:"name"`
	MimeType string `json:"mimetype"`
	Data     string `json:"data"`
}

// Job is one customer message handed over by Odoo.
type Job struct {
	RunID             int          `json:"run_id"`
	PipelineID        int          `json:"pipeline_id"`
	Area              string       `json:"area"`
	Model             string       `json:"model"`
	ResID             int          `json:"res_id"`
	ResName           string       `json:"res_name"`
	MessageID         int          `json:"message_id"`
	MessageBody       string       `json:"message_body"`
	AuthorID          int          `json:"author_id"`
	AuthorName        string       `json:"author_name"`
	StageID           int          `json:"stage_id"`
	StageName         string       `json:"stage_name"`
	Mode              string       `json:"mode"`
	Escalate          bool         `json:"escalate"`
	EscalateUserID    int          `json:"escalate_user_id"`
	EscalateAfter     int          `json:"escalate_after"`
	TemplateID        int          `json:"template_id"`
	TemplateBody      string       `json:"template_body"`
	Instructions      string       `json:"instructions"`
	StageInstructions string       `json:"stage_instructions"`
	UseKnowledge      bool         `json:"use_knowledge"`
	BotUserID         int          `json:"bot_user_id"`
	Attachments       []Attachment `json:"attachments"`

	// AttachmentText is what the multimodal model read from the attachments.
	// It travels with the job instead of the database: it is text the agent
	// needs now, not a fact worth keeping.
	AttachmentText string `json:"-"`
}

// Validate rejects jobs that cannot be processed. The run id is mandatory:
// without it the result could not be written back to the ledger.
func (j Job) Validate() error {
	if j.RunID <= 0 {
		return fmt.Errorf("run_id is required")
	}
	if strings.TrimSpace(j.Model) == "" {
		return fmt.Errorf("model is required")
	}
	if j.ResID <= 0 {
		return fmt.Errorf("res_id is required")
	}
	if j.MessageID <= 0 {
		return fmt.Errorf("message_id is required")
	}
	switch j.Mode {
	case "observe", "draft", "auto":
	default:
		return fmt.Errorf("unknown mode %q", j.Mode)
	}
	if len(j.Attachments) > 3 {
		return fmt.Errorf("too many attachments")
	}
	for _, a := range j.Attachments {
		if strings.TrimSpace(a.Data) == "" {
			return fmt.Errorf("attachment %q has no data", a.Name)
		}
		if !strings.HasPrefix(a.MimeType, "image/") && !strings.HasPrefix(a.MimeType, "audio/") {
			return fmt.Errorf("attachment %q is not an image or an audio", a.Name)
		}
	}
	return nil
}

// Key identifies the work: the same message on the same record is one job.
func (j Job) Key() string {
	return fmt.Sprintf("%s:%d:%d", j.Model, j.ResID, j.MessageID)
}

// Processor does the actual work: read the thread, ask the agent, and apply the
// mode (observe, draft or answer).
type Processor interface {
	Process(ctx context.Context, job Job) error
}

// Queue runs jobs with one worker, highest priority first.
type Queue struct {
	high chan Job
	low  chan Job
	stop chan struct{}

	processor Processor
	timeout   time.Duration
	retries   int
	backoff   time.Duration

	mu      sync.Mutex
	pending map[string]struct{}
	closed  bool
	wg      sync.WaitGroup
}

// Options configures a Queue. Zero values take safe defaults.
type Options struct {
	Buffer  int
	Timeout time.Duration
	Retries int
	Backoff time.Duration
}

func (o Options) withDefaults() Options {
	if o.Buffer <= 0 {
		o.Buffer = 64
	}
	if o.Timeout <= 0 {
		o.Timeout = 2 * time.Minute
	}
	if o.Retries <= 0 {
		o.Retries = 3
	}
	if o.Backoff <= 0 {
		o.Backoff = time.Second
	}
	return o
}

// NewQueue creates a queue and starts its worker.
func NewQueue(processor Processor, opts Options) *Queue {
	opts = opts.withDefaults()
	q := &Queue{
		high:      make(chan Job, opts.Buffer),
		low:       make(chan Job, opts.Buffer),
		stop:      make(chan struct{}),
		processor: processor,
		timeout:   opts.Timeout,
		retries:   opts.Retries,
		backoff:   opts.Backoff,
		pending:   make(map[string]struct{}),
	}
	q.wg.Add(1)
	go q.worker()
	return q
}

// Enqueue accepts a job. The second result is false when the job is already
// pending (the same message arriving twice) or the queue is closed; the first
// case is normal, the caller answers 202 either way.
func (q *Queue) Enqueue(job Job, highPriority bool) bool {
	key := job.Key()
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return false
	}
	if _, ok := q.pending[key]; ok {
		q.mu.Unlock()
		return false
	}
	q.pending[key] = struct{}{}
	q.mu.Unlock()

	ch := q.low
	if highPriority {
		ch = q.high
	}
	select {
	case ch <- job:
		return true
	case <-q.stop:
		q.forget(key)
		return false
	}
}

// Stop closes the queue and waits for the worker to finish the job in hand.
func (q *Queue) Stop() {
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return
	}
	q.closed = true
	close(q.stop)
	q.mu.Unlock()
	q.wg.Wait()
}

// Pending reports how many distinct jobs are waiting or running.
func (q *Queue) Pending() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.pending)
}

func (q *Queue) forget(key string) {
	q.mu.Lock()
	delete(q.pending, key)
	q.mu.Unlock()
}

func (q *Queue) worker() {
	defer q.wg.Done()
	for {
		// Strict priority: drain the high channel before looking at the low
		// one. A plain select would pick at random when both are ready, which
		// is exactly what "customer first" must not do.
		select {
		case job := <-q.high:
			q.handle(job)
			continue
		default:
		}
		select {
		case job := <-q.high:
			q.handle(job)
		case job := <-q.low:
			q.handle(job)
		case <-q.stop:
			return
		}
	}
}

func (q *Queue) handle(job Job) {
	defer q.forget(job.Key())
	if q.processor == nil {
		return
	}
	var err error
	for attempt := 1; attempt <= q.retries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), q.timeout)
		err = q.processor.Process(ctx, job)
		cancel()
		if err == nil {
			return
		}
		if attempt < q.retries {
			time.Sleep(q.backoff * time.Duration(attempt))
		}
	}
}
