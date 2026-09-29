package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/logger"
)

// voiceMarkerRe matches the addon-injected marker in Odoo chat messages:
//
//	🎤 [Nota de voz: Voice-2026-09-29-3099.mp3 (ID: 48324)]
//
// The mail_bot_odooclaw addon appends this line to the body when a user
// attaches a voice note to a channel message (see
// models/mail_thread.py, "voice_attachments").
var voiceMarkerRe = regexp.MustCompile(`Nota de voz:\s+([^\]]*?)\s*\(ID:\s*(\d+)\)`)

// Runtime-prefixed tool name for the whisper-stt MCP server.
const whisperTranscribeTool = "mcp_whisper-stt_whisper-transcribe"

// findVoiceAttachment scans the user message for the addon voice-note marker.
// Returns (attachmentID, ok).
func findVoiceAttachment(userMessage string) (int, bool) {
	m := voiceMarkerRe.FindStringSubmatch(userMessage)
	if m == nil {
		return 0, false
	}
	id, err := strconv.Atoi(m[2])
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

// hasWhisperTools reports whether the whisper-stt MCP server is connected.
func hasWhisperTools(agent *AgentInstance) bool {
	_, ok := agent.Tools.Get(whisperTranscribeTool)
	return ok
}

// handleVoiceAttachment is the deterministic STT path for attached voice notes.
// It bypasses the LLM's tool routing entirely: when the user sends a voice note
// we call whisper-transcribe with the REAL attachment id and return the
// transcript, so the model answers the question the user actually spoke.
//
// This mirrors handleInvoiceAttachment. The routing cannot be left to the model:
// the whisper-* tools are absent from its training set, and with 135 registered
// tools the prompt cap (64) drops them from the list the model ever sees, so it
// falls back to poking at the filesystem with exec until it exhausts
// max_tool_iterations and answers nothing.
func handleVoiceAttachment(
	ctx context.Context,
	agent *AgentInstance,
	attachmentID int,
	opts processOptions,
) (string, error) {
	if _, ok := agent.Tools.Get(whisperTranscribeTool); !ok {
		return "", fmt.Errorf("no whisper tool registered")
	}

	args := map[string]any{"attachment_id": attachmentID}

	logger.InfoCF("agent", "Deterministic STT path for attached voice note",
		map[string]any{
			"tool":          whisperTranscribeTool,
			"attachment_id": attachmentID,
		})

	toolResult := agent.Tools.ExecuteWithContext(
		ctx,
		whisperTranscribeTool,
		args,
		opts.Channel,
		opts.ChatID,
		opts.SenderID,
		opts.Metadata,
		nil, // asyncCallback: the STT tool is synchronous
	)

	if toolResult.IsError {
		errMsg := toolResult.ForLLM
		if toolResult.Err != nil {
			errMsg = toolResult.Err.Error()
		}
		return "", fmt.Errorf("%s failed: %s", whisperTranscribeTool, errMsg)
	}

	transcript, language := parseVoiceTranscript(toolResult.ForLLM)
	if transcript == "" {
		return "", errors.New("whisper-transcribe returned an empty transcript")
	}

	logger.InfoCF("agent", "Voice deterministic path completed",
		map[string]any{
			"attachment_id":  attachmentID,
			"transcript_len": len(transcript),
			"language":       language,
		})

	return formatVoiceTranscript(transcript, language), nil
}

// parseVoiceTranscript extracts the transcript from the whisper-stt MCP payload.
//
// The skill answers with a JSON object encoded as text:
//
//	{"success": true, "text": "Hola...", "language": "es", "method": "whisper_api",
//	 "message": "Transcription complete. Use this text as the user's message."}
//
// A plain-text answer is accepted too, so a future server version that returns
// the transcript directly keeps working.
func parseVoiceTranscript(raw string) (string, string) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", ""
	}

	if strings.HasPrefix(trimmed, "{") {
		var payload struct {
			Text     string `json:"text"`
			Language string `json:"language"`
			Success  *bool  `json:"success"`
		}
		if err := json.Unmarshal([]byte(trimmed), &payload); err == nil {
			if payload.Success != nil && !*payload.Success {
				return "", ""
			}
			return strings.TrimSpace(payload.Text), payload.Language
		}
	}

	return trimmed, ""
}

// formatVoiceTranscript renders the transcript as the user's message, so the
// agent answers what was actually said and shows the text it worked from.
func formatVoiceTranscript(transcript, language string) string {
	var b strings.Builder
	b.WriteString("🎤 Transcripción de la nota de voz")
	if language != "" && !strings.EqualFold(language, "auto-detected") {
		b.WriteString(" (" + language + ")")
	}
	b.WriteString(":\n\n")
	b.WriteString(transcript)
	return b.String()
}
