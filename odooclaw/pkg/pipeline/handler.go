package pipeline

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

// Handler is the HTTP end the Odoo pipeline calls: POST /odooclaw/job.
//
// It authenticates with the same service token as the proactive routes, accepts
// the job asynchronously and answers 202. The answer means "queued or already
// queued", never "done": the outcome lives in the Odoo run row.
type Handler struct {
	queue *Queue
	token string
}

func NewHandler(queue *Queue, token string) *Handler {
	return &Handler{queue: queue, token: token}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if h.token != "" && r.Header.Get("X-OdooClaw-Token") != h.token {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var job Job
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := dec.Decode(&job); err != nil {
		http.Error(w, "invalid json: "+err.Error(), http.StatusBadRequest)
		return
	}
	if err := job.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	// A customer reply is high priority: the low channel is kept for periodic
	// sweeps that can wait for a quiet moment.
	accepted := h.queue.Enqueue(job, true)
	log.Printf("[pipeline] job received run=%d model=%s res=%d message=%d mode=%s accepted=%t",
		job.RunID, job.Model, job.ResID, job.MessageID, job.Mode, accepted)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"accepted":  accepted,
		"duplicate": !accepted,
		"run_id":    job.RunID,
	})
}

// Router sends /odooclaw/job to the pipeline and everything else under
// /odooclaw/ to the proactive handler, so the gateway keeps a single
// registration for the whole subtree.
func Router(proactive, job http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/odooclaw/job") {
			job.ServeHTTP(w, r)
			return
		}
		proactive.ServeHTTP(w, r)
	})
}
