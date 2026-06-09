package mcp

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/nicolasramos/odooclaw/pkg/config"
)

func TestLoadEnvFile(t *testing.T) {
	tests := []struct {
		name      string
		content   string
		expected  map[string]string
		expectErr bool
	}{
		{
			name: "basic env file",
			content: `API_KEY=secret123
DATABASE_URL=postgres://localhost/db
PORT=8080`,
			expected: map[string]string{
				"API_KEY":      "secret123",
				"DATABASE_URL": "postgres://localhost/db",
				"PORT":         "8080",
			},
			expectErr: false,
		},
		{
			name: "with comments and empty lines",
			content: `# This is a comment
API_KEY=secret123

# Another comment
DATABASE_URL=postgres://localhost/db

PORT=8080`,
			expected: map[string]string{
				"API_KEY":      "secret123",
				"DATABASE_URL": "postgres://localhost/db",
				"PORT":         "8080",
			},
			expectErr: false,
		},
		{
			name: "with quoted values",
			content: `API_KEY="secret with spaces"
NAME='single quoted'
PLAIN=no-quotes`,
			expected: map[string]string{
				"API_KEY": "secret with spaces",
				"NAME":    "single quoted",
				"PLAIN":   "no-quotes",
			},
			expectErr: false,
		},
		{
			name: "with spaces around equals",
			content: `API_KEY = secret123
DATABASE_URL= postgres://localhost/db
PORT =8080`,
			expected: map[string]string{
				"API_KEY":      "secret123",
				"DATABASE_URL": "postgres://localhost/db",
				"PORT":         "8080",
			},
			expectErr: false,
		},
		{
			name:      "invalid format - no equals",
			content:   `INVALID_LINE`,
			expectErr: true,
		},
		{
			name:      "empty file",
			content:   ``,
			expected:  map[string]string{},
			expectErr: false,
		},
		{
			name: "only comments",
			content: `# Comment 1
# Comment 2`,
			expected:  map[string]string{},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			envFile := filepath.Join(tmpDir, ".env")

			if err := os.WriteFile(envFile, []byte(tt.content), 0o644); err != nil {
				t.Fatalf("Failed to create test file: %v", err)
			}

			result, err := loadEnvFile(envFile)

			if tt.expectErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if len(result) != len(tt.expected) {
				t.Errorf("Expected %d variables, got %d", len(tt.expected), len(result))
			}

			for key, expectedValue := range tt.expected {
				if actualValue, ok := result[key]; !ok {
					t.Errorf("Expected key %s not found", key)
				} else if actualValue != expectedValue {
					t.Errorf("For key %s: expected %q, got %q", key, expectedValue, actualValue)
				}
			}
		})
	}
}

func TestLoadEnvFileNotFound(t *testing.T) {
	_, err := loadEnvFile("/nonexistent/file.env")
	if err == nil {
		t.Error("Expected error for nonexistent file")
	}
}

func TestEnvFilePriority(t *testing.T) {
	// Create a temporary .env file
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")

	envContent := `API_KEY=from_file
DATABASE_URL=from_file
SHARED_VAR=from_file`

	if err := os.WriteFile(envFile, []byte(envContent), 0o644); err != nil {
		t.Fatalf("Failed to create .env file: %v", err)
	}

	// Load envFile
	envVars, err := loadEnvFile(envFile)
	if err != nil {
		t.Fatalf("Failed to load env file: %v", err)
	}

	// Verify envFile variables
	if envVars["API_KEY"] != "from_file" {
		t.Errorf("Expected API_KEY=from_file, got %s", envVars["API_KEY"])
	}

	// Simulate config.Env overriding envFile
	configEnv := map[string]string{
		"SHARED_VAR": "from_config",
		"NEW_VAR":    "from_config",
	}

	// Merge: envFile first, then config overrides
	merged := make(map[string]string)
	for k, v := range envVars {
		merged[k] = v
	}
	for k, v := range configEnv {
		merged[k] = v
	}

	// Verify priority: config.Env should override envFile
	if merged["SHARED_VAR"] != "from_config" {
		t.Errorf(
			"Expected SHARED_VAR=from_config (config should override file), got %s",
			merged["SHARED_VAR"],
		)
	}
	if merged["API_KEY"] != "from_file" {
		t.Errorf("Expected API_KEY=from_file, got %s", merged["API_KEY"])
	}
	if merged["NEW_VAR"] != "from_config" {
		t.Errorf("Expected NEW_VAR=from_config, got %s", merged["NEW_VAR"])
	}
}

