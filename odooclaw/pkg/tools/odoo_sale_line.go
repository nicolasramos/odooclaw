package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/mcp"
)

// OdooSetLineQuantityTool changes the quantity of a product in a sale order.
// The generic odoo_write is too free-form for a small model: it wrote the
// one2many "lines" field on sale.order and then composed a domain out of dicts.
// This tool builds the search and the write itself; the model only chooses the
// order, the product and the quantity.
type OdooSetLineQuantityTool struct {
	manager *mcp.Manager
	server  string
}

func NewOdooSetLineQuantityTool(manager *mcp.Manager, server string) *OdooSetLineQuantityTool {
	return &OdooSetLineQuantityTool{manager: manager, server: server}
}

func (t *OdooSetLineQuantityTool) Name() string { return "odoo_set_line_quantity" }

func (t *OdooSetLineQuantityTool) Description() string {
	return "Change the quantity of a product in a sale order. Finds the order by its name (S00021) and the line by its product, then writes product_uom_qty on that line. " +
		"Use this for 'cambia la cantidad del producto a veinte unidades'. Do not write the lines field on sale.order."
}

func (t *OdooSetLineQuantityTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"order":    map[string]any{"type": "string", "description": "Sale order name (S00021) or numeric id."},
			"product":  map[string]any{"type": "string", "description": "Product name or id, when the order has several lines."},
			"quantity": map[string]any{"type": "number", "description": "New quantity."},
		},
		"required": []string{"order", "quantity"},
	}
}

func (t *OdooSetLineQuantityTool) call(ctx context.Context, tool string, args map[string]any) ([]map[string]any, error) {
	result, err := t.manager.CallTool(ctx, t.server, tool, args)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("%s returned no result", tool)
	}
	text := extractContentText(result.Content)
	if result.IsError {
		return nil, fmt.Errorf("%s: %s", tool, text)
	}
	var payload any
	if err := json.Unmarshal([]byte(text), &payload); err != nil {
		return nil, fmt.Errorf("%s returned non JSON: %s", tool, truncate(text, 200))
	}
	return recordsOf(payload), nil
}

func recordsOf(payload any) []map[string]any {
	switch value := payload.(type) {
	case []any:
		records := make([]map[string]any, 0, len(value))
		for _, item := range value {
			if record, ok := item.(map[string]any); ok {
				records = append(records, record)
			}
		}
		return records
	case map[string]any:
		for _, key := range []string{"records", "result", "data"} {
			if nested, ok := value[key]; ok {
				return recordsOf(nested)
			}
		}
	}
	return nil
}

func (t *OdooSetLineQuantityTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	order := strings.TrimSpace(devStringArg(args, "order"))
	product := strings.TrimSpace(devStringArg(args, "product"))
	quantity := devFloatArg(args, "quantity")
	if order == "" || quantity <= 0 {
		return ErrorResult("order and a positive quantity are required")
	}

	orderID := 0
	if parsed, err := strconv.Atoi(order); err == nil {
		orderID = parsed
	} else {
		orders, err := t.call(ctx, "odoo_search_read", map[string]any{
			"model":  "sale.order",
			"domain": []any{[]any{"name", "=", order}},
			"fields": []any{"id", "name"},
			"limit":  1,
		})
		if err != nil {
			return ErrorResult(err.Error())
		}
		if len(orders) == 0 {
			return ErrorResult(fmt.Sprintf("sale order %q not found", order))
		}
		orderID = devIntArg(orders[0], "id")
	}

	lines, err := t.call(ctx, "odoo_search_read", map[string]any{
		"model":  "sale.order.line",
		"domain": []any{[]any{"order_id", "=", orderID}},
		"fields": []any{"id", "product_id", "product_uom_qty"},
		"limit":  50,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	if len(lines) == 0 {
		return ErrorResult(fmt.Sprintf("sale order %d has no lines", orderID))
	}

	chosen := map[string]any(nil)
	if product != "" {
		for _, line := range lines {
			if lineMatchesProduct(line, product) {
				chosen = line
				break
			}
		}
		if chosen == nil {
			names := make([]string, 0, len(lines))
			for _, line := range lines {
				names = append(names, productName(line["product_id"]))
			}
			return ErrorResult(fmt.Sprintf("product %q is not in order %d; lines: %s", product, orderID, strings.Join(names, ", ")))
		}
	} else if len(lines) == 1 {
		chosen = lines[0]
	} else {
		names := make([]string, 0, len(lines))
		for _, line := range lines {
			names = append(names, productName(line["product_id"]))
		}
		return ErrorResult(fmt.Sprintf("order %d has several lines (%s); say which product", orderID, strings.Join(names, ", ")))
	}

	lineID := devIntArg(chosen, "id")
	previous := devFloatArg(chosen, "product_uom_qty")
	if _, err := t.call(ctx, "odoo_write", map[string]any{
		"model":  "sale.order.line",
		"ids":    []any{lineID},
		"values": map[string]any{"product_uom_qty": quantity},
	}); err != nil {
		return ErrorResult(err.Error())
	}

	result := map[string]any{
		"order":    orderID,
		"line":     lineID,
		"product":  productName(chosen["product_id"]),
		"previous": previous,
		"quantity": quantity,
	}
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}

func lineMatchesProduct(line map[string]any, product string) bool {
	name := productName(line["product_id"])
	if strings.EqualFold(name, product) {
		return true
	}
	if strings.Contains(strings.ToLower(name), strings.ToLower(product)) {
		return true
	}
	return strconv.Itoa(devIntArg(line, "product_id")) == product
}

func productName(value any) string {
	switch product := value.(type) {
	case []any:
		if len(product) > 1 {
			if name, ok := product[1].(string); ok {
				return name
			}
		}
	case map[string]any:
		if name, ok := product["name"].(string); ok {
			return name
		}
	case string:
		return product
	}
	return fmt.Sprint(value)
}

func devFloatArg(args map[string]any, key string) float64 {
	switch value := args[key].(type) {
	case float64:
		return value
	case float32:
		return float64(value)
	case int:
		return float64(value)
	case int64:
		return float64(value)
	case string:
		parsed, _ := strconv.ParseFloat(strings.TrimSpace(value), 64)
		return parsed
	}
	return 0
}

func truncate(text string, size int) string {
	if len(text) <= size {
		return text
	}
	return text[:size]
}
