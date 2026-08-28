// OdooClaw - Ultra-lightweight personal AI agent
// Inspired by and based on nanobot: https://github.com/HKUDS/nanobot
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/browsercopilot"
	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
	"github.com/nicolasramos/odooclaw/pkg/constants"
	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/mcp"
	"github.com/nicolasramos/odooclaw/pkg/media"
	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
	"github.com/nicolasramos/odooclaw/pkg/multimodel"
	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/routing"
	"github.com/nicolasramos/odooclaw/pkg/skills"
	"github.com/nicolasramos/odooclaw/pkg/state"
	"github.com/nicolasramos/odooclaw/pkg/tools"
	"github.com/nicolasramos/odooclaw/pkg/utils"
)

type AgentLoop struct {
	bus            *bus.MessageBus
	cfg            *config.Config
	registry       *AgentRegistry
	state          *state.Manager
	running        atomic.Bool
	summarizing    sync.Map
	fallback       *providers.FallbackChain
	channelManager *channels.Manager
	mediaStore     media.MediaStore
	mcpManager     *mcp.Manager
	pipeline       *multimodel.Pipeline // Multi-model pipeline (nil when disabled)
}

// processOptions configures how a message is processed
type processOptions struct {
	SessionKey      string // Session identifier for history/context
	Channel         string // Target channel for tool execution
	ChatID          string // Target chat ID for tool execution
	SenderID        string // Original inbound sender ID
	Metadata        map[string]string
	UserMessage     string   // User message content (may include prefix)
	Media           []string // media:// refs from inbound message
	DefaultResponse string   // Response when LLM returns empty
	EnableSummary   bool     // Whether to trigger summarization
	SendResponse    bool     // Whether to send response via bus
	NoHistory       bool     // If true, don't load session history (for heartbeat)
}

const defaultResponse = "I've completed processing but have no response to give. Increase `max_tool_iterations` in config.json."

func NewAgentLoop(
	cfg *config.Config,
	msgBus *bus.MessageBus,
	provider providers.LLMProvider,
) *AgentLoop {
	registry := NewAgentRegistry(cfg, provider)

	// Register shared tools to all agents
	registerSharedTools(cfg, msgBus, registry, provider)

	// Set up shared fallback chain
	cooldown := providers.NewCooldownTracker()
	fallbackChain := providers.NewFallbackChain(cooldown)

	// Create state manager using default agent's workspace for channel recording
	defaultAgent := registry.GetDefaultAgent()
	var stateManager *state.Manager
	if defaultAgent != nil {
		stateManager = state.NewManager(defaultAgent.Workspace)
	}

	// Initialize multi-model pipeline if configured
	var pipeline *multimodel.Pipeline
	if cfg.Multimodel.Enabled {
		pipelineCfg := multimodel.PipelineConfig{
			Enabled: true,
			Classifier: multimodel.ClassifierConfig{
				Endpoint: cfg.Multimodel.Classifier.Endpoint,
				APIKey:   cfg.Multimodel.Classifier.APIKey,
				Model:    cfg.Multimodel.Classifier.Model,
			},
			Router: multimodel.RouterConfig{
				Routes: map[string]*multimodel.ModelConfig{
					"tool_call": {
						Name:        "tool-model",
						Endpoint:    cfg.Multimodel.Router.ToolCalling.Endpoint,
						ModelID:     cfg.Multimodel.Router.ToolCalling.ModelID,
						MaxTokens:   cfg.Multimodel.Router.ToolCalling.MaxTokens,
						Temperature: cfg.Multimodel.Router.ToolCalling.Temperature,
					},
					"summary": {
						Name:        "summarizer-model",
						Endpoint:    cfg.Multimodel.Router.Summarizer.Endpoint,
						ModelID:     cfg.Multimodel.Router.Summarizer.ModelID,
						MaxTokens:   cfg.Multimodel.Router.Summarizer.MaxTokens,
						Temperature: cfg.Multimodel.Router.Summarizer.Temperature,
					},
					"complex": {
						Name:        "complex-model",
						Endpoint:    cfg.Multimodel.Router.Complex.Endpoint,
						ModelID:     cfg.Multimodel.Router.Complex.ModelID,
						MaxTokens:   cfg.Multimodel.Router.Complex.MaxTokens,
						Temperature: cfg.Multimodel.Router.Complex.Temperature,
					},
				},
				Fallback: &multimodel.ModelConfig{
					Name:        "primary-model",
					MaxTokens:   cfg.Agents.Defaults.MaxTokens,
					Temperature: 0.7,
				},
			},
		}
		pipeline = multimodel.NewPipeline(pipelineCfg, provider)
		logger.InfoCF("agent", "Multi-model pipeline initialized", map[string]any{
			"classifier_endpoint": cfg.Multimodel.Classifier.Endpoint,
		})
	}

	return &AgentLoop{
		bus:         msgBus,
		cfg:         cfg,
		registry:    registry,
		state:       stateManager,
		summarizing: sync.Map{},
		fallback:    fallbackChain,
		pipeline:    pipeline,
	}
}

// registerSharedTools registers tools that are shared across all agents (web, message, spawn).
func registerSharedTools(
	cfg *config.Config,
	msgBus *bus.MessageBus,
	registry *AgentRegistry,
	provider providers.LLMProvider,
) {
	for _, agentID := range registry.ListAgentIDs() {
		agent, ok := registry.GetAgent(agentID)
		if !ok {
			continue
		}

		// Web tools
		searchTool, err := tools.NewWebSearchTool(tools.WebSearchToolOptions{
			BraveAPIKey:          cfg.Tools.Web.Brave.APIKey,
			BraveMaxResults:      cfg.Tools.Web.Brave.MaxResults,
			BraveEnabled:         cfg.Tools.Web.Brave.Enabled,
			TavilyAPIKey:         cfg.Tools.Web.Tavily.APIKey,
			TavilyBaseURL:        cfg.Tools.Web.Tavily.BaseURL,
			TavilyMaxResults:     cfg.Tools.Web.Tavily.MaxResults,
			TavilyEnabled:        cfg.Tools.Web.Tavily.Enabled,
			DuckDuckGoMaxResults: cfg.Tools.Web.DuckDuckGo.MaxResults,
			DuckDuckGoEnabled:    cfg.Tools.Web.DuckDuckGo.Enabled,
			PerplexityAPIKey:     cfg.Tools.Web.Perplexity.APIKey,
			PerplexityMaxResults: cfg.Tools.Web.Perplexity.MaxResults,
			PerplexityEnabled:    cfg.Tools.Web.Perplexity.Enabled,
			Proxy:                cfg.Tools.Web.Proxy,
		})
		if err != nil {
			logger.ErrorCF("agent", "Failed to create web search tool", map[string]any{"error": err.Error()})
		} else if searchTool != nil {
			agent.Tools.Register(searchTool)
		}
		fetchTool, err := tools.NewWebFetchToolWithProxy(50000, cfg.Tools.Web.Proxy, cfg.Tools.Web.FetchLimitBytes)
		if err != nil {
			logger.ErrorCF("agent", "Failed to create web fetch tool", map[string]any{"error": err.Error()})
		} else {
			agent.Tools.Register(fetchTool)
		}

		// Hardware tools (I2C, SPI) - Linux only, returns error on other platforms
		// Only register when devices are enabled (small local models are trained
		// exclusively on Odoo MCP tools and hallucinate on unrelated hardware tools)
		if cfg.Devices.Enabled {
			agent.Tools.Register(tools.NewI2CTool())
			agent.Tools.Register(tools.NewSPITool())
		}

		// Message tool
		messageTool := tools.NewMessageTool()
		messageTool.SetSendCallback(func(channel, chatID, content string) error {
			pubCtx, pubCancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer pubCancel()
			return msgBus.PublishOutbound(pubCtx, bus.OutboundMessage{
				Channel: channel,
				ChatID:  chatID,
				Content: content,
			})
		})
		agent.Tools.Register(messageTool)
		agent.Tools.Register(tools.NewMemorySearchTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemorySaveDecisionTool())
		agent.Tools.Register(tools.NewMemorySaveTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemoryAddFactTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemoryQueryFactsTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemoryGetTimelineTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemoryDebugExplainRetrievalTool(agent.Workspace))
		agent.Tools.Register(tools.NewMemoryImportHistoryTool(agent.Workspace))

		// NRA-511: structured session memory tools (state + pending confirmations)
		sessionMemStore := corememory.NewSessionMemoryStore(filepath.Join(agent.Workspace, "memory"))
		agent.Tools.Register(tools.NewMemorySetSessionStateTool(sessionMemStore))
		agent.Tools.Register(tools.NewMemorySetPendingTool(sessionMemStore))
		agent.Tools.Register(tools.NewMemoryClearPendingTool(sessionMemStore))

		// Skill discovery and installation tools
		registryMgr := skills.NewRegistryManagerFromConfig(skills.RegistryConfig{
			MaxConcurrentSearches: cfg.Tools.Skills.MaxConcurrentSearches,
			ClawHub:               skills.ClawHubConfig(cfg.Tools.Skills.Registries.ClawHub),
		})
		searchCache := skills.NewSearchCache(
			cfg.Tools.Skills.SearchCache.MaxSize,
			time.Duration(cfg.Tools.Skills.SearchCache.TTLSeconds)*time.Second,
		)
		agent.Tools.Register(tools.NewFindSkillsTool(registryMgr, searchCache))
		agent.Tools.Register(tools.NewInstallSkillTool(registryMgr, agent.Workspace))

		// Spawn tool with allowlist checker
		subagentManager := tools.NewSubagentManager(provider, agent.Model, agent.Workspace, msgBus)
		subagentManager.SetLLMOptions(agent.MaxTokens, agent.Temperature)
		spawnTool := tools.NewSpawnTool(subagentManager)
		currentAgentID := agentID
		spawnTool.SetAllowlistChecker(func(targetAgentID string) bool {
			return registry.CanSpawnSubagent(currentAgentID, targetAgentID)
		})
		agent.Tools.Register(spawnTool)
	}
}