func TestLoadFromMCPConfig_EmptyWorkspaceWithRelativeEnvFile(t *testing.T) {
	mgr := NewManager()

	mcpCfg := config.MCPConfig{
		Enabled: true,
		Servers: map[string]config.MCPServerConfig{
			"test-server": {
				Enabled: true,
				Command: "echo",
				Args:    []string{"ok"},
				EnvFile: ".env",
			},
		},
	}

	err := mgr.LoadFromMCPConfig(context.Background(), mcpCfg, "")
	if err == nil {
		t.Fatal("expected error for relative env_file with empty workspace path, got nil")
	}

	if !strings.Contains(err.Error(), "workspace path is empty") {
		t.Fatalf("expected workspace path validation error, got: %v", err)
	}
}

func TestNewManager_InitialState(t *testing.T) {
	mgr := NewManager()
	if mgr == nil {
		t.Fatal("expected manager instance, got nil")
	}
	if len(mgr.GetServers()) != 0 {
		t.Fatalf("expected no servers on new manager, got %d", len(mgr.GetServers()))
	}
}

func TestLoadFromMCPConfig_DisabledOrEmptyServers(t *testing.T) {
	mgr := NewManager()

	err := mgr.LoadFromMCPConfig(context.Background(), config.MCPConfig{Enabled: false}, "/tmp")
	if err != nil {
		t.Fatalf("expected nil error when MCP disabled, got: %v", err)
	}

	err = mgr.LoadFromMCPConfig(context.Background(), config.MCPConfig{Enabled: true}, "/tmp")
	if err != nil {
		t.Fatalf("expected nil error when no servers configured, got: %v", err)
	}
}

func TestGetServers_ReturnsCopy(t *testing.T) {
	mgr := NewManager()
	mgr.servers["s1"] = &ServerConnection{Name: "s1"}

	servers := mgr.GetServers()
	delete(servers, "s1")

	if _, ok := mgr.GetServer("s1"); !ok {
		t.Fatal("expected internal manager state to remain unchanged")
	}
}

func TestGetAllTools_FiltersEmptyTools(t *testing.T) {
	mgr := NewManager()
	mgr.servers["empty"] = &ServerConnection{Name: "empty", Tools: nil}
	mgr.servers["with-tools"] = &ServerConnection{Name: "with-tools", Tools: []*sdkmcp.Tool{{}}}

	all := mgr.GetAllTools()
	if _, ok := all["empty"]; ok {
		t.Fatal("expected server without tools to be excluded")
	}
	if _, ok := all["with-tools"]; !ok {
		t.Fatal("expected server with tools to be included")
	}
}

func TestCallTool_ErrorsForClosedOrMissingServer(t *testing.T) {
	t.Run("manager closed", func(t *testing.T) {
		mgr := NewManager()
		mgr.closed.Store(true)

		_, err := mgr.CallTool(context.Background(), "s1", "tool", nil)
		if err == nil || !strings.Contains(err.Error(), "manager is closed") {
			t.Fatalf("expected manager closed error, got: %v", err)
		}
	})

	t.Run("server missing", func(t *testing.T) {
		mgr := NewManager()

		_, err := mgr.CallTool(context.Background(), "missing", "tool", nil)
		if err == nil || !strings.Contains(err.Error(), "not found") {
			t.Fatalf("expected server not found error, got: %v", err)
		}
	})
}

func TestClose_IdempotentOnEmptyManager(t *testing.T) {
	mgr := NewManager()

	if err := mgr.Close(); err != nil {
		t.Fatalf("first close should succeed, got: %v", err)
	}
	if err := mgr.Close(); err != nil {
		t.Fatalf("second close should be idempotent, got: %v", err)
	}
}

type fakeToolSession struct {
	mu          sync.Mutex
	results     []*sdkmcp.CallToolResult
	errs        []error
	callStarted chan<- struct{}
	releaseCall <-chan struct{}
	callCount   atomic.Int32
	closeCount  atomic.Int32
}

