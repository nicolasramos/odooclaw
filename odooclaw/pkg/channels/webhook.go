package channels

import (
	"context"
	"net/http"
)

// WebhookHandler is an optional interface for channels that receive messages
// via HTTP webhooks. Manager discovers channels implementing this interface
// and registers them on the shared HTTP server.
type WebhookHandler interface {
	// WebhookPath returns the path to mount this handler on the shared server.
	// Examples: "/webhook/line", "/webhook/wecom"
	WebhookPath() string
	http.Handler // ServeHTTP(w http.ResponseWriter, r *http.Request)
}

// WebhookExtraPaths is an optional interface for channels that serve
// additional webhook paths alongside WebhookPath(). Manager registers each
// returned path with the same handler.
type WebhookExtraPaths interface {
	WebhookExtraPaths() []string
}

// AllowlistCacheResetter is an optional interface for channels that can
// invalidate an external allowlist cache (e.g. the MCP odoo-mcp server's
// in-process policy cache) on system events. The agent loop wires the
// callback after MCP initialization.
type AllowlistCacheResetter interface {
	SetAllowlistCacheResetter(fn func(ctx context.Context) error)
}

// HealthChecker is an optional interface for channels that expose
// a health check endpoint on the shared HTTP server.
type HealthChecker interface {
	HealthPath() string
	HealthHandler(w http.ResponseWriter, r *http.Request)
}