func (al *AgentLoop) Run(ctx context.Context) error {
	al.running.Store(true)

	// Initialize MCP servers for all agents
	if al.cfg.Tools.MCP.Enabled {
		mcpManager := mcp.NewManager()
		al.mcpManager = mcpManager
		// Ensure MCP connections are cleaned up on exit, regardless of initialization success
		// This fixes resource leak when LoadFromMCPConfig partially succeeds then fails
		defer func() {
			if err := mcpManager.Close(); err != nil {
				logger.ErrorCF("agent", "Failed to close MCP manager",
					map[string]any{
						"error": err.Error(),
					})
			}
		}()

		defaultAgent := al.registry.GetDefaultAgent()
		var workspacePath string
		if defaultAgent != nil && defaultAgent.Workspace != "" {
			workspacePath = defaultAgent.Workspace
		} else {
			workspacePath = al.cfg.WorkspacePath()
		}

		if err := mcpManager.LoadFromMCPConfig(ctx, al.cfg.Tools.MCP, workspacePath); err != nil {
			logger.WarnCF("agent", "Failed to load MCP servers, MCP tools will not be available",
				map[string]any{
					"error": err.Error(),
				})
		} else {
			// Register MCP tools for all agents
			servers := mcpManager.GetServers()
			if al.cfg.Engram.Enabled {
				if _, ok := servers[al.cfg.Engram.MCPServer]; ok {
					engramClient := corememory.NewEngramMCPClient(mcpManager, al.cfg.Engram.MCPServer)
					memoryRouter := corememory.NewMemoryRouter(true, engramClient)
					al.RegisterTool(tools.NewStrategicMemorySaveTool(memoryRouter))
					logger.InfoCF("agent", "Registered strategic memory tool", map[string]any{
						"server": al.cfg.Engram.MCPServer,
					})
				} else {
					logger.WarnCF("agent", "Engram is enabled but MCP server is not connected", map[string]any{
						"server": al.cfg.Engram.MCPServer,
					})
				}
			}
			uniqueTools := 0
			totalRegistrations := 0
			agentIDs := al.registry.ListAgentIDs()
			agentCount := len(agentIDs)

			for serverName, conn := range servers {
				serverCfg := al.cfg.Tools.MCP.Servers[serverName]
				if !shouldAutoRegisterMCPServer(serverCfg) {
					logger.InfoCF("agent", "Skipping internal MCP server auto-registration",
						map[string]any{
							"server": serverName,
							"tools":  len(conn.Tools),
						})
					continue
				}

				uniqueTools += len(conn.Tools)
				for _, tool := range conn.Tools {
					for _, agentID := range agentIDs {
						agent, ok := al.registry.GetAgent(agentID)
						if !ok {
							continue
						}
						mcpTool := tools.NewMCPTool(mcpManager, serverName, tool)
						agent.Tools.Register(mcpTool)
						totalRegistrations++
						logger.DebugCF("agent", "Registered MCP tool",
							map[string]any{
								"agent_id": agentID,
								"server":   serverName,
								"tool":     tool.Name,
								"name":     mcpTool.Name(),
							})
					}
				}
			}
			logger.InfoCF("agent", "MCP tools registered successfully",
				map[string]any{
					"server_count":        len(servers),
					"unique_tools":        uniqueTools,
					"total_registrations": totalRegistrations,
					"agent_count":         agentCount,
				})
		}

		// Wire the Odoo system webhook (/webhook/odoo/system) to invalidate
		// the MCP odoo-mcp allowlist cache. The Python policy cache lives in
		// the MCP server process; the gateway reaches it through an MCP tool
		// call on the existing stdio session. If no odoo MCP server is
		// connected, the 60s TTL remains the degradation fallback.
		al.wireOdooAllowlistCacheResetter(mcpManager)
	}

	for al.running.Load() {
		select {
		case <-ctx.Done():
			return nil
		default:
			msg, ok := al.bus.ConsumeInbound(ctx)
			if !ok {
				continue
			}

			// Process message
			func() {
				// TODO: Re-enable media cleanup after inbound media is properly consumed by the agent.
				// Currently disabled because files are deleted before the LLM can access their content.
				// defer func() {
				// 	if al.mediaStore != nil && msg.MediaScope != "" {
				// 		if releaseErr := al.mediaStore.ReleaseAll(msg.MediaScope); releaseErr != nil {
				// 			logger.WarnCF("agent", "Failed to release media", map[string]any{
				// 				"scope": msg.MediaScope,
				// 				"error": releaseErr.Error(),
				// 			})
				// 		}
				// 	}
				// }()

				response, err := al.processMessage(ctx, msg)
				if err != nil {
					response = fmt.Sprintf("Error processing message: %v", err)
				}

				if response != "" {
					// Check if the message tool already sent a response during this round.
					// If so, skip publishing to avoid duplicate messages to the user.
					// Use default agent's tools to check (message tool is shared).
					alreadySent := false
					defaultAgent := al.registry.GetDefaultAgent()
					if defaultAgent != nil {
						if tool, ok := defaultAgent.Tools.Get("message"); ok {
							if mt, ok := tool.(*tools.MessageTool); ok {
								alreadySent = mt.HasSentInRound()
							}
						}
					}

					if !alreadySent {
						al.bus.PublishOutbound(ctx, bus.OutboundMessage{
							Channel: msg.Channel,
							ChatID:  msg.ChatID,
							Content: response,
						})
						logger.InfoCF("agent", "Published outbound response",
							map[string]any{
								"channel":     msg.Channel,
								"chat_id":     msg.ChatID,
								"content_len": len(response),
							})
					} else {
						logger.DebugCF(
							"agent",
							"Skipped outbound (message tool already sent)",
							map[string]any{"channel": msg.Channel},
						)
					}
				}
			}()
		}
	}

	return nil
}

func shouldAutoRegisterMCPServer(cfg config.MCPServerConfig) bool {
	return !cfg.ExcludeFromAutoRegister
}

func (al *AgentLoop) Stop() {
	al.running.Store(false)
}

func (al *AgentLoop) RegisterTool(tool tools.Tool) {
	for _, agentID := range al.registry.ListAgentIDs() {
		if agent, ok := al.registry.GetAgent(agentID); ok {
			agent.Tools.Register(tool)
		}
	}
}

func (al *AgentLoop) SetChannelManager(cm *channels.Manager) {
	al.channelManager = cm
}

// GetMCPManager returns the MCP manager used by the agent loop, or nil if MCP
// is disabled or the loop has not started yet. It is used by the gateway to
// wire the /system endpoint's validator reload callback.
func (al *AgentLoop) GetMCPManager() *mcp.Manager {
	return al.mcpManager
}

// wireOdooAllowlistCacheResetter connects the Odoo system webhook
// (/webhook/odoo/system) to the MCP odoo-mcp server's allowlist cache
// invalidation tool. The Python policy cache lives in the MCP server
// process, so the gateway reaches it through a tools/call on the existing
// stdio session (Go→MCP). No-op when the odoo channel is absent, the MCP
// server is not connected, or the channel does not expose a resetter hook.
func (al *AgentLoop) wireOdooAllowlistCacheResetter(mcpManager *mcp.Manager) {
	if al.channelManager == nil || mcpManager == nil {
		return
	}
	ch, ok := al.channelManager.GetChannel("odoo")
	if !ok {
		return
	}
	resetter, ok := ch.(channels.AllowlistCacheResetter)
	if !ok {
		return
	}
	serverName := odooMCPServerName(mcpManager)
	if serverName == "" {
		logger.WarnC("agent", "odoo MCP server not connected; allowlist cache reset unavailable (60s TTL fallback)")
		return
	}
	resetter.SetAllowlistCacheResetter(func(ctx context.Context) error {
		_, err := mcpManager.CallTool(ctx, serverName, "reset_allowed_models_cache", map[string]any{})
		return err
	})
	logger.InfoCF("agent", "Wired Odoo allowlist cache resetter", map[string]any{
		"mcp_server": serverName,
	})
}

// odooMCPServerName returns the connected MCP server name for the Odoo MCP
// (config may key it as "odoo-mcp" or "odoo-manager"), or "" if not connected.
func odooMCPServerName(m *mcp.Manager) string {
	for _, name := range []string{"odoo-mcp", "odoo-manager"} {
		if _, ok := m.GetServer(name); ok {
			return name
		}
	}
	return ""
}

// SetMediaStore injects a MediaStore for media lifecycle management.
func (al *AgentLoop) SetMediaStore(s media.MediaStore) {
	al.mediaStore = s
}

// inferMediaType determines the media type ("image", "audio", "video", "file")
// from a filename and MIME content type.
func inferMediaType(filename, contentType string) string {
	ct := strings.ToLower(contentType)
	fn := strings.ToLower(filename)

	if strings.HasPrefix(ct, "image/") {
		return "image"
	}
	if strings.HasPrefix(ct, "audio/") || ct == "application/ogg" {
		return "audio"
	}
	if strings.HasPrefix(ct, "video/") {
		return "video"
	}

	// Fallback: infer from extension
	ext := filepath.Ext(fn)
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg":
		return "image"
	case ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".wma", ".opus":
		return "audio"
	case ".mp4", ".avi", ".mov", ".webm", ".mkv":
		return "video"
	}

	return "file"
}

// RecordLastChannel records the last active channel for this workspace.
// This uses the atomic state save mechanism to prevent data loss on crash.
func (al *AgentLoop) RecordLastChannel(channel string) error {
	if al.state == nil {
		return nil
	}
	return al.state.SetLastChannel(channel)
}

// RecordLastChatID records the last active chat ID for this workspace.
// This uses the atomic state save mechanism to prevent data loss on crash.
func (al *AgentLoop) RecordLastChatID(chatID string) error {
	if al.state == nil {
		return nil
	}
	return al.state.SetLastChatID(chatID)
}

func (al *AgentLoop) ProcessDirect(
	ctx context.Context,
	content, sessionKey string,
) (string, error) {
	return al.ProcessDirectWithChannel(ctx, content, sessionKey, "cli", "direct")
}

func (al *AgentLoop) ProcessDirectWithChannel(
	ctx context.Context,
	content, sessionKey, channel, chatID string,
) (string, error) {
	msg := bus.InboundMessage{
		Channel:    channel,
		SenderID:   "cron",
		ChatID:     chatID,
		Content:    content,
		SessionKey: sessionKey,
	}

	return al.processMessage(ctx, msg)
}

// ProcessHeartbeat processes a heartbeat request without session history.
// Each heartbeat is independent and doesn't accumulate context.
func (al *AgentLoop) ProcessHeartbeat(
	ctx context.Context,
	content, channel, chatID string,
) (string, error) {
	agent := al.registry.GetDefaultAgent()
	if agent == nil {
		return "", fmt.Errorf("no default agent for heartbeat")
	}
	return al.runAgentLoop(ctx, agent, processOptions{
		SessionKey:      "heartbeat",
		Channel:         channel,
		ChatID:          chatID,
		UserMessage:     content,
		DefaultResponse: defaultResponse,
		EnableSummary:   false,
		SendResponse:    false,
		NoHistory:       true, // Don't load session history for heartbeat
	})
}

func (al *AgentLoop) processMessage(ctx context.Context, msg bus.InboundMessage) (string, error) {
	// Add message preview to log (show full content for error messages)
	var logContent string
	if strings.Contains(msg.Content, "Error:") || strings.Contains(msg.Content, "error") {
		logContent = msg.Content // Full content for errors
	} else {
		logContent = utils.Truncate(msg.Content, 80)
	}
	logger.InfoCF(
		"agent",
		fmt.Sprintf("Processing message from %s:%s: %s", msg.Channel, msg.SenderID, logContent),
		map[string]any{
			"channel":     msg.Channel,
			"chat_id":     msg.ChatID,
			"sender_id":   msg.SenderID,
			"session_key": msg.SessionKey,
		},
	)

	// Route system messages to processSystemMessage
	if msg.Channel == "system" {
		return al.processSystemMessage(ctx, msg)
	}

	// Check for commands
	if response, handled := al.handleCommand(ctx, msg); handled {
		return response, nil
	}

	if response, handled := al.handleBrowserVisibleRecordQuestion(ctx, msg); handled {
		return response, nil
	}

	if response, handled := al.handleBrowserVisibleTotalsQuestion(ctx, msg); handled {
		return response, nil
	}

	// Route to determine agent and session key
	route := al.registry.ResolveRoute(routing.RouteInput{
		Channel:    msg.Channel,
		AccountID:  msg.Metadata["account_id"],
		Peer:       extractPeer(msg),
		ParentPeer: extractParentPeer(msg),
		GuildID:    msg.Metadata["guild_id"],
		TeamID:     msg.Metadata["team_id"],
	})

	agent, ok := al.registry.GetAgent(route.AgentID)
	if !ok {
		agent = al.registry.GetDefaultAgent()
	}
	if agent == nil {
		return "", fmt.Errorf("no agent available for route (agent_id=%s)", route.AgentID)
	}

	// Reset message-tool state for this round so we don't skip publishing due to a previous round.
	if tool, ok := agent.Tools.Get("message"); ok {
		if mt, ok := tool.(tools.ContextualTool); ok {
			mt.SetContext(msg.Channel, msg.ChatID)
		}
	}

	// Use routed session key, but honor pre-set agent-scoped keys (for ProcessDirect/cron)
	sessionKey := route.SessionKey
	if msg.SessionKey != "" && strings.HasPrefix(msg.SessionKey, "agent:") {
		sessionKey = msg.SessionKey
	}

	logger.InfoCF("agent", "Routed message",
		map[string]any{
			"agent_id":    agent.ID,
			"session_key": sessionKey,
			"matched_by":  route.MatchedBy,
		})

	return al.runAgentLoop(ctx, agent, processOptions{
		SessionKey:      sessionKey,
		Channel:         msg.Channel,
		ChatID:          msg.ChatID,
		SenderID:        msg.SenderID,
		Metadata:        msg.Metadata,
		UserMessage:     msg.Content,
		Media:           msg.Media,
		DefaultResponse: defaultResponse,
		EnableSummary:   true,
		SendResponse:    false,
	})
}

func (al *AgentLoop) handleBrowserVisibleRecordQuestion(ctx context.Context, msg bus.InboundMessage) (string, bool) {
	if !isBrowserVisibleRecordQuestion(msg.Content) {
		return "", false
	}

	client := browsercopilot.NewClientFromEnv()
	ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	resolved, err := client.ResolveContext(ctxTimeout, browsercopilot.ResolveRequest{
		Channel:  msg.Channel,
		ChatID:   msg.ChatID,
		SenderID: msg.SenderID,
	})
	if err != nil || !resolved.Found {
		return "", false
	}

	response := buildBrowserVisibleRecordAnswer(msg.Content, resolved)
	if response == "" {
		return "", false
	}
	return response, true
}