func (s *fakeToolSession) CallTool(
	context.Context,
	*sdkmcp.CallToolParams,
) (*sdkmcp.CallToolResult, error) {
	index := int(s.callCount.Add(1)) - 1
	if s.callStarted != nil {
		s.callStarted <- struct{}{}
	}
	if s.releaseCall != nil {
		<-s.releaseCall
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if index >= len(s.errs) {
		return nil, fmt.Errorf("unexpected call %d", index+1)
	}
	var result *sdkmcp.CallToolResult
	if index < len(s.results) {
		result = s.results[index]
	}
	return result, s.errs[index]
}

func (s *fakeToolSession) Close() error {
	s.closeCount.Add(1)
	return nil
}

func testConnection(name string, session clientSession) *ServerConnection {
	return &ServerConnection{
		Name:        name,
		callSession: session,
		config:      config.MCPServerConfig{Enabled: true, URL: "http://example.test"},
	}
}

func TestCallTool_RetriesOnlyErrSessionMissing(t *testing.T) {
	tests := []struct {
		name          string
		firstErr      error
		wantReconnect bool
	}{
		{
			name:          "sentinel wrapped",
			firstErr:      fmt.Errorf("request failed: %w", sdkmcp.ErrSessionMissing),
			wantReconnect: true,
		},
		{
			name:     "similar text is not sentinel",
			firstErr: errors.New("request failed: session not found"),
		},
		{
			name:     "ambiguous EOF",
			firstErr: errors.New("EOF"),
		},
		{
			name:     "context cancellation",
			firstErr: context.Canceled,
		},
		{
			name:     "generic transport error",
			firstErr: errors.New("HTTP 500"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldSession := &fakeToolSession{errs: []error{tt.firstErr}}
			newSession := &fakeToolSession{
				results: []*sdkmcp.CallToolResult{{}},
				errs:    []error{nil},
			}
			mgr := NewManager()
			mgr.servers["odoo"] = testConnection("odoo", oldSession)
			var reconnects atomic.Int32
			mgr.connector = func(
				context.Context,
				string,
				config.MCPServerConfig,
			) (*ServerConnection, error) {
				reconnects.Add(1)
				return testConnection("odoo", newSession), nil
			}

			result, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
			if tt.wantReconnect {
				if err != nil {
					t.Fatalf("expected retry success, got: %v", err)
				}
				if result == nil {
					t.Fatal("expected retry result")
				}
				if reconnects.Load() != 1 {
					t.Fatalf("expected one reconnect, got %d", reconnects.Load())
				}
				if newSession.callCount.Load() != 1 {
					t.Fatalf("expected one retry, got %d", newSession.callCount.Load())
				}
				return
			}

			if err == nil {
				t.Fatal("expected original call error")
			}
			if reconnects.Load() != 0 {
				t.Fatalf("unsafe reconnect for ambiguous error: %d", reconnects.Load())
			}
			if newSession.callCount.Load() != 0 {
				t.Fatalf("unsafe retry for ambiguous error: %d", newSession.callCount.Load())
			}
		})
	}
}

func TestCallTool_SecondSessionMissingDoesNotRetryAgain(t *testing.T) {
	oldSession := &fakeToolSession{errs: []error{sdkmcp.ErrSessionMissing}}
	newSession := &fakeToolSession{errs: []error{sdkmcp.ErrSessionMissing}}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", oldSession)
	var reconnects atomic.Int32
	mgr.connector = func(
		context.Context,
		string,
		config.MCPServerConfig,
	) (*ServerConnection, error) {
		reconnects.Add(1)
		return testConnection("odoo", newSession), nil
	}

	_, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
	if !errors.Is(err, sdkmcp.ErrSessionMissing) {
		t.Fatalf("expected second session missing error, got: %v", err)
	}
	if reconnects.Load() != 1 {
		t.Fatalf("expected exactly one reconnect, got %d", reconnects.Load())
	}
	if oldSession.callCount.Load() != 1 || newSession.callCount.Load() != 1 {
		t.Fatalf(
			"expected exactly two calls, got old=%d new=%d",
			oldSession.callCount.Load(),
			newSession.callCount.Load(),
		)
	}
}

func TestCallTool_ConcurrentSessionMissingDeduplicatesReconnect(t *testing.T) {
	const callers = 16

	staleCallsStarted := make(chan struct{}, callers)
	releaseStaleCalls := make(chan struct{})
	oldSession := &fakeToolSession{
		errs:        make([]error, callers),
		callStarted: staleCallsStarted,
		releaseCall: releaseStaleCalls,
	}
	for i := range oldSession.errs {
		oldSession.errs[i] = sdkmcp.ErrSessionMissing
	}
	newSession := &fakeToolSession{
		results: make([]*sdkmcp.CallToolResult, callers),
		errs:    make([]error, callers),
	}
	for i := range newSession.results {
		newSession.results[i] = &sdkmcp.CallToolResult{}
	}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", oldSession)
	reconnectStarted := make(chan struct{})
	releaseReconnect := make(chan struct{})
	var reconnects atomic.Int32
	mgr.connector = func(
		context.Context,
		string,
		config.MCPServerConfig,
	) (*ServerConnection, error) {
		if reconnects.Add(1) == 1 {
			close(reconnectStarted)
		}
		<-releaseReconnect
		return testConnection("odoo", newSession), nil
	}

	errs := make(chan error, callers)
	var wg sync.WaitGroup
	for range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
			errs <- err
		}()
	}

	for range callers {
		<-staleCallsStarted
	}
	if oldSession.callCount.Load() != callers {
		t.Fatalf("expected all %d callers on stale session, got %d", callers, oldSession.callCount.Load())
	}
	close(releaseStaleCalls)
	<-reconnectStarted
	close(releaseReconnect)
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("expected retry success, got: %v", err)
		}
	}
	if reconnects.Load() != 1 {
		t.Fatalf("expected one deduplicated reconnect, got %d", reconnects.Load())
	}
	if oldSession.closeCount.Load() != 1 {
		t.Fatalf("expected stale session closed once, got %d", oldSession.closeCount.Load())
	}
	if newSession.callCount.Load() != callers {
		t.Fatalf("expected %d retries, got %d", callers, newSession.callCount.Load())
	}
}

