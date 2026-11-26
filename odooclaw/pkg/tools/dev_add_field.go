package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// DevAddFieldToViewTool adds a field under another field in a view without
// asking the model to write XPath. Small local models cannot craft a valid
// <data><xpath> reliably: they copy the anchor with the wrong quotes or invent
// placeholders. This tool reads the view, checks the anchor, builds the arch
// and proposes the change; it applies it when asked.
type DevAddFieldToViewTool struct{ client *DevClient }

func NewDevAddFieldToViewTool(client *DevClient) *DevAddFieldToViewTool {
	return &DevAddFieldToViewTool{client: client}
}

func (t *DevAddFieldToViewTool) Name() string { return "dev_add_field_to_view" }

func (t *DevAddFieldToViewTool) Description() string {
	return "Add a field under another field in an Odoo view (for example 'add the phone under the name in the CRM kanban'). " +
		"It reads the view, checks the anchor field, builds the inherited arch and proposes the change; with apply=true it also applies it. " +
		"Use this instead of writing XML yourself. Never ask the user for the model or the view: pass crm.lead and kanban."
}

func (t *DevAddFieldToViewTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"model":     map[string]any{"type": "string", "description": "Technical model name, e.g. crm.lead"},
			"view_type": map[string]any{"type": "string", "enum": []string{"form", "kanban", "list"}, "description": "View type. Default kanban."},
			"anchor":    map[string]any{"type": "string", "description": "Existing field name to insert after, e.g. name or phone."},
			"field":     map[string]any{"type": "string", "description": "Field to add, e.g. phone or mobile."},
			"apply":     map[string]any{"type": "boolean", "description": "Apply the change after validating it. Default true."},
		},
		"required": []string{"model", "anchor", "field"},
	}
}

func (t *DevAddFieldToViewTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	model := devStringArg(args, "model")
	anchor := devStringArg(args, "anchor")
	field := devStringArg(args, "field")
	if model == "" || anchor == "" || field == "" {
		return ErrorResult("model, anchor and field are required")
	}
	viewType := devStringArg(args, "view_type")
	if viewType == "" {
		viewType = "kanban"
	}
	apply := true
	if value, ok := args["apply"].(bool); ok {
		apply = value
	}

	view, err := t.client.Call(ctx, "/odooclaw_evolution/api/context", map[string]any{
		"model": model, "view_type": viewType,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	if reason, _ := view["error"].(string); reason != "" {
		message, _ := view["message"].(string)
		if message == "" {
			message = reason
		}
		return ErrorResult(message)
	}
	xmlid, _ := view["view_xmlid"].(string)
	if xmlid == "" {
		return ErrorResult(fmt.Sprintf("the %s view of %s has no xmlid; propose the change with an explicit arch", viewType, model))
	}
	arch, _ := view["arch"].(string)
	if arch == "" {
		return ErrorResult("the view returned no arch")
	}
	if !strings.Contains(arch, fmt.Sprintf("name=%q", anchor)) {
		return ErrorResult(fmt.Sprintf("anchor field %q is not in the %s view; read it with dev_get_context and pick a field that exists", anchor, viewType))
	}

	element := fmt.Sprintf(`<div class="text-muted"><field name=%q/></div>`, field)
	var expr string
	switch viewType {
	case "kanban":
		expr = fmt.Sprintf("//t[@t-name='card']//field[@name=%q]", anchor)
	default:
		expr = fmt.Sprintf("//field[@name=%q]", anchor)
	}
	inherited := fmt.Sprintf(`<data><xpath expr=%q position="after">%s</xpath></data>`, expr, element)

	proposal, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action":        "propose",
		"name":          fmt.Sprintf("Add %s under %s in the %s view of %s", field, anchor, viewType, model),
		"request_text":  fmt.Sprintf("Add the field %s under %s in the %s view of %s.", field, anchor, viewType, model),
		"kind":          "view",
		"level":         "n1",
		"target_model":  model,
		"target_module": "",
		"payload": map[string]any{
			"model":         model,
			"inherit_xmlid": xmlid,
			"arch":          inherited,
		},
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	if reason, _ := proposal["validation_error"].(string); reason != "" {
		message, _ := proposal["message"].(string)
		return ErrorResult(fmt.Sprintf("the ledger rejected the change: %s", message))
	}
	changeID := devIntArg(proposal, "id")
	result := map[string]any{
		"change_id":  changeID,
		"reference":  proposal["reference"],
		"status":     proposal["status"],
		"view_xmlid": xmlid,
		"arch":       inherited,
		"applied":    false,
		"next":       "dev_apply_change",
	}
	if apply {
		applied, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
			"action": "apply", "change_id": changeID,
		})
		if err != nil {
			return ErrorResult(err.Error())
		}
		result["status"] = applied["status"]
		result["applied"] = true
		delete(result, "next")
	}
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}