func isBrowserVisibleRecordQuestion(content string) bool {
	lower := strings.ToLower(strings.TrimSpace(content))
	if !strings.Contains(lower, "pantalla") {
		return false
	}
	patterns := []string{
		"qué pedido", "que pedido", "ves el pedido", "qué cliente", "que cliente",
		"qué factura", "que factura", "qué registro", "que registro",
		"qué tengo", "que tengo", "qué veo", "que veo", "ves lo que tengo",
	}
	for _, pattern := range patterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	return false
}

func buildBrowserVisibleRecordAnswer(content string, resolved browsercopilot.ContextResponse) string {
	name := strings.TrimSpace(resolved.App.ProbableRecordName)
	if name == "" {
		name = inferRecordNameFromPageTitle(resolved.PageTitle)
	}
	if name == "" {
		return ""
	}

	label := inferVisibleEntityLabel(content)
	if label == "" {
		label = "registro"
	}
	amounts := extractVisibleAmounts(resolved)
	if amounts.Total != "" {
		return fmt.Sprintf("El %s que tienes en pantalla es **%s**. Total visible: **%s**.", label, name, amounts.Total)
	}
	return fmt.Sprintf("El %s que tienes en pantalla es **%s**.", label, name)
}

func (al *AgentLoop) handleBrowserVisibleTotalsQuestion(ctx context.Context, msg bus.InboundMessage) (string, bool) {
	if !isBrowserVisibleTotalsQuestion(msg.Content) {
		return "", false
	}

	client := browsercopilot.NewClientFromEnv()
	ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	resolved, err := client.ResolveContext(ctxTimeout, browsercopilot.ResolveRequest{
		Channel:  msg.Channel,
		ChatID:   msg.ChatID,
		SenderID: msg.SenderID,
	})
	if err != nil || !resolved.Found {
		return "", false
	}

	response := buildBrowserVisibleTotalsAnswer(msg.Content, resolved)
	if response == "" {
		return "", false
	}
	return response, true
}

func isBrowserVisibleTotalsQuestion(content string) bool {
	lower := strings.ToLower(strings.TrimSpace(content))
	if !strings.Contains(lower, "pantalla") {
		return false
	}
	patterns := []string{"total", "subtotal", "importe", "impuestos", "suma"}
	for _, pattern := range patterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	return false
}

type visibleAmounts struct {
	Base  string
	Tax   string
	Total string
}

func buildBrowserVisibleTotalsAnswer(content string, resolved browsercopilot.ContextResponse) string {
	amounts := extractVisibleAmounts(resolved)
	if amounts.Base == "" && amounts.Tax == "" && amounts.Total == "" {
		return ""
	}

	lower := strings.ToLower(content)
	if strings.Contains(lower, "subtotal") || strings.Contains(lower, "base") {
		if amounts.Base != "" {
			return fmt.Sprintf("El importe base visible en pantalla es **%s**.", amounts.Base)
		}
	}
	if strings.Contains(lower, "impuesto") {
		if amounts.Tax != "" {
			return fmt.Sprintf("El impuesto visible en pantalla es **%s**.", amounts.Tax)
		}
	}
	if amounts.Total != "" {
		return fmt.Sprintf("El total visible en pantalla es **%s**.", amounts.Total)
	}
	return ""
}

func extractVisibleAmounts(resolved browsercopilot.ContextResponse) visibleAmounts {
	text := resolved.VisibleTextSummary
	return visibleAmounts{
		Base:  extractCurrencyByLabel(text, `(?i)importe\s+base`),
		Tax:   extractCurrencyByLabel(text, `(?i)impuesto(?:\s+\d+\s*%)?`),
		Total: extractCurrencyByLabel(text, `(?i)total`),
	}
}

func extractCurrencyByLabel(text string, labelPattern string) string {
	if strings.TrimSpace(text) == "" {
		return ""
	}
	re := regexp.MustCompile(labelPattern + `\s*:?\s*\$?\s*([0-9][0-9\.,]*)`)
	match := re.FindStringSubmatch(text)
	if len(match) < 2 {
		return ""
	}
	return "$" + strings.TrimSpace(match[1])
}

func inferVisibleEntityLabel(content string) string {
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "pedido"):
		return "pedido"
	case strings.Contains(lower, "factura"):
		return "factura"
	case strings.Contains(lower, "cliente") || strings.Contains(lower, "contacto"):
		return "cliente"
	case strings.Contains(lower, "registro"):
		return "registro"
	default:
		return ""
	}
}

func inferRecordNameFromPageTitle(title string) string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimPrefix(trimmed, "(1) ")
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return ""
	}
	return parts[0]
}

func (al *AgentLoop) processSystemMessage(
	ctx context.Context,
	msg bus.InboundMessage,
) (string, error) {
	if msg.Channel != "system" {
		return "", fmt.Errorf(
			"processSystemMessage called with non-system message channel: %s",
			msg.Channel,
		)
	}

	logger.InfoCF("agent", "Processing system message",
		map[string]any{
			"sender_id": msg.SenderID,
			"chat_id":   msg.ChatID,
		})

	// Parse origin channel from chat_id (format: "channel:chat_id")
	var originChannel, originChatID string
	if idx := strings.Index(msg.ChatID, ":"); idx > 0 {
		originChannel = msg.ChatID[:idx]
		originChatID = msg.ChatID[idx+1:]
	} else {
		originChannel = "cli"
		originChatID = msg.ChatID
	}

	// Extract subagent result from message content
	// Format: "Task 'label' completed.\n\nResult:\n<actual content>"
	content := msg.Content
	if idx := strings.Index(content, "Result:\n"); idx >= 0 {
		content = content[idx+8:] // Extract just the result part
	}

	// Skip internal channels - only log, don't send to user
	if constants.IsInternalChannel(originChannel) {
		logger.InfoCF("agent", "Subagent completed (internal channel)",
			map[string]any{
				"sender_id":   msg.SenderID,
				"content_len": len(content),
				"channel":     originChannel,
			})
		return "", nil
	}

	// Use default agent for system messages
	agent := al.registry.GetDefaultAgent()
	if agent == nil {
		return "", fmt.Errorf("no default agent for system message")
	}

	// Use the origin session for context
	sessionKey := routing.BuildAgentMainSessionKey(agent.ID)

	return al.runAgentLoop(ctx, agent, processOptions{
		SessionKey:      sessionKey,
		Channel:         originChannel,
		ChatID:          originChatID,
		SenderID:        msg.SenderID,
		UserMessage:     fmt.Sprintf("[System: %s] %s", msg.SenderID, msg.Content),
		DefaultResponse: "Background task completed.",
		EnableSummary:   false,
		SendResponse:    true,
	})
}

// runAgentLoop is the core message processing logic.
func (al *AgentLoop) runAgentLoop(
	ctx context.Context,
	agent *AgentInstance,
	opts processOptions,
) (string, error) {
	// 0. Record last channel for heartbeat notifications (skip internal channels)
	if opts.Channel != "" && opts.ChatID != "" {
		// Don't record internal channels (cli, system, subagent)
		if !constants.IsInternalChannel(opts.Channel) {
			channelKey := fmt.Sprintf("%s:%s", opts.Channel, opts.ChatID)
			if err := al.RecordLastChannel(channelKey); err != nil {
				logger.WarnCF(
					"agent",
					"Failed to record last channel",
					map[string]any{"error": err.Error()},
				)
			}
		}
	}

	// 1. Update tool contexts
	al.updateToolContexts(agent, opts.Channel, opts.ChatID)

	// 2. Build messages (skip history for heartbeat)
	var history []providers.Message
	var summary string
	if !opts.NoHistory {
		history = agent.Sessions.GetHistory(opts.SessionKey)
		summary = agent.Sessions.GetSummary(opts.SessionKey)
	}
	messages := agent.ContextBuilder.BuildMessages(
		history,
		summary,
		opts.UserMessage,
		opts.Media,
		opts.Channel,
		opts.ChatID,
		opts.SenderID,
		opts.Metadata,
	)

	// Resolve media:// refs to base64 data URLs (streaming)
	maxMediaSize := al.cfg.Agents.Defaults.GetMaxMediaSize()
	messages = resolveMediaRefs(messages, al.mediaStore, maxMediaSize)

	// 3. Save user message to session
	agent.Sessions.AddMessage(opts.SessionKey, "user", opts.UserMessage)

	// 3b. Deterministic OCR path: if the message carries an attached invoice
	// marker ("🧾 [Factura/Documento: name (ID: N)]" injected by the
	// mail_bot_odooclaw addon), call the OCR MCP tool directly with the REAL
	// attachment id. The small model cannot route this (the ocr-* tools are
	// not in its training set — it hallucinates attachment ids and loops), so
	// the gateway decides deterministically, same as addOdooRecordLinks.
	if attID, ok := findInvoiceAttachment(opts.UserMessage); ok {
		if hasOCRInvoiceTools(agent) {
			reply, err := handleInvoiceAttachment(ctx, agent, attID, opts)
			if err == nil {
				logger.InfoCF("agent", "OCR deterministic path completed",
					map[string]any{
						"attachment_id": attID,
						"content_len":   len(reply),
					})
				// Persist the assistant reply in the session so follow-ups
				// have context.
				agent.Sessions.AddMessage(opts.SessionKey, "assistant", reply)
				return reply, nil
			}
			logger.WarnCF("agent", "OCR deterministic path failed, falling back to LLM",
				map[string]any{
					"attachment_id": attID,
					"error":         err.Error(),
				})
		}
	}

	// 4. Multi-model pipeline pre-processing
	// If the pipeline can handle this request directly (greeting, escalation),
	// return the response immediately without calling the main LLM.
	if al.pipeline != nil {
		// Convert history to multimodel.Message format for classifier context
		var mmHistory []multimodel.Message
		for _, msg := range history {
			if msg.Role == "user" || msg.Role == "assistant" {
				mmHistory = append(mmHistory, multimodel.Message{
					Role:    msg.Role,
					Content: msg.Content,
				})
			}
		}

		pipelineReq := multimodel.PipelineRequest{
			Message:    opts.UserMessage,
			SessionKey: opts.SessionKey,
			History:    mmHistory,
			Metadata:   opts.Metadata,
		}

		pipelineResult, pipelineErr := al.pipeline.ProcessRequest(ctx, pipelineReq)
		if pipelineErr != nil {
			logger.WarnCF("agent", "Pipeline pre-process failed, falling back to main model",
				map[string]any{"error": pipelineErr.Error()})
		} else if pipelineResult.SkippedMain && pipelineResult.Response != "" {
			// Pipeline handled the request directly — no need for main LLM
			logger.InfoCF("agent", "Pipeline handled request directly",
				map[string]any{
					"intent":       pipelineResult.Intent.Intent,
					"confidence":   pipelineResult.Intent.Confidence,
					"model_used":   pipelineResult.ModelUsed,
					"latency_ms":   pipelineResult.Latency.Milliseconds(),
					"tokens_saved": pipelineResult.TokensUsed,
				})
			// Save assistant response to session
			agent.Sessions.AddMessage(opts.SessionKey, "assistant", pipelineResult.Response)
			agent.Sessions.Save(opts.SessionKey)

			// Send response via bus if needed
			if opts.SendResponse {
				al.bus.PublishOutbound(ctx, bus.OutboundMessage{
					Channel: opts.Channel,
					ChatID:  opts.ChatID,
					Content: pipelineResult.Response,
				})
			}

			return pipelineResult.Response, nil
		}
		// If pipeline didn't skip main model, continue to regular LLM flow
	}

	// 5. Run LLM iteration loop
	finalContent, iteration, err := al.runLLMIteration(ctx, agent, messages, opts)
	if err != nil {
		return "", err
	}

	// If last tool had ForUser content and we already sent it, we might not need to send final response
	// This is controlled by the tool's Silent flag and ForUser content

	// 5. Handle empty response
	if finalContent == "" {
		finalContent = opts.DefaultResponse
	}

	// 6. Save final assistant message to session
	agent.Sessions.AddMessage(opts.SessionKey, "assistant", finalContent)
	agent.Sessions.Save(opts.SessionKey)

	// 7. Optional: summarization
	if opts.EnableSummary {
		al.maybeSummarize(agent, opts.SessionKey, opts.Channel, opts.ChatID)
	}

	// 8. Optional: send response via bus
	if opts.SendResponse {
		al.bus.PublishOutbound(ctx, bus.OutboundMessage{
			Channel: opts.Channel,
			ChatID:  opts.ChatID,
			Content: finalContent,
		})
	}

	// 9. Log response
	responsePreview := utils.Truncate(finalContent, 120)
	logger.InfoCF("agent", fmt.Sprintf("Response: %s", responsePreview),
		map[string]any{
			"agent_id":     agent.ID,
			"session_key":  opts.SessionKey,
			"iterations":   iteration,
			"final_length": len(finalContent),
		})

	return finalContent, nil
}

