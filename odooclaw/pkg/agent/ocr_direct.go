package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/tools"
)

// invoiceMarkerRe matches the addon-injected marker in Odoo chat messages:
//
//	🧾 [Factura/Documento: factura_demo_odoo.pdf (ID: 876)]
//
// The mail_bot_odooclaw addon appends this line to the body when a user
// attaches a PDF/image to a channel message.
var invoiceMarkerRe = regexp.MustCompile(`Factura/Documento:\s+([^\]]*?)\s*\(ID:\s*(\d+)\)`)

// Runtime-prefixed tool names for the ocr-invoice MCP server.
const (
	ocrCreateVendorBillTool = "mcp_ocr-invoice_ocr-create-vendor-bill"
	ocrExtractInvoiceTool   = "mcp_ocr-invoice_ocr-invoice"
)

// findInvoiceAttachment scans the user message for the addon invoice marker.
// Returns (attachmentID, ok).
func findInvoiceAttachment(userMessage string) (int, bool) {
	m := invoiceMarkerRe.FindStringSubmatch(userMessage)
	if m == nil {
		return 0, false
	}
	id, err := strconv.Atoi(m[2])
	if err != nil {
		return 0, false
	}
	return id, true
}

// hasOCRInvoiceTools reports whether the agent has any OCR invoice tool
// registered (the ocr-invoice MCP server must be connected).
func hasOCRInvoiceTools(agent *AgentInstance) bool {
	_, hasCreate := agent.Tools.Get(ocrCreateVendorBillTool)
	if hasCreate {
		return true
	}
	_, hasExtract := agent.Tools.Get(ocrExtractInvoiceTool)
	return hasExtract
}

// handleInvoiceAttachment is the deterministic OCR path for attached invoices.
// It bypasses the LLM entirely: when the user attaches a PDF, we call
// ocr-create-vendor-bill with the REAL attachment id (no hallucination, no
// 20-iteration loop) and return a human-readable summary.
func handleInvoiceAttachment(
	ctx context.Context,
	agent *AgentInstance,
	attachmentID int,
	opts processOptions,
) (string, error) {
	toolName := ocrCreateVendorBillTool
	if _, ok := agent.Tools.Get(toolName); !ok {
		if _, ok := agent.Tools.Get(ocrExtractInvoiceTool); ok {
			toolName = ocrExtractInvoiceTool
		} else {
			return "", fmt.Errorf("no OCR invoice tool registered (server ocr-invoice not connected)")
		}
	}

	args := map[string]any{
		"attachment_id": attachmentID,
		"dry_run":       false,
	}

	logger.InfoCF("agent", "Deterministic OCR path for attached invoice",
		map[string]any{
			"tool":          toolName,
			"attachment_id": attachmentID,
		})

	toolResult := agent.Tools.ExecuteWithContext(
		ctx,
		toolName,
		args,
		opts.Channel,
		opts.ChatID,
		opts.SenderID,
		opts.Metadata,
		nil, // asyncCallback: OCR tools are synchronous
	)

	if toolResult.IsError {
		errMsg := toolResult.ForLLM
		if toolResult.Err != nil {
			errMsg = toolResult.Err.Error()
		}
		return "", fmt.Errorf("%s failed: %s", toolName, errMsg)
	}

	return formatOCRResult(attachmentID, toolResult.ForLLM), nil
}

// formatOCRResult turns the raw OCR tool output into a chat-friendly summary.
func formatOCRResult(attachmentID int, raw string) string {
	var payload map[string]any
	trimmed := strings.TrimSpace(raw)
	if strings.HasPrefix(trimmed, "{") {
		_ = json.Unmarshal([]byte(trimmed), &payload)
	}
	if payload == nil {
		return fmt.Sprintf("🧾 He procesado la factura adjunta (ID %d).\n%s", attachmentID, trimmed)
	}

	success, _ := payload["success"].(bool)
	if !success {
		msg := ""
		if isErr, _ := payload["isError"].(bool); isErr {
			msg, _ = payload["content"].(string)
		}
		if msg == "" {
			msg = trimmed
		}
		return fmt.Sprintf("⚠️ No he podido procesar la factura adjunta (ID %d): %s", attachmentID, msg)
	}

	moveID, _ := payload["move_id"].(float64)
	partnerID, _ := payload["partner_id"].(float64)
	linked, _ := payload["attachment_linked"].(bool)

	summary := fmt.Sprintf(
		"🧾 He creado la factura de proveedor a partir del documento adjunto (ID %d).",
		attachmentID,
	)
	if moveID > 0 {
		summary += fmt.Sprintf("\n📄 Factura de proveedor: /odoo/account.move/%d", int(moveID))
	}
	if partnerID > 0 {
		summary += fmt.Sprintf("\n👤 Proveedor: /odoo/contacts/%d", int(partnerID))
	}
	if linked {
		summary += "\n📎 Documento original adjuntado a la factura."
	}
	return summary
}

var _ = tools.ToolResult{}
