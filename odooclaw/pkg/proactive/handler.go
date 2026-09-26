package proactive

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/logger"
)

// SignalPath is the path Odoo posts a signal to. It is the counterpart of the
// `odooclaw.proactive_url` parameter on the Odoo side, so the two must agree:
// change one and you must change the other, which is why the value lives here
// as a constant rather than being spelled out in two places.
const SignalPath = "/odooclaw/signal"

// Handler exposes the engine over HTTP so Odoo can ask "the user just opened
// this screen; would you say something?".
//
// Why this exists as its own handler and not as part of the Odoo channel: the
// Odoo channel serves the *inbound* path (a human wrote to the bot, and the
// gateway answers). This serves the opposite direction and must never be
// confused with it. In particular it does NOT deliver anything: Odoo posts the
// message itself, inside the request scope of the user who triggered it, so
// there is no window where a suggestion arrives after the user logged out.
//
// That is why it calls EvaluateOnly and not Handle: deciding and delivering are
// deliberately split, and this route is only allowed to decide.
type Handler struct {
	service *Service
	// token is the shared service secret, the same one the Odoo webhook uses.
	// Empty means no check, which is only reasonable on localhost.
	token string
	// enabled lets a deployment mount the route but keep it silent.
	enabled bool
}

// NewHandler builds the HTTP handler. A nil service keeps the route answering
// with a clean refusal instead of panicking.
func NewHandler(service *Service, token string, enabled bool) *Handler {
	return &Handler{service: service, token: token, enabled: enabled}
}

// SignalRequest is the wire format Odoo sends. Field names must match what
// controllers/proactive.py posts.
type SignalRequest struct {
	UserID   int            `json:"user_id"`
	Area     string         `json:"area"`
	Model    string         `json:"model"`
	ViewID   int            `json:"view_id"`
	Counters map[string]int `json:"counters"`
	User     *struct {
		ID         int  `json:"id"`
		IsInternal bool `json:"is_internal"`
		IsActive   bool `json:"is_active"`
	} `json:"user"`
}

// SignalResponse is the verdict. It always carries `reason`, in both directions:
// a silence is an answer, and it is the one an operator most often needs.
type SignalResponse struct {
	Speak      bool   `json:"speak"`
	Reason     string `json:"reason"`
	PlaybookID string `json:"playbook_id"`
	Area       string `json:"area"`
	Message    string `json:"message"`
	Invitation bool   `json:"invitation"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, SignalResponse{
			Reason: "method not allowed",
		})
		return
	}

	// Same shared secret as the webhook, sent in the same header, so a
	// deployment has one credential to rotate rather than two.
	if h.token != "" && r.Header.Get("X-OdooClaw-Token") != h.token {
		logger.WarnCF("proactive", "Rejected signal: invalid token", map[string]any{
			"remote": r.RemoteAddr,
		})
		writeJSON(w, http.StatusUnauthorized, SignalResponse{Reason: "unauthorized"})
		return
	}

	if !h.enabled {
		writeJSON(w, http.StatusOK, SignalResponse{
			Reason: "la proactividad está desactivada en este despliegue",
		})
		return
	}

	var req SignalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, SignalResponse{Reason: "JSON ilegible"})
		return
	}
	defer r.Body.Close()

	if req.UserID == 0 {
		writeJSON(w, http.StatusBadRequest, SignalResponse{Reason: "falta user_id"})
		return
	}

	sig := Signal{
		UserID:   req.UserID,
		Area:     strings.ToLower(strings.TrimSpace(req.Area)),
		Model:    req.Model,
		ViewID:   itoa(req.ViewID),
		Counters: req.Counters,
	}
	// The classification is optional on the wire so an older Odoo still works,
	// but a missing one leaves the zero value, which the audience check treats
	// as "not eligible". Failing closed is the only safe default here.
	if req.User != nil {
		sig.User = ClassifiedUser{
			ID:         req.User.ID,
			IsInternal: req.User.IsInternal,
			IsActive:   req.User.IsActive,
		}
	}

	if h.service == nil {
		// No engine configured: silence with an explicable reason, never a 500.
		// A view open must not fail because the assistant is missing.
		writeJSON(w, http.StatusOK, SignalResponse{
			Reason: "el motor de proactividad no está configurado",
		})
		return
	}

	dec := h.service.EvaluateOnly(sig)

	resp := SignalResponse{
		Speak:      dec.Speak,
		Reason:     dec.Reason,
		PlaybookID: dec.PlaybookID,
		Area:       sig.Area,
		Message:    dec.Message,
		Invitation: dec.Invitation,
	}
	if dec.Speak {
		logger.InfoCF("proactive", "Signal decided to speak", map[string]any{
			"user_id":    sig.UserID,
			"area":       sig.Area,
			"playbook":   dec.PlaybookID,
			"invitation": dec.Invitation,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

// itoa renders the view id the way the Signal expects it: an empty string for
// "not provided" rather than "0", which would look like a real view id in logs.
func itoa(n int) string {
	if n == 0 {
		return ""
	}
	return strconv.Itoa(n)
}

func writeJSON(w http.ResponseWriter, status int, payload SignalResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		logger.WarnCF("proactive", "Failed to write signal response", map[string]any{
			"error": err.Error(),
		})
	}
}
