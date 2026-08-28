package mcp

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/toolguard"
)

// headerTransport is an http.RoundTripper that adds custom headers to requests
type headerTransport struct {
	base    http.RoundTripper
	headers map[string]string
}

func (t *headerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Clone the request to avoid modifying the original
	req = req.Clone(req.Context())

	// Add custom headers
	for key, value := range t.headers {
		req.Header.Set(key, value)
	}

	// Use the base transport
	base := t.base
	if base == nil {
		base = http.DefaultTransport
	}
	return base.RoundTrip(req)
}

// loadEnvFile loads environment variables from a file in .env format
// Each line should be in the format: KEY=value
// Lines starting with # are comments
// Empty lines are ignored
func loadEnvFile(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open env file: %w", err)
	}
	defer file.Close()

	envVars := make(map[string]string)
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse KEY=value
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid format at line %d: %s", lineNum, line)
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		if key == "" {
			return nil, fmt.Errorf("invalid format at line %d: empty key", lineNum)
		}

		// Remove surrounding quotes if present
		if len(value) >= 2 {
			if (value[0] == '"' && value[len(value)-1] == '"') ||
				(value[0] == '\'' && value[len(value)-1] == '\'') {
				value = value[1 : len(value)-1]
			}
		}

		envVars[key] = value
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading env file: %w", err)
	}

	return envVars, nil
}

// ServerConnection represents a connection to an MCP server
type ServerConnection struct {
	Name    string
	Client  *mcp.Client
	Session *mcp.ClientSession
	Tools   []*mcp.Tool

	callSession clientSession
	config      config.MCPServerConfig
}

type clientSession interface {
	CallTool(context.Context, *mcp.CallToolParams) (*mcp.CallToolResult, error)
	Close() error
}

func (c *ServerConnection) activeSession() clientSession {
	if c.callSession != nil {
		return c.callSession
	}
	return c.Session
}

type connector func(
	context.Context,
	string,
	config.MCPServerConfig,
) (*ServerConnection, error)

type reconnectCall struct {
	done chan struct{}
	conn *ServerConnection
	err  error
}

// Manager manages multiple MCP server connections
type Manager struct {
	servers    map[string]*ServerConnection
	reconnects map[string]*reconnectCall
	connector  connector
	mu         sync.RWMutex
	closed     atomic.Bool
	wg         sync.WaitGroup
	lifecycle  context.Context
	cancel     context.CancelFunc

	beforeCallAdmit          func()
	beforeCloseAdmissionLock func()

	// validator, if set, is consulted by CallTool BEFORE the
	// session dispatch. A non-nil validator blocks every call
	// that fails ValidateToolCall or that DetectDestructiveOperation
	// flags as destructive. Setting validator to nil (the default)
	// disables validation, preserving the original behaviour for
	// tests and for callers that want to opt out.
	validator *toolguard.Validator
}

// NewManager creates a new MCP manager
func NewManager() *Manager {
	lifecycle, cancel := context.WithCancel(context.Background())
	manager := &Manager{
		servers:    make(map[string]*ServerConnection),
		reconnects: make(map[string]*reconnectCall),
		lifecycle:  lifecycle,
		cancel:     cancel,
	}
	manager.connector = manager.connectServer
	return manager
}

// SetValidator attaches a toolguard.Validator to the manager.
// The validator is consulted by every CallTool before the
// underlying MCP session is invoked. Pass nil to disable
// validation.
//
// Typically called by the application bootstrap after the
// registry has been auto-populated from GetAllTools. Tests can
// inject a hand-built validator directly.
func (m *Manager) SetValidator(v *toolguard.Validator) {
	m.validator = v
}

// ReloadValidatorFromTools rebuilds the validator from the current
// tool list. It is a no-op when the application has not opted in
// by calling SetValidator at least once — the manager is
// conservative: by default it does nothing, and the user must
// explicitly enable validation.
func (m *Manager) ReloadValidatorFromTools() error {
	if m.validator == nil {
		return nil
	}
	fresh := toolguard.RegistryFromManagerToolset(m.GetAllTools())
	if fresh.ToolCount() > 0 {
		m.validator = fresh
	}
	return nil
}