func (al *AgentLoop) targetReasoningChannelID(channelName string) (chatID string) {
	if al.channelManager == nil {
		return ""
	}
	if ch, ok := al.channelManager.GetChannel(channelName); ok {
		return ch.ReasoningChannelID()
	}
	return ""
}

func (al *AgentLoop) handleReasoning(
	ctx context.Context,
	reasoningContent, channelName, channelID string,
) {
	if reasoningContent == "" || channelName == "" || channelID == "" {
		return
	}

	// Check context cancellation before attempting to publish,
	// since PublishOutbound's select may race between send and ctx.Done().
	if ctx.Err() != nil {
		return
	}

	// Use a short timeout so the goroutine does not block indefinitely when
	// the outbound bus is full.  Reasoning output is best-effort; dropping it
	// is acceptable to avoid goroutine accumulation.
	pubCtx, pubCancel := context.WithTimeout(ctx, 5*time.Second)
	defer pubCancel()

	if err := al.bus.PublishOutbound(pubCtx, bus.OutboundMessage{
		Channel: channelName,
		ChatID:  channelID,
		Content: reasoningContent,
	}); err != nil {
		// Treat context.DeadlineExceeded / context.Canceled as expected
		// (bus full under load, or parent canceled).  Check the error
		// itself rather than ctx.Err(), because pubCtx may time out
		// (5 s) while the parent ctx is still active.
		// Also treat ErrBusClosed as expected — it occurs during normal
		// shutdown when the bus is closed before all goroutines finish.
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) ||
			errors.Is(err, bus.ErrBusClosed) {
			logger.DebugCF("agent", "Reasoning publish skipped (timeout/cancel)", map[string]any{
				"channel": channelName,
				"error":   err.Error(),
			})
		} else {
			logger.WarnCF("agent", "Failed to publish reasoning (best-effort)", map[string]any{
				"channel": channelName,
				"error":   err.Error(),
			})
		}
	}
}

// runLLMIteration executes the LLM call loop with tool handling.
func (al *AgentLoop) runLLMIteration(
	ctx context.Context,
	agent *AgentInstance,
	messages []providers.Message,
	opts processOptions,
) (string, int, error) {
	iteration := 0
	var finalContent string

	for iteration < agent.MaxIterations {
		iteration++

		logger.DebugCF("agent", "LLM iteration",
			map[string]any{
				"agent_id":  agent.ID,
				"iteration": iteration,
				"max":       agent.MaxIterations,
			})

		// Build tool definitions
		providerToolDefs := agent.Tools.ToProviderDefs()

		// Small local models (fine-tuned on ~5 tools per example) degrade with
		// dozens of tools in context. Apply tool retrieval: keep only the top-K
		// most relevant tools for the current user query.
		if isLocalSmallModel(agent.Model) && len(providerToolDefs) > maxLocalToolsInPrompt {
			query := lastUserMessageText(messages)
			providerToolDefs = retrieveRelevantTools(providerToolDefs, query, maxLocalToolsInPrompt)
		}

		// Log LLM request details
		logger.DebugCF("agent", "LLM request",
			map[string]any{
				"agent_id":          agent.ID,
				"iteration":         iteration,
				"model":             agent.Model,
				"messages_count":    len(messages),
				"tools_count":       len(providerToolDefs),
				"max_tokens":        agent.MaxTokens,
				"temperature":       agent.Temperature,
				"system_prompt_len": len(messages[0].Content),
			})

		// Log full messages (detailed)
		logger.DebugCF("agent", "Full LLM request",
			map[string]any{
				"iteration":     iteration,
				"messages_json": formatMessagesForLog(messages),
				"tools_json":    formatToolsForLog(providerToolDefs),
			})

		// Call LLM with fallback chain if candidates are configured.
		var response *providers.LLMResponse
		var err error

		callLLM := func() (*providers.LLMResponse, error) {
			if len(agent.Candidates) > 1 && al.fallback != nil {
				fbResult, fbErr := al.fallback.Execute(
					ctx,
					agent.Candidates,
					func(ctx context.Context, provider, model string) (*providers.LLMResponse, error) {
						return agent.Provider.Chat(
							ctx,
							messages,
							providerToolDefs,
							model,
							map[string]any{
								"max_tokens":       agent.MaxTokens,
								"temperature":      agent.Temperature,
								"prompt_cache_key": agent.ID,
							},
						)
					},
				)
				if fbErr != nil {
					return nil, fbErr
				}
				if fbResult.Provider != "" && len(fbResult.Attempts) > 0 {
					logger.InfoCF(
						"agent",
						fmt.Sprintf("Fallback: succeeded with %s/%s after %d attempts",
							fbResult.Provider, fbResult.Model, len(fbResult.Attempts)+1),
						map[string]any{"agent_id": agent.ID, "iteration": iteration},
					)
				}
				return fbResult.Response, nil
			}
			opts := map[string]any{
				"max_tokens":       agent.MaxTokens,
				"temperature":      agent.Temperature,
				"prompt_cache_key": agent.ID,
			}
			// Small local models (llama.cpp/ollama) are fine-tuned with tools
			// listed as plain text in the system prompt. Inject them there
			// instead of sending OpenAI JSON function schemas. A per-model
			// config override (prompt_tools_in_text) wins over the heuristic:
			// native-tool-calling fine-tunes (v26-native) need the native
			// "tools" array to reach 100% exact-match tool calling.
			useTextInjection := isLocalSmallModel(agent.Model)
			if agent.PromptToolsInText != nil {
				useTextInjection = *agent.PromptToolsInText
			}
			// NRA-413: Force temperature=0.0 for local small models to ensure
			// deterministic tool calling. Fine-tuned 0.5B/1.5B models degrade
			// quickly with non-zero temperature — even 0.1 introduces enough
			// stochasticity to produce malformed JSON or wrong tool names.
			if isLocalSmallModel(agent.Model) {
				opts["temperature"] = 0.0
			}
			if useTextInjection {
				opts["prompt_tools_in_text"] = true
			}
			return agent.Provider.Chat(ctx, messages, providerToolDefs, agent.Model, opts)
		}

		// Retry loop for context/token errors
		maxRetries := 2
		for retry := 0; retry <= maxRetries; retry++ {
			response, err = callLLM()
			if err == nil {
				break
			}

			errMsg := strings.ToLower(err.Error())

			retryReason, isTransient := transientLLMRetryReason(err)

			// Detect real context window / token limit errors, excluding transient errors.
			isContextError := !isTransient && (strings.Contains(errMsg, "context_length_exceeded") ||
				strings.Contains(errMsg, "context window") ||
				strings.Contains(errMsg, "maximum context length") ||
				strings.Contains(errMsg, "token limit") ||
				strings.Contains(errMsg, "too many tokens") ||
				strings.Contains(errMsg, "max_tokens") ||
				strings.Contains(errMsg, "invalidparameter") ||
				strings.Contains(errMsg, "prompt is too long") ||
				strings.Contains(errMsg, "request too large"))

			if isTransient && retry < maxRetries {
				backoff := time.Duration(retry+1) * 5 * time.Second
				logger.WarnCF("agent", "Transient LLM error, retrying after backoff", map[string]any{
					"error":   err.Error(),
					"reason":  retryReason,
					"retry":   retry,
					"backoff": backoff.String(),
				})
				time.Sleep(backoff)
				continue
			}

			if isContextError && retry < maxRetries {
				logger.WarnCF(
					"agent",
					"Context window error detected, attempting compression",
					map[string]any{
						"error": err.Error(),
						"retry": retry,
					},
				)

				if !al.forceCompression(agent, opts.SessionKey) {
					logger.WarnCF(
						"agent",
						"Context compression made no progress; skipping identical retry",
						map[string]any{
							"session_key": opts.SessionKey,
							"retry":       retry,
						},
					)
					break
				}
				if retry == 0 && !constants.IsInternalChannel(opts.Channel) {
					al.bus.PublishOutbound(ctx, bus.OutboundMessage{
						Channel: opts.Channel,
						ChatID:  opts.ChatID,
						Content: "Context window exceeded. Compressing history and retrying...",
					})
				}

				newHistory := agent.Sessions.GetHistory(opts.SessionKey)
				newSummary := agent.Sessions.GetSummary(opts.SessionKey)
				messages = agent.ContextBuilder.BuildMessages(
					newHistory, newSummary, "",
					nil, opts.Channel, opts.ChatID, opts.SenderID, opts.Metadata,
				)
				continue
			}
			break
		}

		if err != nil {
			logger.ErrorCF("agent", "LLM call failed",
				map[string]any{
					"agent_id":  agent.ID,
					"iteration": iteration,
					"error":     err.Error(),
				})
			return "", iteration, fmt.Errorf("LLM call failed after retries: %w", err)
		}

		go al.handleReasoning(
			ctx,
			response.Reasoning,
			opts.Channel,
			al.targetReasoningChannelID(opts.Channel),
		)

		logger.DebugCF("agent", "LLM response",
			map[string]any{
				"agent_id":       agent.ID,
				"iteration":      iteration,
				"content_chars":  len(response.Content),
				"tool_calls":     len(response.ToolCalls),
				"reasoning":      response.Reasoning,
				"target_channel": al.targetReasoningChannelID(opts.Channel),
				"channel":        opts.Channel,
			})
		// Check if no tool calls - we're done
		if len(response.ToolCalls) == 0 {
			finalContent = response.Content
			// Post-process: append clickable Odoo links when tools returned
			// records. Done HERE (inside the loop) because messages at this
			// point include the tool results; the caller's copy does not
			// (append may reallocate the backing array).
			finalContent = addOdooRecordLinks(messages, finalContent)
			logger.InfoCF("agent", "LLM response without tool calls (direct answer)",
				map[string]any{
					"agent_id":      agent.ID,
					"iteration":     iteration,
					"content_chars": len(finalContent),
				})
			break
		}

		normalizedToolCalls := make([]providers.ToolCall, 0, len(response.ToolCalls))
		for _, tc := range response.ToolCalls {
			normalizedToolCalls = append(normalizedToolCalls, providers.NormalizeToolCall(tc))
		}

		// Log tool calls
		toolNames := make([]string, 0, len(normalizedToolCalls))
		for _, tc := range normalizedToolCalls {
			toolNames = append(toolNames, tc.Name)
		}
		logger.InfoCF("agent", "LLM requested tool calls",
			map[string]any{
				"agent_id":  agent.ID,
				"tools":     toolNames,
				"count":     len(normalizedToolCalls),
				"iteration": iteration,
			})

		// Build assistant message with tool calls
		assistantMsg := providers.Message{
			Role:             "assistant",
			Content:          response.Content,
			ReasoningContent: response.ReasoningContent,
		}
		for _, tc := range normalizedToolCalls {
			argumentsJSON, _ := json.Marshal(tc.Arguments)
			// Copy ExtraContent to ensure thought_signature is persisted for Gemini 3
			extraContent := tc.ExtraContent
			thoughtSignature := ""
			if tc.Function != nil {
				thoughtSignature = tc.Function.ThoughtSignature
			}

			assistantMsg.ToolCalls = append(assistantMsg.ToolCalls, providers.ToolCall{
				ID:   tc.ID,
				Type: "function",
				Name: tc.Name,
				Function: &providers.FunctionCall{
					Name:             tc.Name,
					Arguments:        string(argumentsJSON),
					ThoughtSignature: thoughtSignature,
				},
				ExtraContent:     extraContent,
				ThoughtSignature: thoughtSignature,
			})
		}
		messages = append(messages, assistantMsg)

		// Save assistant message with tool calls to session
		agent.Sessions.AddFullMessage(opts.SessionKey, assistantMsg)

		// Execute tool calls
		for _, tc := range normalizedToolCalls {
			argsJSON, _ := json.Marshal(tc.Arguments)
			argsPreview := utils.Truncate(string(argsJSON), 200)
			logger.InfoCF("agent", fmt.Sprintf("Tool call: %s(%s)", tc.Name, argsPreview),
				map[string]any{
					"agent_id":  agent.ID,
					"tool":      tc.Name,
					"iteration": iteration,
				})

			// Create async callback for tools that implement AsyncTool
			// NOTE: Following openclaw's design, async tools do NOT send results directly to users.
			// Instead, they notify the agent via PublishInbound, and the agent decides
			// whether to forward the result to the user (in processSystemMessage).
			asyncCallback := func(callbackCtx context.Context, result *tools.ToolResult) {
				// Log the async completion but don't send directly to user
				// The agent will handle user notification via processSystemMessage
				if !result.Silent && result.ForUser != "" {
					logger.InfoCF("agent", "Async tool completed, agent will handle notification",
						map[string]any{
							"tool":        tc.Name,
							"content_len": len(result.ForUser),
						})
				}
			}

			toolResult := agent.Tools.ExecuteWithContext(
				ctx,
				tc.Name,
				tc.Arguments,
				opts.Channel,
				opts.ChatID,
				opts.SenderID,
				opts.Metadata,
				asyncCallback,
			)

			// Recipe memory: on SUCCESSFUL tool execution, store the
			// resolved query → tool + args pattern for reuse as few-shot.
			// Only successful executions are saved so the store stays clean.
			if !toolResult.IsError && agent.ContextBuilder != nil && opts.UserMessage != "" {
				agent.ContextBuilder.SaveRecipe(opts.UserMessage, tc.Name, string(argsJSON), opts.Channel, opts.ChatID, opts.SenderID)
				logger.DebugCF("agent", "recipe saved",
					map[string]any{"tool": tc.Name, "query": opts.UserMessage})
			}

			// Send ForUser content to user immediately if not Silent
			if !toolResult.Silent && toolResult.ForUser != "" && opts.SendResponse {
				al.bus.PublishOutbound(ctx, bus.OutboundMessage{
					Channel: opts.Channel,
					ChatID:  opts.ChatID,
					Content: toolResult.ForUser,
				})
				logger.DebugCF("agent", "Sent tool result to user",
					map[string]any{
						"tool":        tc.Name,
						"content_len": len(toolResult.ForUser),
					})
			}

			// If tool returned media refs, publish them as outbound media
			if len(toolResult.Media) > 0 && opts.SendResponse {
				parts := make([]bus.MediaPart, 0, len(toolResult.Media))
				for _, ref := range toolResult.Media {
					part := bus.MediaPart{Ref: ref}
					// Populate metadata from MediaStore when available
					if al.mediaStore != nil {
						if _, meta, err := al.mediaStore.ResolveWithMeta(ref); err == nil {
							part.Filename = meta.Filename
							part.ContentType = meta.ContentType
							part.Type = inferMediaType(meta.Filename, meta.ContentType)
						}
					}
					parts = append(parts, part)
				}
				al.bus.PublishOutboundMedia(ctx, bus.OutboundMediaMessage{
					Channel: opts.Channel,
					ChatID:  opts.ChatID,
					Parts:   parts,
				})
			}

			// Determine content for LLM based on tool result
			contentForLLM := toolResult.ForLLM
			if contentForLLM == "" && toolResult.Err != nil {
				contentForLLM = toolResult.Err.Error()
			}

			toolResultMsg := providers.Message{
				Role:       "tool",
				Content:    contentForLLM,
				ToolCallID: tc.ID,
			}
			messages = append(messages, toolResultMsg)

			// Save tool result message to session
			agent.Sessions.AddFullMessage(opts.SessionKey, toolResultMsg)
		}
	}

	return finalContent, iteration, nil
}