func TestClose_WaitsForCallAdmittedBeforeCloseWait(t *testing.T) {
	sessionCallStarted := make(chan struct{}, 1)
	releaseSessionCall := make(chan struct{})
	session := &fakeToolSession{
		results:     []*sdkmcp.CallToolResult{{}},
		errs:        []error{nil},
		callStarted: sessionCallStarted,
		releaseCall: releaseSessionCall,
	}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", session)

	admissionReached := make(chan struct{})
	releaseAdmission := make(chan struct{})
	mgr.beforeCallAdmit = func() {
		close(admissionReached)
		<-releaseAdmission
	}
	closeAdmissionStarted := make(chan struct{})
	mgr.beforeCloseAdmissionLock = func() {
		close(closeAdmissionStarted)
	}

	callDone := make(chan error, 1)
	go func() {
		_, err := mgr.CallTool(context.Background(), "odoo", "read", nil)
		callDone <- err
	}()
	<-admissionReached

	closeDone := make(chan error, 1)
	go func() {
		closeDone <- mgr.Close()
	}()
	<-closeAdmissionStarted
	close(releaseAdmission)
	<-sessionCallStarted

	select {
	case err := <-closeDone:
		t.Fatalf("Close returned before admitted call completed: %v", err)
	default:
	}

	close(releaseSessionCall)
	if err := <-callDone; err != nil {
		t.Fatalf("call failed: %v", err)
	}
	if err := <-closeDone; err != nil {
		t.Fatalf("close failed: %v", err)
	}
}