// LoadFromConfig loads MCP servers from configuration
func (m *Manager) LoadFromConfig(ctx context.Context, cfg *config.Config) error {
	return m.LoadFromMCPConfig(ctx, cfg.Tools.MCP, cfg.WorkspacePath())
}

// LoadFromMCPConfig loads MCP servers from MCP configuration and workspace path.
// This is the minimal dependency version that doesn't require the full Config object.
func (m *Manager) LoadFromMCPConfig(
	ctx context.Context,
	mcpCfg config.MCPConfig,
	workspacePath string,
) error {
	if !mcpCfg.Enabled {
		logger.InfoCF("mcp", "MCP integration is disabled", nil)
		return nil
	}

	if len(mcpCfg.Servers) == 0 {
		logger.InfoCF("mcp", "No MCP servers configured", nil)
		return nil
	}

	logger.InfoCF("mcp", "Initializing MCP servers",
		map[string]any{
			"count": len(mcpCfg.Servers),
		})

	var wg sync.WaitGroup
	errs := make(chan error, len(mcpCfg.Servers))
	enabledCount := 0

	for name, serverCfg := range mcpCfg.Servers {
		if !serverCfg.Enabled {
			logger.DebugCF("mcp", "Skipping disabled server",
				map[string]any{
					"server": name,
				})
			continue
		}

		enabledCount++
		wg.Add(1)
		go func(name string, serverCfg config.MCPServerConfig, workspace string) {
			defer wg.Done()

			// Resolve relative envFile paths relative to workspace
			if serverCfg.EnvFile != "" && !filepath.IsAbs(serverCfg.EnvFile) {
				if workspace == "" {
					err := fmt.Errorf(
						"workspace path is empty while resolving relative envFile %q for server %s",
						serverCfg.EnvFile,
						name,
					)
					logger.ErrorCF("mcp", "Invalid MCP server configuration",
						map[string]any{
							"server":   name,
							"env_file": serverCfg.EnvFile,
							"error":    err.Error(),
						})
					errs <- err
					return
				}
				serverCfg.EnvFile = filepath.Join(workspace, serverCfg.EnvFile)
			}

			if err := m.ConnectServer(ctx, name, serverCfg); err != nil {
				logger.ErrorCF("mcp", "Failed to connect to MCP server",
					map[string]any{
						"server": name,
						"error":  err.Error(),
					})
				errs <- fmt.Errorf("failed to connect to server %s: %w", name, err)
			}
		}(name, serverCfg, workspacePath)
	}

	wg.Wait()
	close(errs)

	// Collect errors
	var allErrors []error
	for err := range errs {
		allErrors = append(allErrors, err)
	}

	connectedCount := len(m.GetServers())

	// If all enabled servers failed to connect, return aggregated error
	if enabledCount > 0 && connectedCount == 0 {
		logger.ErrorCF("mcp", "All MCP servers failed to connect",
			map[string]any{
				"failed": len(allErrors),
				"total":  enabledCount,
			})
		return errors.Join(allErrors...)
	}

	if len(allErrors) > 0 {
		logger.WarnCF("mcp", "Some MCP servers failed to connect",
			map[string]any{
				"failed":    len(allErrors),
				"connected": connectedCount,
				"total":     enabledCount,
			})
		// Don't fail completely if some servers successfully connected
	}

	logger.InfoCF("mcp", "MCP server initialization complete",
		map[string]any{
			"connected": connectedCount,
			"total":     enabledCount,
		})

	m.ReloadValidatorFromTools()

	return nil
}