// updateToolContexts updates the context for tools that need channel/chatID info.
func (al *AgentLoop) updateToolContexts(agent *AgentInstance, channel, chatID string) {
	// Use ContextualTool interface instead of type assertions
	if tool, ok := agent.Tools.Get("message"); ok {
		if mt, ok := tool.(tools.ContextualTool); ok {
			mt.SetContext(channel, chatID)
		}
	}
	if tool, ok := agent.Tools.Get("spawn"); ok {
		if st, ok := tool.(tools.ContextualTool); ok {
			st.SetContext(channel, chatID)
		}
	}
	if tool, ok := agent.Tools.Get("subagent"); ok {
		if st, ok := tool.(tools.ContextualTool); ok {
			st.SetContext(channel, chatID)
		}
	}
}

// maybeSummarize triggers summarization if the session history exceeds thresholds.
func (al *AgentLoop) maybeSummarize(agent *AgentInstance, sessionKey, channel, chatID string) {
	newHistory := agent.Sessions.GetHistory(sessionKey)
	tokenEstimate := al.estimateTokens(newHistory)
	threshold := agent.ContextWindow * 75 / 100

	if len(newHistory) > 20 || tokenEstimate > threshold {
		summarizeKey := agent.ID + ":" + sessionKey
		if _, loading := al.summarizing.LoadOrStore(summarizeKey, true); !loading {
			go func() {
				defer al.summarizing.Delete(summarizeKey)
				logger.Debug("Memory threshold reached. Optimizing conversation history...")
				al.summarizeSession(agent, sessionKey)
			}()
		}
	}
}

// forceCompression aggressively reduces context when the limit is hit.
// It drops the oldest 50% of messages (keeping system prompt and last user message).
func (al *AgentLoop) forceCompression(agent *AgentInstance, sessionKey string) bool {
	history := agent.Sessions.GetHistory(sessionKey)
	newHistory, droppedCount, compressed := compressedHistory(history)
	if !compressed {
		return false
	}

	// Update session
	agent.Sessions.SetHistory(sessionKey, newHistory)
	agent.Sessions.Save(sessionKey)

	logger.WarnCF("agent", "Forced compression executed", map[string]any{
		"session_key":  sessionKey,
		"dropped_msgs": droppedCount,
		"new_count":    len(newHistory),
	})
	return true
}

// GetStartupInfo returns information about loaded tools and skills for logging.
func (al *AgentLoop) GetStartupInfo() map[string]any {
	info := make(map[string]any)

	agent := al.registry.GetDefaultAgent()
	if agent == nil {
		return info
	}

	// Tools info
	toolsList := agent.Tools.List()
	info["tools"] = map[string]any{
		"count": len(toolsList),
		"names": toolsList,
	}

	// Skills info
	info["skills"] = agent.ContextBuilder.GetSkillsInfo()

	// Agents info
	info["agents"] = map[string]any{
		"count": len(al.registry.ListAgentIDs()),
		"ids":   al.registry.ListAgentIDs(),
	}

	return info
}

// formatMessagesForLog formats messages for logging
func formatMessagesForLog(messages []providers.Message) string {
	if len(messages) == 0 {
		return "[]"
	}

	var sb strings.Builder
	sb.WriteString("[\n")
	for i, msg := range messages {
		fmt.Fprintf(&sb, "  [%d] Role: %s\n", i, msg.Role)
		if len(msg.ToolCalls) > 0 {
			sb.WriteString("  ToolCalls:\n")
			for _, tc := range msg.ToolCalls {
				fmt.Fprintf(&sb, "    - ID: %s, Type: %s, Name: %s\n", tc.ID, tc.Type, tc.Name)
				if tc.Function != nil {
					fmt.Fprintf(
						&sb,
						"      Arguments: %s\n",
						utils.Truncate(tc.Function.Arguments, 200),
					)
				}
			}
		}
		if msg.Content != "" {
			content := utils.Truncate(msg.Content, 200)
			fmt.Fprintf(&sb, "  Content: %s\n", content)
		}
		if msg.ToolCallID != "" {
			fmt.Fprintf(&sb, "  ToolCallID: %s\n", msg.ToolCallID)
		}
		sb.WriteString("\n")
	}
	sb.WriteString("]")
	return sb.String()
}

// odooToolModel maps Odoo MCP tool names (as registered in the odoo-mcp
// server, e.g. "odoo_find_partner") to their underlying Odoo model. Runtime
// names arrive prefixed ("mcp_odoo-mcp_odoo_find_partner");
// normalizeToolName strips that prefix before the lookup.
var odooToolModel = map[string]string{
	// Partner tools
	"odoo_find_partner":        "res.partner",
	"odoo_get_partner_summary": "res.partner",
	// Invoice / accounting tools
	"odoo_find_pending_invoices": "account.move",
	"odoo_get_invoice_summary":   "account.move",
	"odoo_create_journal_entry":  "account.move",
	"odoo_post_journal_entry":    "account.move",
	// Product tools
	"odoo_find_product":        "product.product",
	"odoo_get_product_summary": "product.product",
	// Sale order tools
	"odoo_find_sale_order":        "sale.order",
	"odoo_get_sale_order_summary": "sale.order",
	"odoo_confirm_sale_order":     "sale.order",
	"odoo_create_sale_order":      "sale.order",
	// Purchase order tools
	"odoo_find_purchase_order":        "purchase.order",
	"odoo_get_purchase_order_summary": "purchase.order",
	// CRM tools
	"odoo_create_lead": "crm.lead",
	// Project tools
	"odoo_find_task":          "project.task",
	"odoo_find_my_tasks":      "project.task",
	"odoo_create_task":        "project.task",
	"odoo_update_task":        "project.task",
	"odoo_update_task_status": "project.task",
}

// normalizeToolName extracts the registered MCP tool name from a runtime tool
// name. The gateway prefixes MCP tools as "mcp_<server>_<tool>", e.g.
// "mcp_odoo-mcp_odoo_find_partner" → "odoo_find_partner". Names without that
// prefix are returned unchanged.
func normalizeToolName(name string) string {
	if i := strings.Index(name, "odoo-"); i >= 0 {
		if j := strings.Index(name[i:], "_"); j >= 0 {
			return name[i+j+1:]
		}
	}
	return name
}

// toolModelForName returns the Odoo model for a runtime tool name, or "" when
// the tool is not mapped (generic read/search/write tools have no single
// model, so they never produce links).
func toolModelForName(name string) string {
	return odooToolModel[normalizeToolName(name)]
}

// odooRecordURL builds the web-client URL for an Odoo record. res.partner
// records live under /odoo/contacts/{id}; every other model uses its real
// dotted name (/odoo/account.move/42), matching the Odoo 17/18 web client.
func odooRecordURL(model string, id int) string {
	if model == "res.partner" {
		return fmt.Sprintf("/odoo/contacts/%d", id)
	}
	return fmt.Sprintf("/odoo/%s/%d", model, id)
}

// odooLinkLabel returns a human-readable fallback label for a record id when
// the tool result carried no name/display_name/number.
func odooLinkLabel(model string, id int) string {
	switch model {
	case "res.partner":
		return fmt.Sprintf("Cliente %d", id)
	case "account.move":
		return fmt.Sprintf("Factura %d", id)
	case "sale.order":
		return fmt.Sprintf("Pedido %d", id)
	case "purchase.order":
		return fmt.Sprintf("Pedido de compra %d", id)
	case "product.product":
		return fmt.Sprintf("Producto %d", id)
	case "crm.lead":
		return fmt.Sprintf("Oportunidad %d", id)
	case "project.task":
		return fmt.Sprintf("Tarea %d", id)
	}
	return fmt.Sprintf("Registro %d", id)
}

// recordFromMap extracts the id and a display label from a parsed Odoo
// record. The label prefers name, then display_name, then number. Returns
// id == 0 when the record carries no usable id.
func recordFromMap(rec map[string]any) (int, string) {
	id, _ := rec["id"].(float64)
	if id <= 0 {
		return 0, ""
	}
	for _, key := range []string{"name", "display_name", "number"} {
		if v, ok := rec[key]; ok && v != nil {
			if s := strings.TrimSpace(fmt.Sprintf("%v", v)); s != "" {
				return int(id), s
			}
		}
	}
	return int(id), ""
}

