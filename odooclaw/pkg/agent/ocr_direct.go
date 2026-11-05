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
	summary += formatInvoiceData(payload["invoice_data"])
	return summary
}

// formatInvoiceData shows what was actually booked. A draft with 0.00 used to
// look the same as a good one in the chat; printing the numbers means a bad
// extraction is visible where the user is, not only in Odoo.
func formatInvoiceData(raw any) string {
	data, ok := raw.(map[string]any)
	if !ok || len(data) == 0 {
		return ""
	}

	summary := ""
	if ref, _ := data["ref"].(string); ref != "" {
		summary += fmt.Sprintf("\n🔖 Referencia: %s", ref)
	}
	if date, _ := data["invoice_date"].(string); date != "" {
		summary += fmt.Sprintf("\n📅 Fecha: %s", date)
	}

	amounts := ""
	for _, field := range []struct {
		key   string
		label string
	}{
		{"amount_untaxed", "Base"},
		{"amount_tax", "Impuestos"},
		{"amount_total", "Total"},
	} {
		if value, ok := data[field.key].(float64); ok {
			amounts += fmt.Sprintf("\n   %s: %.2f", field.label, value)
		}
	}
	if amounts != "" {
		summary += "\n💶 Importes:" + amounts
	}

	if lines, ok := data["invoice_line_ids"].([]any); ok && len(lines) > 0 {
		summary += fmt.Sprintf("\n📋 Líneas (%d):", len(lines))
		for index, rawLine := range lines {
			if index == 10 {
				summary += "\n   ..."
				break
			}
			line, _ := rawLine.(map[string]any)
			name, _ := line["name"].(string)
			quantity, _ := line["quantity"].(float64)
			price, _ := line["price_unit"].(float64)
			summary += fmt.Sprintf("\n   - %s: %g x %.2f", name, quantity, price)
		}
	}
	return summary
}

var _ = tools.ToolResult{}