// ConnectServer connects to a single MCP server
func (m *Manager) ConnectServer(
	ctx context.Context,
	name string,
	cfg config.MCPServerConfig,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	m.mu.Lock()
	if m.closed.Load() {
		m.mu.Unlock()
		return fmt.Errorf("manager is closed")
	}
	m.wg.Add(1)
	m.mu.Unlock()
	defer m.wg.Done()

	conn, err := m.connector(m.lifecycle, name, cfg)
	if err != nil {
		return err
	}

	m.mu.Lock()
	if m.closed.Load() {
		m.mu.Unlock()
		_ = conn.activeSession().Close()
		return fmt.Errorf("manager is closed")
	}
	old := m.servers[name]
	m.servers[name] = conn
	m.mu.Unlock()

	if old != nil {
		_ = old.activeSession().Close()
	}
	return nil
}

func (m *Manager) connectServer(
	ctx context.Context,
	name string,
	cfg config.MCPServerConfig,
) (*ServerConnection, error) {
	logger.InfoCF("mcp", "Connecting to MCP server",
		map[string]any{
			"server":     name,
			"command":    cfg.Command,
			"args_count": len(cfg.Args),
		})

	// Create client
	client := mcp.NewClient(&mcp.Implementation{
		Name:    "odooclaw",
		Version: "1.0.0",
	}, nil)

	// Create transport based on configuration
	// Auto-detect transport type if not explicitly specified
	var transport mcp.Transport
	transportType := cfg.Type

	// Auto-detect: if URL is provided, use SSE; if command is provided, use stdio
	if transportType == "" {
		if cfg.URL != "" {
			transportType = "sse"
		} else if cfg.Command != "" {
			transportType = "stdio"
		} else {
			return nil, fmt.Errorf("either URL or command must be provided")
		}
	}

	switch transportType {
	case "sse", "http":
		if cfg.URL == "" {
			return nil, fmt.Errorf("URL is required for SSE/HTTP transport")
		}
		logger.DebugCF("mcp", "Using SSE/HTTP transport",
			map[string]any{
				"server": name,
				"url":    cfg.URL,
			})

		sseTransport := &mcp.StreamableClientTransport{
			Endpoint: cfg.URL,
		}

		// Add custom headers if provided
		if len(cfg.Headers) > 0 {
			// Create a custom HTTP client with header-injecting transport
			sseTransport.HTTPClient = &http.Client{
				Transport: &headerTransport{
					base:    http.DefaultTransport,
					headers: cfg.Headers,
				},
			}
			logger.DebugCF("mcp", "Added custom HTTP headers",
				map[string]any{
					"server":       name,
					"header_count": len(cfg.Headers),
				})
		}

		transport = sseTransport
	case "stdio":
		if cfg.Command == "" {
			return nil, fmt.Errorf("command is required for stdio transport")
		}
		logger.DebugCF("mcp", "Using stdio transport",
			map[string]any{
				"server":  name,
				"command": cfg.Command,
			})
		// Create command with context
		cmd := exec.CommandContext(ctx, cfg.Command, cfg.Args...)

		// Build environment variables with proper override semantics
		// Use a map to ensure config variables override file variables
		envMap := make(map[string]string)

		// Start with parent process environment
		for _, e := range cmd.Environ() {
			if idx := strings.Index(e, "="); idx > 0 {
				envMap[e[:idx]] = e[idx+1:]
			}
		}

		// Load environment variables from file if specified
		if cfg.EnvFile != "" {
			envVars, err := loadEnvFile(cfg.EnvFile)
			if err != nil {
				return nil, fmt.Errorf("failed to load env file %s: %w", cfg.EnvFile, err)
			}
			for k, v := range envVars {
				envMap[k] = v
			}
			logger.DebugCF("mcp", "Loaded environment variables from file",
				map[string]any{
					"server":    name,
					"envFile":   cfg.EnvFile,
					"var_count": len(envVars),
				})
		}

		// Environment variables from config override those from file
		for k, v := range cfg.Env {
			envMap[k] = v
		}

		// Convert map to slice
		env := make([]string, 0, len(envMap))
		for k, v := range envMap {
			env = append(env, fmt.Sprintf("%s=%s", k, v))
		}
		cmd.Env = env

		transport = &mcp.CommandTransport{Command: cmd}
	default:
		return nil, fmt.Errorf(
			"unsupported transport type: %s (supported: stdio, sse, http)",
			transportType,
		)
	}

	// Connect to server
	session, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	// Get server info
	initResult := session.InitializeResult()
	logger.InfoCF("mcp", "Connected to MCP server",
		map[string]any{
			"server":        name,
			"serverName":    initResult.ServerInfo.Name,
			"serverVersion": initResult.ServerInfo.Version,
			"protocol":      initResult.ProtocolVersion,
		})

	// List available tools if supported
	var tools []*mcp.Tool
	if initResult.Capabilities.Tools != nil {
		for tool, err := range session.Tools(ctx, nil) {
			if err != nil {
				logger.WarnCF("mcp", "Error listing tool",
					map[string]any{
						"server": name,
						"error":  err.Error(),
					})
				continue
			}
			tools = append(tools, tool)
		}

		logger.InfoCF("mcp", "Listed tools from MCP server",
			map[string]any{
				"server":    name,
				"toolCount": len(tools),
			})
	}

	return &ServerConnection{
		Name:    name,
		Client:  client,
		Session: session,
		Tools:   tools,
		config:  cfg,
	}, nil
}