// odooLink is an Odoo record parsed from a tool result.
type odooLink struct {
	model string
	id    int
	label string
}

// recordHit is an (id, label) pair extracted from one tool result.
type recordHit struct {
	id    int
	label string
}

// addOdooRecordLinks appends clickable Odoo links to the final assistant
// response when a tool call returned record ids, and converts any bare
// /odoo/<model>/<id> URLs the model wrote in plain text into links. Small
// local models (350M) cannot reliably emit markdown links, so the gateway
// does it deterministically.
//
// IMPORTANT: it only looks at TOOL RESULTS (role=="tool") produced AFTER the
// last user message (the current turn). It NEVER reads ids from tool call
// ARGUMENTS — the 350M invents those (partner_id:99, sender_id:...), which
// caused links to point at records from previous turns (e.g. always
// /odoo/contacts/10 after any "Busca el cliente Acme" earlier in the chat).
// The Odoo model of each result is derived from the tool that produced it
// (matched through the assistant's ToolCalls by ToolCallID), never from the
// model's own arguments.
func addOdooRecordLinks(messages []providers.Message, content string) string {
	// Find the index of the LAST user message. Only tool results after it
	// belong to the current turn.
	start := 0
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			start = i + 1
			break
		}
	}

	// Index assistant tool calls by ID so each tool result can be attributed
	// to the tool that produced it (the tool name determines the Odoo model).
	type toolCallInfo struct {
		name string
		args string
	}
	toolCallByID := map[string]toolCallInfo{}
	for i := start; i < len(messages); i++ {
		msg := messages[i]
		if msg.Role != "assistant" {
			continue
		}
		for _, tc := range msg.ToolCalls {
			name := tc.Name
			if name == "" && tc.Function != nil {
				name = tc.Function.Name
			}
			if name == "" || tc.ID == "" {
				continue
			}
			info := toolCallInfo{name: name}
			if tc.Function != nil && tc.Function.Arguments != "" {
				info.args = tc.Function.Arguments
			} else if len(tc.Arguments) > 0 {
				if b, err := json.Marshal(tc.Arguments); err == nil {
					info.args = string(b)
				}
			}
			toolCallByID[tc.ID] = info
		}
	}

	// Collect record links from TOOL RESULTS of the current turn only.
	// The MCP server returns the real record id; the model's own arguments
	// are untrusted (it hallucinates partner_id / sender_id values).
	var found []odooLink
	seen := map[string]bool{}

	for i := start; i < len(messages); i++ {
		msg := messages[i]
		if msg.Role != "tool" {
			continue
		}
		contentStr := strings.TrimSpace(msg.Content)
		if contentStr == "" || strings.Contains(contentStr, "error") {
			continue
		}
		call := toolCallByID[msg.ToolCallID]
		model := toolModelForName(call.name)
		// Generic search/read tools have no fixed model: the model the
		// search ran against is taken from the tool call arguments (the
		// entity being searched, never a record id).
		if model == "" && isGenericSearchTool(call.name) {
			model = modelFromArgs(call.args)
		}
		if model == "" {
			continue
		}

		records := extractRecordHits(contentStr)
		for _, r := range records {
			key := fmt.Sprintf("%s:%d", model, r.id)
			if seen[key] {
				continue
			}
			seen[key] = true
			found = append(found, odooLink{model: model, id: r.id, label: r.label})
		}
	}

	// Convert any bare /odoo/<model>/<id> URLs the model wrote in plain text
	// into clickable markdown links (acceptance requirement #3), reusing the
	// real record name from the current turn as the label when available.
	knownLabels := map[string]string{}
	for _, l := range found {
		knownLabels[odooRecordURL(l.model, l.id)] = l.label
	}
	content = convertPlainURLsToLinks(content, knownLabels)

	// Append links for records not already present in the answer (as markdown
	// or as a plain-text URL the model already emitted) — no duplication.
	var missing []odooLink
	for _, l := range found {
		if strings.Contains(content, odooRecordURL(l.model, l.id)) {
			continue
		}
		missing = append(missing, l)
	}
	if len(missing) > 0 {
		var sb strings.Builder
		sb.WriteString(content)
		for _, l := range missing {
			label := l.label
			if label == "" {
				label = odooLinkLabel(l.model, l.id)
			}
			sb.WriteString(fmt.Sprintf("\n\n🔗 [%s](%s)", label, odooRecordURL(l.model, l.id)))
		}
		content = sb.String()
	}
	return content
}

// isGenericSearchTool reports whether the tool searches/reads an arbitrary
// model passed as an argument (odoo_search / odoo_read / variants).
func isGenericSearchTool(toolName string) bool {
	n := strings.ToLower(toolName)
	return strings.Contains(n, "odoo_search") || strings.Contains(n, "odoo_read")
}

// modelFromArgs extracts the "model" field from a tool call's JSON arguments.
// Only the model name is read — never record ids (those are hallucinated by
// small models and must come from tool results only).
func modelFromArgs(args string) string {
	if args == "" {
		return ""
	}
	var parsed map[string]any
	if err := json.Unmarshal([]byte(args), &parsed); err != nil {
		return ""
	}
	if m, ok := parsed["model"].(string); ok && m != "" {
		return m
	}
	return ""
}

// extractRecordHits parses a tool result string into (id, label) hits.
// Supported shapes:
//   - bare int: "10" (find_partner)
//   - single object: {"id": N, "name": ...} (get_partner_summary)
//   - array of objects: [{"id": N, "name": ...}] (search_read results)
//   - wrapper object with nested record arrays: find_product →
//     {"ok": true, "products": [{"id": N, "display_name": ...}], ...}
func extractRecordHits(contentStr string) []recordHit {
	var hits []recordHit
	if id, err := strconv.Atoi(contentStr); err == nil && id > 0 {
		return append(hits, recordHit{id: id})
	}
	var parsed any
	if err := json.Unmarshal([]byte(contentStr), &parsed); err != nil {
		return nil
	}
	var walk func(m map[string]any)
	walk = func(m map[string]any) {
		if id, label := recordFromMap(m); id > 0 {
			hits = append(hits, recordHit{id: id, label: label})
		}
		// Nested record arrays produced by wrapper tools (find_product →
		// {"products": [...]}, search wrappers → {"records": [...]}). One
		// level deep to avoid unbounded recursion.
		for _, key := range []string{"products", "records", "result", "data", "moves", "invoices", "orders", "partners"} {
			arr, ok := m[key].([]any)
			if !ok {
				continue
			}
			for _, item := range arr {
				if rec, ok := item.(map[string]any); ok {
					if id, label := recordFromMap(rec); id > 0 {
						hits = append(hits, recordHit{id: id, label: label})
					}
				}
			}
		}
	}
	switch v := parsed.(type) {
	case []any:
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				walk(m)
			}
		}
	case map[string]any:
		walk(v)
	}
	return hits
}

// odooPlainURLRe matches a bare Odoo web-client URL: /odoo/<model>/<id>.
var odooPlainURLRe = regexp.MustCompile(`/odoo/[a-z][a-z0-9_.]*/\d+`)

// convertPlainURLsToLinks rewrites every bare /odoo/<model>/<id> occurrence
// in the final assistant text into a clickable markdown link. Occurrences
// that are already the target of a markdown link (preceded by "](") are left
// untouched. knownLabels maps an /odoo/... URL to the real record name from
// the current turn's tool results, used as the link label when available.
func convertPlainURLsToLinks(content string, knownLabels map[string]string) string {
	idxs := odooPlainURLRe.FindAllStringIndex(content, -1)
	if len(idxs) == 0 {
		return content
	}
	var sb strings.Builder
	prev := 0
	for _, m := range idxs {
		start, end := m[0], m[1]
		// Skip URLs already used as link targets: "[label](/odoo/...)".
		if start >= 2 && content[start-2:start] == "](" {
			continue
		}
		url := content[start:end]
		label := knownLabels[url]
		if label == "" {
			label = plainURLLabel(url)
		}
		sb.WriteString(content[prev:start])
		sb.WriteString(fmt.Sprintf("[%s](%s)", label, url))
		prev = end
	}
	sb.WriteString(content[prev:])
	return sb.String()
}

// plainURLLabel derives a readable label for a bare URL like
// /odoo/account.move/42, naming the entity by its model. The special
// /odoo/contacts/{id} path is the res.partner web-client URL.
func plainURLLabel(url string) string {
	parts := strings.Split(strings.TrimPrefix(url, "/odoo/"), "/")
	if len(parts) != 2 {
		return url
	}
	model := parts[0]
	if model == "contacts" {
		model = "res.partner"
	}
	id, err := strconv.Atoi(parts[1])
	if err != nil {
		return url
	}
	return odooLinkLabel(model, id)
}

// formatToolsForLog formats tool definitions for logging
func formatToolsForLog(toolDefs []providers.ToolDefinition) string {
	if len(toolDefs) == 0 {
		return "[]"
	}

	var sb strings.Builder
	sb.WriteString("[\n")
	for i, tool := range toolDefs {
		fmt.Fprintf(&sb, "  [%d] Type: %s, Name: %s\n", i, tool.Type, tool.Function.Name)
		fmt.Fprintf(&sb, "      Description: %s\n", tool.Function.Description)
		if len(tool.Function.Parameters) > 0 {
			fmt.Fprintf(
				&sb,
				"      Parameters: %s\n",
				utils.Truncate(fmt.Sprintf("%v", tool.Function.Parameters), 200),
			)
		}
	}
	sb.WriteString("]")
	return sb.String()
}

// summarizeSession summarizes the conversation history for a session.
func (al *AgentLoop) summarizeSession(agent *AgentInstance, sessionKey string) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	history := agent.Sessions.GetHistory(sessionKey)
	summary := agent.Sessions.GetSummary(sessionKey)

	// Keep last 4 messages for continuity
	if len(history) <= 4 {
		return
	}

	toSummarize := history[:len(history)-4]

	// Oversized Message Guard
	maxMessageTokens := agent.ContextWindow / 2
	validMessages := make([]providers.Message, 0)
	omitted := false

	for _, m := range toSummarize {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		msgTokens := len(m.Content) / 2
		if msgTokens > maxMessageTokens {
			omitted = true
			continue
		}
		validMessages = append(validMessages, m)
	}

	if len(validMessages) == 0 {
		return
	}

	// Multi-Part Summarization
	var finalSummary string
	if len(validMessages) > 10 {
		mid := len(validMessages) / 2
		part1 := validMessages[:mid]
		part2 := validMessages[mid:]

		s1, _ := al.summarizeBatch(ctx, agent, part1, "")
		s2, _ := al.summarizeBatch(ctx, agent, part2, "")

		mergePrompt := fmt.Sprintf(
			"Merge these two conversation summaries into one cohesive summary:\n\n1: %s\n\n2: %s",
			s1,
			s2,
		)
		resp, err := agent.Provider.Chat(
			ctx,
			[]providers.Message{{Role: "user", Content: mergePrompt}},
			nil,
			agent.Model,
			map[string]any{
				"max_tokens":       1024,
				"temperature":      0.3,
				"prompt_cache_key": agent.ID,
			},
		)
		if err == nil {
			finalSummary = resp.Content
		} else {
			finalSummary = s1 + " " + s2
		}
	} else {
		finalSummary, _ = al.summarizeBatch(ctx, agent, validMessages, summary)
	}

	if omitted && finalSummary != "" {
		finalSummary += "\n[Note: Some oversized messages were omitted from this summary for efficiency.]"
	}

	if finalSummary != "" {
		agent.Sessions.SetSummary(sessionKey, finalSummary)
		agent.Sessions.TruncateHistory(sessionKey, 4)
		agent.Sessions.Save(sessionKey)
	}
}

// summarizeBatch summarizes a batch of messages.
func (al *AgentLoop) summarizeBatch(
	ctx context.Context,
	agent *AgentInstance,
	batch []providers.Message,
	existingSummary string,
) (string, error) {
	var sb strings.Builder
	sb.WriteString(
		"Provide a concise summary of this conversation segment, preserving core context and key points.\n",
	)
	if existingSummary != "" {
		sb.WriteString("Existing context: ")
		sb.WriteString(existingSummary)
		sb.WriteString("\n")
	}
	sb.WriteString("\nCONVERSATION:\n")
	for _, m := range batch {
		fmt.Fprintf(&sb, "%s: %s\n", m.Role, m.Content)
	}
	prompt := sb.String()

	response, err := agent.Provider.Chat(
		ctx,
		[]providers.Message{{Role: "user", Content: prompt}},
		nil,
		agent.Model,
		map[string]any{
			"max_tokens":       1024,
			"temperature":      0.3,
			"prompt_cache_key": agent.ID,
		},
	)
	if err != nil {
		return "", err
	}
	return response.Content, nil
}