func TestCallTool_CanceledReconnectLeaderDoesNotPoisonWaiter(t *testing.T) {
	staleCallsStarted := make(chan struct{}, 2)
	oldSession := &fakeToolSession{
		errs:        []error{sdkmcp.ErrSessionMissing, sdkmcp.ErrSessionMissing},
		callStarted: staleCallsStarted,
	}
	newSession := &fakeToolSession{
		results: []*sdkmcp.CallToolResult{{}},
		errs:    []error{nil},
	}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", oldSession)

	reconnectStarted := make(chan struct{})
	releaseReconnect := make(chan struct{})
	reconnectCanceled := make(chan struct{}, 1)
	mgr.connector = func(
		ctx context.Context,
		_ string,
		_ config.MCPServerConfig,
	) (*ServerConnection, error) {
		close(reconnectStarted)
		select {
		case <-ctx.Done():
			reconnectCanceled <- struct{}{}
			return nil, ctx.Err()
		case <-releaseReconnect:
			return testConnection("odoo", newSession), nil
		}
	}

	leaderCtx, cancelLeader := context.WithCancel(context.Background())
	leaderDone := make(chan error, 1)
	go func() {
		_, err := mgr.CallTool(leaderCtx, "odoo", "write", nil)
		leaderDone <- err
	}()
	<-reconnectStarted

	waiterDone := make(chan error, 1)
	go func() {
		_, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
		waiterDone <- err
	}()
	<-staleCallsStarted
	<-staleCallsStarted

	cancelLeader()
	if err := <-leaderDone; !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled leader wait, got: %v", err)
	}
	select {
	case <-reconnectCanceled:
		t.Fatal("leader cancellation canceled shared reconnect")
	default:
	}
	select {
	case err := <-waiterDone:
		t.Fatalf("waiter returned before shared reconnect completed: %v", err)
	default:
	}

	close(releaseReconnect)
	if err := <-waiterDone; err != nil {
		t.Fatalf("waiter retry failed: %v", err)
	}
	if newSession.callCount.Load() != 1 {
		t.Fatalf("expected one waiter retry, got %d", newSession.callCount.Load())
	}
	if err := mgr.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}
}

func TestClose_CancelsReconnectLifecycle(t *testing.T) {
	oldSession := &fakeToolSession{errs: []error{sdkmcp.ErrSessionMissing}}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", oldSession)

	reconnectStarted := make(chan struct{})
	reconnectCanceled := make(chan struct{})
	mgr.connector = func(
		ctx context.Context,
		_ string,
		_ config.MCPServerConfig,
	) (*ServerConnection, error) {
		close(reconnectStarted)
		<-ctx.Done()
		close(reconnectCanceled)
		return nil, ctx.Err()
	}

	callDone := make(chan error, 1)
	go func() {
		_, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
		callDone <- err
	}()
	<-reconnectStarted

	if err := mgr.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}
	<-reconnectCanceled
	if err := <-callDone; !errors.Is(err, context.Canceled) {
		t.Fatalf("expected lifecycle cancellation error, got: %v", err)
	}
	if oldSession.closeCount.Load() != 1 {
		t.Fatalf("expected stale session closed once, got %d", oldSession.closeCount.Load())
	}
}

func TestClose_DuringReconnectClosesNewAndStaleSessions(t *testing.T) {
	oldSession := &fakeToolSession{errs: []error{sdkmcp.ErrSessionMissing}}
	newSession := &fakeToolSession{errs: []error{nil}}
	mgr := NewManager()
	mgr.servers["odoo"] = testConnection("odoo", oldSession)
	reconnectStarted := make(chan struct{})
	releaseReconnect := make(chan struct{})
	mgr.connector = func(
		context.Context,
		string,
		config.MCPServerConfig,
	) (*ServerConnection, error) {
		close(reconnectStarted)
		<-releaseReconnect
		return testConnection("odoo", newSession), nil
	}

	callErr := make(chan error, 1)
	go func() {
		_, err := mgr.CallTool(context.Background(), "odoo", "write", nil)
		callErr <- err
	}()
	<-reconnectStarted

	closeErr := make(chan error, 1)
	go func() {
		closeErr <- mgr.Close()
	}()
	for !mgr.closed.Load() {
		runtime.Gosched()
	}
	close(releaseReconnect)

	if err := <-callErr; err == nil || !strings.Contains(err.Error(), "manager is closed") {
		t.Fatalf("expected manager closed error, got: %v", err)
	}
	if err := <-closeErr; err != nil {
		t.Fatalf("close failed: %v", err)
	}
	if oldSession.closeCount.Load() != 1 {
		t.Fatalf("expected stale session closed once, got %d", oldSession.closeCount.Load())
	}
	if newSession.closeCount.Load() != 1 {
		t.Fatalf("expected new session closed once, got %d", newSession.closeCount.Load())
	}
	if len(mgr.GetServers()) != 0 {
		t.Fatal("expected no server retained after close")
	}
}