// GetServers returns all connected servers
func (m *Manager) GetServers() map[string]*ServerConnection {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]*ServerConnection, len(m.servers))
	for k, v := range m.servers {
		result[k] = v
	}
	return result
}

// GetServer returns a specific server connection
func (m *Manager) GetServer(name string) (*ServerConnection, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conn, ok := m.servers[name]
	return conn, ok
}

// CallTool calls a tool on a specific server
func (m *Manager) CallTool(
	ctx context.Context,
	serverName, toolName string,
	arguments map[string]any,
) (*mcp.CallToolResult, error) {
	// Check if closed before acquiring lock (fast path)
	if m.closed.Load() {
		return nil, fmt.Errorf("manager is closed")
	}

	m.mu.RLock()
	// Double-check after acquiring lock to prevent TOCTOU race
	if m.closed.Load() {
		m.mu.RUnlock()
		return nil, fmt.Errorf("manager is closed")
	}
	if m.beforeCallAdmit != nil {
		m.beforeCallAdmit()
	}
	conn, ok := m.servers[serverName]
	if ok {
		m.wg.Add(1) // Add to WaitGroup while holding the lock
	}
	m.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("server %s not found", serverName)
	}
	defer m.wg.Done()

	params := &mcp.CallToolParams{
		Name:      toolName,
		Arguments: arguments,
	}

	// toolguard hook: validate the call before dispatching to
	// the MCP server. A non-nil validator blocks the call by
	// returning an error WITHOUT touching the session. This is
	// the runtime counterpart of the offline checks in
	// mcp_harness_v3 and the acceptance gate.
	if m.validator != nil {
		if r := m.validator.ValidateToolCall(toolName, arguments); !r.OK {
			return nil, fmt.Errorf("toolguard: schema invalid: %s", strings.Join(r.Errors, "; "))
		}
		if r := m.validator.DetectDestructiveOperation(toolName, arguments); r.Destructive {
			return nil, fmt.Errorf("toolguard: destructive operation blocked: %s", r.DestructiveReason)
		}
	}

	result, err := conn.activeSession().CallTool(ctx, params)
	if errors.Is(err, mcp.ErrSessionMissing) {
		conn, reconnectErr := m.reconnect(ctx, serverName, conn)
		if reconnectErr != nil {
			return nil, fmt.Errorf("failed to reconnect server %s: %w", serverName, reconnectErr)
		}
		result, err = conn.activeSession().CallTool(ctx, params)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to call tool: %w", err)
	}

	return result, nil
}