// estimateTokens estimates the number of tokens in a message list.
// Uses a safe heuristic of 2.5 characters per token to account for CJK and other
// overheads better than the previous 3 chars/token.
func (al *AgentLoop) estimateTokens(messages []providers.Message) int {
	return estimateMessageTokens(messages)
}

func (al *AgentLoop) handleCommand(ctx context.Context, msg bus.InboundMessage) (string, bool) {
	content := strings.TrimSpace(msg.Content)
	if !strings.HasPrefix(content, "/") {
		return "", false
	}

	parts := strings.Fields(content)
	if len(parts) == 0 {
		return "", false
	}

	cmd := parts[0]
	args := parts[1:]

	switch cmd {
	case "/browser-pair":
		client := browsercopilot.NewClientFromEnv()
		ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
		defer cancel()
		result, err := client.CreatePairing(ctxTimeout, browsercopilot.PairingCreateRequest{
			Channel:  msg.Channel,
			ChatID:   msg.ChatID,
			SenderID: msg.SenderID,
		})
		if err != nil {
			return fmt.Sprintf("No pude generar el código de vinculación del navegador: %v", err), true
		}
		return fmt.Sprintf("Código de vinculación del navegador: %s\n\nAbre la extensión de OdooClaw, pega este código y pulsa Vincular. Después activa 'Compartir esta pestaña' y ya podré ver el contexto de esa pantalla en esta conversación.", result.Code), true

	case "/show":
		if len(args) < 1 {
			return "Usage: /show [model|channel|agents]", true
		}
		switch args[0] {
		case "model":
			defaultAgent := al.registry.GetDefaultAgent()
			if defaultAgent == nil {
				return "No default agent configured", true
			}
			return fmt.Sprintf("Current model: %s", defaultAgent.Model), true
		case "channel":
			return fmt.Sprintf("Current channel: %s", msg.Channel), true
		case "agents":
			agentIDs := al.registry.ListAgentIDs()
			return fmt.Sprintf("Registered agents: %s", strings.Join(agentIDs, ", ")), true
		default:
			return fmt.Sprintf("Unknown show target: %s", args[0]), true
		}

	case "/list":
		if len(args) < 1 {
			return "Usage: /list [models|channels|agents]", true
		}
		switch args[0] {
		case "models":
			return "Available models: configured in config.json per agent", true
		case "channels":
			if al.channelManager == nil {
				return "Channel manager not initialized", true
			}
			channels := al.channelManager.GetEnabledChannels()
			if len(channels) == 0 {
				return "No channels enabled", true
			}
			return fmt.Sprintf("Enabled channels: %s", strings.Join(channels, ", ")), true
		case "agents":
			agentIDs := al.registry.ListAgentIDs()
			return fmt.Sprintf("Registered agents: %s", strings.Join(agentIDs, ", ")), true
		default:
			return fmt.Sprintf("Unknown list target: %s", args[0]), true
		}

	case "/switch":
		if len(args) < 3 || args[1] != "to" {
			return "Usage: /switch [model|channel] to <name>", true
		}
		target := args[0]
		value := args[2]

		switch target {
		case "model":
			defaultAgent := al.registry.GetDefaultAgent()
			if defaultAgent == nil {
				return "No default agent configured", true
			}
			oldModel := defaultAgent.Model
			defaultAgent.Model = value
			return fmt.Sprintf("Switched model from %s to %s", oldModel, value), true
		case "channel":
			if al.channelManager == nil {
				return "Channel manager not initialized", true
			}
			if _, exists := al.channelManager.GetChannel(value); !exists && value != "cli" {
				return fmt.Sprintf("Channel '%s' not found or not enabled", value), true
			}
			return fmt.Sprintf("Switched target channel to %s", value), true
		default:
			return fmt.Sprintf("Unknown switch target: %s", target), true
		}
	}

	return "", false
}

// extractPeer extracts the routing peer from the inbound message's structured Peer field.
func extractPeer(msg bus.InboundMessage) *routing.RoutePeer {
	if msg.Peer.Kind == "" {
		return nil
	}
	peerID := msg.Peer.ID
	if peerID == "" {
		if msg.Peer.Kind == "direct" {
			peerID = msg.SenderID
		} else {
			peerID = msg.ChatID
		}
	}
	return &routing.RoutePeer{Kind: msg.Peer.Kind, ID: peerID}
}

// extractParentPeer extracts the parent peer (reply-to) from inbound message metadata.
func extractParentPeer(msg bus.InboundMessage) *routing.RoutePeer {
	parentKind := msg.Metadata["parent_peer_kind"]
	parentID := msg.Metadata["parent_peer_id"]
	if parentKind == "" || parentID == "" {
		return nil
	}
	return &routing.RoutePeer{Kind: parentKind, ID: parentID}
}

// maxLocalToolsInPrompt caps how many tools are sent to small local models.
// The fine-tuned OdooClaw models (Qwen 0.5B/1.5B) are trained with at most
// 5 tools listed per example; more tools cause hallucination.
const maxLocalToolsInPrompt = 5

// isLocalSmallModel reports whether the model name refers to a small local
// fine-tuned model (llama.cpp/ollama) that needs tools injected as plain text
// and a reduced tool set.
func isLocalSmallModel(model string) bool {
	lower := strings.ToLower(model)
	return strings.Contains(lower, "odooclaw") ||
		strings.Contains(lower, "local") ||
		strings.Contains(lower, "qwen") ||
		strings.Contains(lower, "llama") ||
		strings.Contains(lower, "0.5b") ||
		strings.Contains(lower, "1.5b")
}

// lastUserMessageText returns the content of the most recent user message.
func lastUserMessageText(messages []providers.Message) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			return messages[i].Content
		}
	}
	return ""
}

