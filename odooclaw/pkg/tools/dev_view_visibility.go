package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// DevSetViewFieldVisibilityTool hides or shows a field in a view. "Remove the
// phone from the kanban" is a view change, not a field deletion: the field
// belongs to the model and other views may use it. The tool writes the
// inherited arch with position="attributes" so the base view is untouched.
type DevSetViewFieldVisibilityTool struct{ client *DevClient }

func NewDevSetViewFieldVisibilityTool(client *DevClient) *DevSetViewFieldVisibilityTool {
	return &DevSetViewFieldVisibilityTool{client: client}
}

func (t *DevSetViewFieldVisibilityTool) Name() string { return "dev_set_view_field_visibility" }

func (t *DevSetViewFieldVisibilityTool) Description() string {
	return "Hide or show a field in a view (for example 'remove the phone from the CRM kanban'). " +
		"It builds the inherited arch with position=attributes (invisible=1, or column_invisible=1 in lists), proposes it and applies it. " +
		"This never deletes the field from the model. Use it instead of a field change."
}

func (t *DevSetViewFieldVisibilityTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"model":     map[string]any{"type": "string", "description": "Technical model name, e.g. crm.lead"},
			"view_type": map[string]any{"type": "string", "enum": []string{"form", "kanban", "list"}, "description": "View type. Default kanban."},
			"field":     map[string]any{"type": "string", "description": "Field to hide or show, e.g. phone."},
			"visible":   map[string]any{"type": "boolean", "description": "true shows it, false hides it. Default false."},
			"apply":     map[string]any{"type": "boolean", "description": "Apply after validating. Default true."},
		},
		"required": []string{"model", "field"},
	}
}

func (t *DevSetViewFieldVisibilityTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	model := devStringArg(args, "model")
	field := devStringArg(args, "field")
	if model == "" || field == "" {
		return ErrorResult("model and field are required")
	}
	viewType := devStringArg(args, "view_type")
	if viewType == "" {
		viewType = "kanban"
	}
	visible := false
	if value, ok := args["visible"].(bool); ok {
		visible = value
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
		return ErrorResult(fmt.Sprintf("the %s view of %s has no xmlid", viewType, model))
	}
	arch, _ := view["arch"].(string)
	if !strings.Contains(arch, fmt.Sprintf("name=%q", field)) {
		return ErrorResult(fmt.Sprintf("field %q is not in the %s view of %s", field, viewType, model))
	}

	attribute := "invisible"
	if viewType == "list" {
		attribute = "column_invisible"
	}
	value := "0"
	if !visible {
		value = "1"
	}
	inherited := fmt.Sprintf(
		`<data><xpath expr='//field[@name="%s"]' position="attributes"><attribute name="%s">%s</attribute></xpath></data>`,
		field, attribute, value,
	)

	proposal, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action":        "propose",
		"name":          fmt.Sprintf("%s %s in the %s view of %s", map[bool]string{true: "Show", false: "Hide"}[visible], field, viewType, model),
		"request_text":  fmt.Sprintf("%s the field %s in the %s view of %s.", map[bool]string{true: "Show", false: "Hide"}[visible], field, viewType, model),
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