func (m *Manager) reconnect(
	ctx context.Context,
	serverName string,
	stale *ServerConnection,
) (*ServerConnection, error) {
	m.mu.Lock()
	if m.closed.Load() {
		m.mu.Unlock()
		return nil, fmt.Errorf("manager is closed")
	}

	current, ok := m.servers[serverName]
	if !ok {
		m.mu.Unlock()
		return nil, fmt.Errorf("server %s not found", serverName)
	}
	if current != stale {
		m.mu.Unlock()
		return current, nil
	}
	if ongoing, ok := m.reconnects[serverName]; ok {
		m.mu.Unlock()
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ongoing.done:
			return ongoing.conn, ongoing.err
		}
	}

	ongoing := &reconnectCall{done: make(chan struct{})}
	m.reconnects[serverName] = ongoing
	m.wg.Add(1)
	m.mu.Unlock()

	go m.runReconnect(serverName, stale, ongoing)
	return waitReconnect(ctx, ongoing)
}

func waitReconnect(ctx context.Context, ongoing *reconnectCall) (*ServerConnection, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-ongoing.done:
		return ongoing.conn, ongoing.err
	}
}

func (m *Manager) runReconnect(
	serverName string,
	stale *ServerConnection,
	ongoing *reconnectCall,
) {
	defer m.wg.Done()

	fresh, connectErr := m.connector(m.lifecycle, serverName, stale.config)

	var closeFresh, closeStale *ServerConnection
	m.mu.Lock()
	switch {
	case connectErr != nil:
		ongoing.err = connectErr
	case fresh == nil:
		ongoing.err = fmt.Errorf("connector returned nil connection")
	case m.closed.Load():
		ongoing.err = fmt.Errorf("manager is closed")
		closeFresh = fresh
	case m.servers[serverName] != stale:
		ongoing.conn = m.servers[serverName]
		closeFresh = fresh
	default:
		m.servers[serverName] = fresh
		ongoing.conn = fresh
		closeStale = stale
	}
	delete(m.reconnects, serverName)
	close(ongoing.done)
	m.mu.Unlock()

	if closeFresh != nil {
		_ = closeFresh.activeSession().Close()
	}
	if closeStale != nil {
		_ = closeStale.activeSession().Close()
	}
}

// Close closes all server connections
func (m *Manager) Close() error {
	if m.beforeCloseAdmissionLock != nil {
		m.beforeCloseAdmissionLock()
	}

	// Synchronize closing with CallTool admission so every successful wg.Add
	// happens before Wait begins.
	m.mu.Lock()
	if m.closed.Load() {
		m.mu.Unlock()
		return nil // already closed
	}
	m.closed.Store(true)
	m.cancel()
	m.mu.Unlock()

	// Wait for all in-flight CallTool calls to finish before closing sessions
	// After closed=true is set, no new CallTool can start (they check closed first)
	m.wg.Wait()

	m.mu.Lock()
	defer m.mu.Unlock()

	logger.InfoCF("mcp", "Closing all MCP server connections",
		map[string]any{
			"count": len(m.servers),
		})

	var errs []error
	for name, conn := range m.servers {
		if err := conn.activeSession().Close(); err != nil {
			logger.ErrorCF("mcp", "Failed to close server connection",
				map[string]any{
					"server": name,
					"error":  err.Error(),
				})
			errs = append(errs, fmt.Errorf("server %s: %w", name, err))
		}
	}

	m.servers = make(map[string]*ServerConnection)

	if len(errs) > 0 {
		return fmt.Errorf("failed to close %d server(s): %w", len(errs), errors.Join(errs...))
	}

	return nil
}

// GetAllTools returns all tools from all connected servers
func (m *Manager) GetAllTools() map[string][]*mcp.Tool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string][]*mcp.Tool)
	for name, conn := range m.servers {
		if len(conn.Tools) > 0 {
			result[name] = conn.Tools
		}
	}
	return result
}