// retrieveRelevantTools selects the top-K tool definitions most relevant to the
// user query using lightweight keyword scoring over the tool name and domain.
// It guarantees the query's most salient Odoo domain is represented.
func retrieveRelevantTools(defs []providers.ToolDefinition, query string, k int) []providers.ToolDefinition {
	if len(defs) <= k {
		return defs
	}
	if strings.TrimSpace(query) == "" {
		return defs[:k]
	}

	queryLower := strings.ToLower(query)
	// Normalize accents: "recepción" → "recepcion", "albarán" → "albaran", etc.
	accentReplacer := strings.NewReplacer(
		"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n",
		"Á", "a", "É", "e", "Í", "i", "Ó", "o", "Ú", "u", "Ü", "u", "Ñ", "n",
	)
	queryLower = accentReplacer.Replace(queryLower)
	// Domain keywords map to tool name fragments (English + Spanish).
	domainKeywords := map[string][]string{
		"partner":    {"partner", "cliente", "contact", "empresa", "acme"},
		"product":    {"product", "producto", "productos"},
		"sale":       {"sale", "venta", "orden", "pedido", "so/", "order"},
		"invoice":    {"invoice", "factura", "facturas", "pago", "pending", "pendiente"},
		"task":       {"task", "tarea", "proyecto", "project"},
		"lead":       {"lead", "crm", "oportunidad"},
		"reconcile":  {"reconcile", "conciliar", "banco", "bank"},
		"tax":        {"tax", "impuesto", "iva"},
		"delivery":   {"delivery", "entrega", "entregas"},
		"inventory":  {"inventory", "ajuste", "adjustment", "valuation", "inventario", "almacen", "stock"},
		"activity":   {"activity", "actividad", "reunion", "meeting"},
		"chatter":    {"chatter", "mensaje", "message", "nota", "note"},
		"purchase":   {"purchase", "compra", "po/"},
		"account":    {"account", "cuenta", "contab", "saldo"},
		"aging":      {"aging", "antiguedad", "ar_ap", "ar/ap"},
		"migration":  {"migration", "migra"},
		"report":     {"report", "informe"},
		"expense":    {"expense", "gasto", "gastos"},
		"timesheet":  {"timesheet", "hoja de tiempos", "tiempos"},
		"attendance": {"attendance", "fichar", "asistencia"},
		"shipment":   {"shipment", "envio", "envíos"},
	}

	// Direct query-term → tool-fragment pairs (Spanish ↔ English tool names).
	// Fixes: "saldo"→aging/balance, "albaran"/"recepcion"→receipt, "ajuste"→adjustment,
	// "entrega(s)"→delivery, "gasto(s)"→expense, "tiempos"→timesheet, "fichar"→attendance.
	// NRA-445: creation-intent pairs + specific create-domain pairs (sale_order,
	// vendor_invoice, task) so "Crea un presupuesto" → odoo_create_sale_order,
	// not the generic odoo_create.
	queryToolPairs := [][2]string{
		{"saldo", "aging"}, {"saldo", "balance"}, {"saldo", "ar_ap"},
		{"albaran", "receipt"}, {"recepcion", "receipt"}, {"receipt", "receipt"},
		{"entrega", "delivery"}, {"entregas", "delivery"},
		{"gasto", "expense"}, {"gastos", "expense"},
		{"tiempos", "timesheet"}, {"fichar", "attendance"}, {"asistencia", "attendance"},
		{"envio", "shipment"}, {"envios", "shipment"},
		{"ajuste", "adjustment"}, {"inventario", "inventory"}, {"stock", "stock"},
		{"producto", "product"}, {"productos", "product"},
		{"factura", "invoice"}, {"facturas", "invoice"}, {"pendientes", "pending"},
		{"cliente", "partner"}, {"clientes", "partner"}, {"empresa", "partner"},
		// Search-intent verbs must favor find_* tools over get_*_summary
		{"busca", "find"}, {"buscar", "find"}, {"busqueda", "find"}, {"busqued", "find"},
		{"encuentra", "find"}, {"encontrar", "find"}, {"localiza", "find"}, {"localizar", "find"},
		{"consulta", "find"}, {"consultar", "find"}, {"dame", "find"}, {"muestrame", "find"}, {"muestra", "find"},
		{"quien es", "find"}, {"quien es", "summary"},
		{"tarea", "task"}, {"tareas", "task"}, {"proyecto", "project"},
		{"venta", "sale"}, {"pedido", "order"}, {"orden", "order"}, {"ventas", "sale"},
		{"cuenta", "account"}, {"contab", "account"}, {"banco", "bank"}, {"bancar", "bank"},
		{"compra", "purchase"}, {"compras", "purchase"},
		{"crm", "lead"}, {"oportunidad", "lead"},
		{"impuesto", "tax"}, {"iva", "tax"}, {"informe", "report"},
		{"mensaje", "chatter"}, {"nota", "note"}, {"reunion", "activity"}, {"actividad", "activity"},
		{"reconcili", "reconcile"}, {"conciliar", "reconcile"},
		// Counting queries: "cuántos/cuantos/total" must prefer search/count
		// tools (odoo_search_read, odoo_search) over single-record summaries.
		{"cuantos", "search_read"}, {"cuantos", "search"}, {"cuantos", "count"},
		{"cuantas", "search_read"}, {"cuantas", "search"}, {"cuantas", "count"},
		{"total", "search_read"}, {"total", "search"}, {"total", "count"},
		{"numero", "search_read"}, {"numero", "search"}, {"cuenta de", "search"},
		// NRA-445: creation intent — these pairs feed the generic-create
		// penalization below and boost ALL odoo_create_* tools equally.
		{"crea", "create"}, {"crear", "create"}, {"creame", "create"}, {"creame una", "create"},
		{"nueva", "create"}, {"nuevo", "create"}, {"nuevo cliente", "create"},
		{"alta", "create"}, {"registra", "create"}, {"registrar", "create"}, {"registrame", "create"},
		// NRA-445: specific create domains (so the specific tool beats the generic).
		{"presupuesto", "sale_order"}, {"presupuesto", "quotation"}, {"cotizacion", "quotation"},
		{"pedido de venta", "sale"},
		{"factura de proveedor", "vendor_invoice"}, {"factura de compra", "vendor_invoice"},
		{"tarea de", "task"}, {"to-do", "task"},
		// OCR-invoice MCP: when a message mentions an attached document/invoice
		// (the addon injects "🧾 [Factura/Documento: name (ID: N)]"), the
		// ocr-create-vendor-bill / ocr-invoice tools must reach the top-5.
		{"adjunto", "ocr"}, {"adjunta", "ocr"}, {"adjuntar", "ocr"},
		{"factura/documento", "ocr"}, {"documento", "ocr"}, {"pdf", "ocr"},
		{"factura de proveedor", "ocr"}, {"factura de compra", "ocr"},
		{"crear factura", "ocr"}, {"crea factura", "ocr"},
		{"extrae", "ocr"}, {"extraer", "ocr"}, {"lee la factura", "ocr"},
		{"factura adjunta", "ocr"}, {"factura adjunto", "ocr"},
		{"vendor bill", "ocr"}, {"extract", "ocr"},
		// Enterprise yes/no & number questions — the "silly" daily questions.
		// "¿existe X?" / "¿hay X?" → search (existence check on any model)
		{"existe", "search"}, {"existe el producto", "search"},
		{"hay un pedido", "search"}, {"hay alguna", "search"}, {"hay algun", "search"},
		{"existe el cliente", "search"}, {"existe la factura", "search"},
		// "¿cuánto debe?" / "deuda" / "estado contable" → aging / partner balance
		{"cuanto debe", "aging"}, {"cuanta deuda", "aging"}, {"deuda", "aging"},
		{"estado contable", "aging"}, {"balance", "aging"}, {"balance del mes", "aging"},
		{"me debe", "aging"}, {"deben", "aging"}, {"adeuda", "aging"}, {"adeudado", "aging"},
		{"pendiente de cobro", "pending"}, {"pendientes de cobro", "pending"},
		{"pendiente de pago", "pending"}, {"sin pagar", "pending"}, {"impagada", "pending"},
		// "¿el pedido entró? / generó albarán?" → receipts/deliveries
		{"genero albaran", "receipt"}, {"generado albaran", "receipt"}, {"entro el pedido", "receipt"},
		{"llegó el pedido", "receipt"}, {"ha llegado", "receipt"}, {"recibido", "receipt"},
		{"esta entregado", "delivery"}, {"se entrego", "delivery"}, {"entregado", "delivery"},
		// "¿estas tareas están asignadas a X?" → tasks_for_user / task_stats
		{"asignada a", "tasks_for_user"}, {"asignadas a", "tasks_for_user"},
		{"quien tiene asignada", "tasks_for_user"}, {"a quien esta asignada", "tasks_for_user"},
		// "¿cuántas tareas abiertas tengo?" → task_stats (mine)
		{"tareas abiertas", "task_stats"}, {"tareas pendientes", "task_stats"},
		{"mis tareas", "task_stats"}, {"tareas que tengo", "task_stats"},
		// NRA-4xx: synthesis tools — intent recognition, the MCP builds the domain.
		// "tareas de <persona>" / "tareas de <usuario>" → find_tasks_for_user
		{"tareas de", "tasks_for_user"}, {"tareas del usuario", "tasks_for_user"},
		{"tareas asignadas a", "tasks_for_user"}, {"tareas de juan", "tasks_for_user"},
		{"tareas de maria", "tasks_for_user"}, {"tareas de ana", "tasks_for_user"},
		{"tareas de carlos", "tasks_for_user"}, {"tareas de pedro", "tasks_for_user"},
		{"tareas de laura", "tasks_for_user"}, {"tareas de luis", "tasks_for_user"},
		{"que hace", "tasks_for_user"}, {"esta haciendo", "tasks_for_user"},
		{"le quedan", "tasks_for_user"}, {"tiene asignadas", "tasks_for_user"},
		// "pendientes de cerrar" / "sin cerrar" / "etapa cerrada" → get_task_stats
		{"pendientes de cerrar", "task_stats"}, {"sin cerrar", "task_stats"},
		{"etapa cerrada", "task_stats"}, {"abiertas", "task_stats"},
		{"en progreso", "task_stats"}, {"sin finalizar", "task_stats"},
		{"sin terminar", "task_stats"}, {"por hacer", "task_stats"},
		{"quedan por", "task_stats"}, {"en curso", "task_stats"},
		// "situación financiera" / "como estamos de dinero" → get_financial_snapshot
		{"situacion financiera", "financial_snapshot"}, {"situacion economica", "financial_snapshot"},
		{"como estamos de dinero", "financial_snapshot"}, {"resumen financiero", "financial_snapshot"},
		{"panorama financiero", "financial_snapshot"}, {"como vamos de dinero", "financial_snapshot"},
		{"estado financiero", "financial_snapshot"}, {"situacion del mes", "financial_snapshot"},
		{"que me deben", "financial_snapshot"}, {"cuanto me deben", "financial_snapshot"},
	}

	// createIntentTerms mark creation queries — they activate the generic
	// odoo_create penalization below.
	createIntentTerms := []string{"crea", "crear", "creame", "nueva", "nuevo", "alta",
		"registra", "registrar", "registrame", "presupuesto", "cotizacion",
		"factura de proveedor", "factura de compra", "tarea de", "to-do",
		"pedido de venta", "oportunidad"}

	// baseScore is the raw domain+pair+token overlap score (no NRA-445 adjustments).
	baseScore := func(name string) int {
		s := 0
		lower := strings.ToLower(name)
		for _, kw := range domainKeywords["partner"] {
			if strings.Contains(queryLower, kw) {
				if strings.Contains(lower, "partner") {
					s += 3
				}
			}
		}
		for domain, kws := range domainKeywords {
			if domain == "partner" {
				continue
			}
			for _, kw := range kws {
				if strings.Contains(queryLower, kw) && strings.Contains(lower, domain) {
					s += 3
				}
			}
		}
		for _, pair := range queryToolPairs {
			if strings.Contains(queryLower, pair[0]) && strings.Contains(lower, pair[1]) {
				s += 3
			}
		}
		// Token overlap bonus
		for _, tok := range strings.FieldsFunc(queryLower, func(r rune) bool {
			return !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'))
		}) {
			if len(tok) >= 4 && strings.Contains(lower, tok) {
				s += 2
			}
		}
		return s
	}

	// nonPartnerScore excludes partner-domain contributions. Used to keep the
	// generic odoo_create for partner/contact creation (no odoo_create_partner
	// tool exists) while still penalizing it for other creation domains.
	nonPartnerScore := func(name string) int {
		s := 0
		lower := strings.ToLower(name)
		for domain, kws := range domainKeywords {
			if domain == "partner" {
				continue
			}
			for _, kw := range kws {
				if strings.Contains(queryLower, kw) && strings.Contains(lower, domain) {
					s += 3
				}
			}
		}
		for _, pair := range queryToolPairs {
			if pair[1] == "partner" {
				continue
			}
			if strings.Contains(queryLower, pair[0]) && strings.Contains(lower, pair[1]) {
				s += 3
			}
		}
		// Token overlap bonus (same tokens as baseScore)
		for _, tok := range strings.FieldsFunc(queryLower, func(r rune) bool {
			return !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'))
		}) {
			if len(tok) >= 4 && strings.Contains(lower, tok) {
				s += 2
			}
		}
		return s
	}

	// genericCreatePenalty pushes a tool out of the top-k (the small fine-tuned
	// model picks the generic odoo_create — "sounds safer" — even when the
	// specific tool is present, so the generic must NOT be offered).
	const genericCreatePenalty = 1000

	score := func(name string) int {
		s := baseScore(name)
		lower := strings.ToLower(name)
		// NRA-445: penalize the generic odoo_create when a specific odoo_create_*
		// tool clearly outranks it. Carve-out: if the only outranking create tool
		// is partner-driven, keep the generic (creating a partner uses it).
		if name == "odoo_create" {
			createIntent := false
			for _, term := range createIntentTerms {
				if strings.Contains(queryLower, term) {
					createIntent = true
					break
				}
			}
			if createIntent {
				bestSpecific := -1
				for _, d := range defs {
					n := d.Function.Name
					if strings.HasPrefix(n, "odoo_create_") && n != "odoo_create" {
						if bs := baseScore(n); bs > bestSpecific {
							bestSpecific = bs
						}
					}
				}
				if bestSpecific > s {
					penalize := false
					for _, d := range defs {
						n := d.Function.Name
						if !strings.HasPrefix(n, "odoo_create_") || n == "odoo_create" {
							continue
						}
						if baseScore(n) <= s {
							continue
						}
						if nonPartnerScore(n) > s {
							penalize = true
							break
						}
					}
					if penalize {
						s -= genericCreatePenalty
					}
				}
			}
		}
		// NRA-445: "oportunidad" is the canonical CRM/lead term — boost lead
		// tools so lead beats sale ("venta" drags queries toward sale_order).
		if strings.Contains(queryLower, "oportunidad") && strings.Contains(lower, "lead") {
			s += 6
		}
		// NRA-445: when "oportunidad" is present the lead domain WINS over sale:
		// drop sale tools and create_helpdesk_ticket_from_partner out of the
		// top-k (the 1.2B model over-indexes on "venta"→create_sale_order and on
		// partner params→helpdesk even when lead ranks #1 — verified vs model).
		if strings.Contains(queryLower, "oportunidad") &&
			(strings.Contains(lower, "sale") || strings.Contains(lower, "helpdesk")) {
			s -= genericCreatePenalty
		}
		// OCR routing: attached-document queries MUST prefer the ocr-invoice MCP
		// tools (ocr-create-vendor-bill / ocr-invoice). The odoo-mcp
		// *_from_ocr_validated tools are intermediate validation steps that the
		// small model cannot fill correctly (it hallucinates attachment_ids and
		// loops for 20 iterations) — push them out of the top-k entirely.
		ocrIntent := false
		for _, term := range []string{"adjunto", "adjunta", "adjuntar", "documento",
			"pdf", "factura adjunta", "factura adjunto", "factura de proveedor",
			"factura de compra", "crear factura", "crea factura", "extrae", "extraer",
			"lee la factura", "vendor bill", "extract"} {
			if strings.Contains(queryLower, term) {
				ocrIntent = true
				break
			}
		}
		if ocrIntent && strings.Contains(lower, "from_ocr_validated") {
			s -= genericCreatePenalty
		}
		if ocrIntent && strings.Contains(lower, "ocr-invoice") {
			s += 8 // boost the real OCR MCP tools above everything else
		}
		return s
	}

	type scored struct {
		def providers.ToolDefinition
		s   int
	}
	scoredDefs := make([]scored, 0, len(defs))
	for _, d := range defs {
		scoredDefs = append(scoredDefs, scored{def: d, s: score(d.Function.Name)})
	}
	// Stable sort by score desc
	sort.SliceStable(scoredDefs, func(i, j int) bool { return scoredDefs[i].s > scoredDefs[j].s })

	out := make([]providers.ToolDefinition, 0, k)
	seen := map[string]bool{}
	for _, sd := range scoredDefs {
		name := sd.def.Function.Name
		if seen[name] {
			continue
		}
		seen[name] = true
		out = append(out, sd.def)
		if len(out) >= k {
			break
		}
	}
	return out
}
// transientLLMRetryReason classifies an LLM error as transient (safe to retry)
// using the provider error classifier first, then falling back to string patterns.
// Returns the reason string and true if the error is transient.
func transientLLMRetryReason(err error) (string, bool) {
	if err == nil {
		return "", false
	}

	// Use the provider error classifier for structured detection.
	if failErr := providers.ClassifyError(err, "", ""); failErr != nil {
		switch failErr.Reason {
		case providers.FailoverTimeout:
			if failErr.Status >= 500 {
				return "server_error", true
			}
			return "timeout", true
		case providers.FailoverRateLimit, providers.FailoverOverloaded:
			return "rate_limit", true
		}
	}

	// Fallback: string patterns for network errors not caught by the classifier.
	errMsg := strings.ToLower(err.Error())
	if strings.Contains(errMsg, "connection reset") ||
		strings.Contains(errMsg, "connection refused") ||
		strings.Contains(errMsg, "broken pipe") ||
		strings.Contains(errMsg, "no such host") ||
		strings.Contains(errMsg, "network is unreachable") {
		return "network", true
	}

	return "", false
}
