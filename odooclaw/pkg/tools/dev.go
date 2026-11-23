package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

// DevClient talks to the OdooClaw Evolution HTTP API that lives inside the
// customer's Odoo. The dev_* tools are thin, explicit wrappers: the Odoo
// module owns validation, permissions and the ledger; the tools only carry
// the agent's intent and return the result.
type DevClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewDevClient(baseURL, token string) *DevClient {
	return &DevClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		http:    &http.Client{Timeout: 20 * time.Second},
	}
}

func (c *DevClient) Call(ctx context.Context, path string, params map[string]any) (map[string]any, error) {
	if c == nil || c.baseURL == "" {
		return nil, fmt.Errorf("odoo base URL is not configured")
	}
	body, err := json.Marshal(map[string]any{"jsonrpc": "2.0", "params": params})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("X-OdooClaw-Token", c.token)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var envelope struct {
		Result map[string]any `json:"result"`
		Error  any            `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode Odoo response (HTTP %d): %w", resp.StatusCode, err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("odoo returned HTTP %d", resp.StatusCode)
	}
	if envelope.Error != nil {
		return nil, fmt.Errorf("odoo error: %v", envelope.Error)
	}
	if envelope.Result == nil {
		return nil, fmt.Errorf("odoo returned an empty result")
	}
	if msg, ok := envelope.Result["error"].(string); ok && msg != "" {
		return nil, fmt.Errorf("odoo error: %s", msg)
	}
	return envelope.Result, nil
}

func devStringArg(args map[string]any, key string) string {
	if v, ok := args[key].(string); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

func devIntArg(args map[string]any, key string) int {
	switch v := args[key].(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	case string:
		var n int
		if _, err := fmt.Sscanf(strings.TrimSpace(v), "%d", &n); err == nil {
			return n
		}
	}
	return 0
}

func devMapArg(args map[string]any, key string) map[string]any {
	if v, ok := args[key].(map[string]any); ok {
		return v
	}
	return nil
}

// DevGetContextTool returns the view the user is looking at: model, view id,
// field names, group/page anchors and their xpath. It is the first call of
// every development request; it does not change anything.
type DevGetContextTool struct{ client *DevClient }

func NewDevGetContextTool(client *DevClient) *DevGetContextTool {
	return &DevGetContextTool{client: client}
}

func (t *DevGetContextTool) Name() string { return "dev_get_context" }

func (t *DevGetContextTool) Description() string {
	return "Read the Odoo view context the user is looking at: model, view id, visible field names, group/page anchors and their xpath. Call this before proposing any change."
}

func (t *DevGetContextTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"model":     map[string]any{"type": "string", "description": "Odoo model, e.g. sale.order"},
			"view_type": map[string]any{"type": "string", "description": "View type: form, list, kanban or search. Default form."},
			"view_id":   map[string]any{"type": "integer", "description": "Optional explicit view id."},
			"res_id":    map[string]any{"type": "integer", "description": "Optional record id the user is viewing."},
			"action_id": map[string]any{"type": "integer", "description": "Optional action id."},
		},
		"required": []string{"model"},
	}
}

func (t *DevGetContextTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	model := devStringArg(args, "model")
	if model == "" {
		return ErrorResult("model is required")
	}
	viewType := devStringArg(args, "view_type")
	if viewType == "" {
		viewType = "form"
	}
	params := map[string]any{"model": model, "view_type": viewType}
	if v := devIntArg(args, "view_id"); v > 0 {
		params["view_id"] = v
	}
	if v := devIntArg(args, "res_id"); v > 0 {
		params["res_id"] = v
	}
	if v := devIntArg(args, "action_id"); v > 0 {
		params["action_id"] = v
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/context", params)
	if err != nil {
		return ErrorResult(err.Error())
	}
	arch, _ := result["arch"].(string)
	fields, _ := result["fields"].(map[string]any)
	points, _ := result["insert_points"].([]any)

	fieldNames := make([]string, 0, len(fields))
	for name := range fields {
		fieldNames = append(fieldNames, name)
	}
	sort.Strings(fieldNames)

	anchors := make([]map[string]any, 0, len(points))
	for _, raw := range points {
		point, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		tag, _ := point["tag"].(string)
		if tag == "field" {
			continue
		}
		anchors = append(anchors, map[string]any{
			"tag":    tag,
			"name":   point["name"],
			"string": point["string"],
			"xpath":  point["xpath"],
		})
	}

	summary := map[string]any{
		"model":              result["model"],
		"view_type":          result["view_type"],
		"view_id":            result["view_id"],
		"arch_chars":         len(arch),
		"field_count":        len(fields),
		"fields":             fieldNames,
		"anchors":            anchors,
		"insert_point_count": len(points),
	}
	if v := devIntArg(args, "res_id"); v > 0 {
		summary["res_id"] = v
	}
	if v := devIntArg(args, "action_id"); v > 0 {
		summary["action_id"] = v
	}
	data, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}

// DevGetFieldsTool returns field metadata for a model, optionally filtered by
// name or label. It is how the agent checks types and flags before proposing a
// field or a view change.
type DevGetFieldsTool struct{ client *DevClient }

func NewDevGetFieldsTool(client *DevClient) *DevGetFieldsTool {
	return &DevGetFieldsTool{client: client}
}

func (t *DevGetFieldsTool) Name() string { return "dev_get_fields" }

func (t *DevGetFieldsTool) Description() string {
	return "List Odoo field metadata for a model: name, type, label, required and readonly. Filter by name or label, e.g. margin or total."
}

func (t *DevGetFieldsTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"model":     map[string]any{"type": "string", "description": "Odoo model, e.g. sale.order"},
			"view_type": map[string]any{"type": "string", "description": "View type used to resolve visible fields. Default form."},
			"filter":    map[string]any{"type": "string", "description": "Case-insensitive name or label filter, e.g. margin or total."},
			"limit":     map[string]any{"type": "integer", "description": "Max fields to return. Default 80."},
		},
		"required": []string{"model"},
	}
}

func (t *DevGetFieldsTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	model := devStringArg(args, "model")
	if model == "" {
		return ErrorResult("model is required")
	}
	viewType := devStringArg(args, "view_type")
	if viewType == "" {
		viewType = "form"
	}
	filter := strings.ToLower(devStringArg(args, "filter"))
	limit := devIntArg(args, "limit")
	if limit <= 0 {
		limit = 80
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/fields", map[string]any{
		"model": model, "view_type": viewType, "filter": filter, "limit": limit,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	fields, _ := result["fields"].(map[string]any)
	names := make([]string, 0, len(fields))
	for name := range fields {
		names = append(names, name)
	}
	sort.Strings(names)

	lines := make([]string, 0, limit)
	for _, name := range names {
		info, _ := fields[name].(map[string]any)
		label, _ := info["string"].(string)
		if filter != "" &&
			!strings.Contains(strings.ToLower(name), filter) &&
			!strings.Contains(strings.ToLower(label), filter) {
			continue
		}
		ttype, _ := info["type"].(string)
		flags := make([]string, 0, 2)
		if required, _ := info["required"].(bool); required {
			flags = append(flags, "required")
		}
		if readonly, _ := info["readonly"].(bool); readonly {
			flags = append(flags, "readonly")
		}
		lines = append(lines, fmt.Sprintf("%s (%s) %q %s", name, ttype, label, strings.Join(flags, ",")))
		if len(lines) >= limit {
			break
		}
	}
	if len(lines) == 0 {
		return NewToolResult("no fields matched " + fmt.Sprintf("%q", filter))
	}
	return NewToolResult(strings.Join(lines, "\n"))
}

// DevInspectViewTool returns the view XML, or one XML subtree when an anchor
// name is given. The full sale.order form is ~37 KB, so the anchor mode is the
// practical one for a model: it keeps the agent focused on the node it will
// extend.
type DevInspectViewTool struct{ client *DevClient }

func NewDevInspectViewTool(client *DevClient) *DevInspectViewTool {
	return &DevInspectViewTool{client: client}
}

func (t *DevInspectViewTool) Name() string { return "dev_inspect_view" }

func (t *DevInspectViewTool) Description() string {
	return "Return the XML of an Odoo view, or only the subtree of one named node (group, page, button or field) with anchor. Use anchor to keep the result small before writing an xpath."
}

func (t *DevInspectViewTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"model":     map[string]any{"type": "string", "description": "Odoo model, e.g. sale.order"},
			"view_type": map[string]any{"type": "string", "description": "View type. Default form."},
			"view_id":   map[string]any{"type": "integer", "description": "Optional explicit view id."},
			"res_id":    map[string]any{"type": "integer", "description": "Optional record id."},
			"anchor":    map[string]any{"type": "string", "description": "Optional node name whose subtree to return, e.g. sale_total."},
		},
		"required": []string{"model"},
	}
}

func (t *DevInspectViewTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	model := devStringArg(args, "model")
	if model == "" {
		return ErrorResult("model is required")
	}
	viewType := devStringArg(args, "view_type")
	if viewType == "" {
		viewType = "form"
	}
	params := map[string]any{"model": model, "view_type": viewType}
	if v := devIntArg(args, "view_id"); v > 0 {
		params["view_id"] = v
	}
	if v := devIntArg(args, "res_id"); v > 0 {
		params["res_id"] = v
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/context", params)
	if err != nil {
		return ErrorResult(err.Error())
	}
	arch, _ := result["arch"].(string)
	if arch == "" {
		return ErrorResult("the view has no arch")
	}
	anchor := devStringArg(args, "anchor")
	if anchor != "" {
		subtree, err := devXMLSubtree(arch, anchor)
		if err != nil {
			return ErrorResult(fmt.Sprintf("anchor %q not found: %v", anchor, err))
		}
		return NewToolResult(subtree)
	}
	if len(arch) > 12000 {
		return NewToolResult(arch[:12000] + "\n... [truncated; call again with anchor=<node name> for a subtree]")
	}
	return NewToolResult(arch)
}

// DevProposeChangeTool writes a change record in draft. Nothing is applied:
// the Odoo ledger keeps the proposal, the user and the payload until someone
// applies it.
type DevProposeChangeTool struct{ client *DevClient }

func NewDevProposeChangeTool(client *DevClient) *DevProposeChangeTool {
	return &DevProposeChangeTool{client: client}
}

func (t *DevProposeChangeTool) Name() string { return "dev_propose_change" }

func (t *DevProposeChangeTool) Description() string {
	return "Create an OdooClaw change in draft with a payload for a field, view, server action or menu. It does not apply the change; use dev_apply_change with the returned change_id."
}

func (t *DevProposeChangeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"name":         map[string]any{"type": "string", "description": "Short title for the change."},
			"request_text": map[string]any{"type": "string", "description": "The user's request, verbatim."},
			"kind":         map[string]any{"type": "string", "enum": []string{"field", "view", "action", "menu", "module"}},
			"level":        map[string]any{"type": "string", "enum": []string{"n0", "n1", "n2", "n3"}, "description": "N0 data, N1 metadata, N2 new module, N3 existing module. Default n1."},
			"target_model": map[string]any{"type": "string", "description": "Optional model; defaults to payload.model."},
			"payload": map[string]any{
				"type":        "object",
				"description": "field: {model,name,ttype,field_description,selection,insert_after}; view: {model,inherit_xmlid,arch}; action: {model,code}; menu: {name,parent_xmlid,action_xmlid}; module: {module:'oc_slug', files:{path:content}}.",
			},
		},
		"required": []string{"kind", "payload"},
	}
}

func (t *DevProposeChangeTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	kind := devStringArg(args, "kind")
	if kind == "" {
		return ErrorResult("kind is required")
	}
	payload := devMapArg(args, "payload")
	if payload == nil && kind == "field" {
		// Models often send the field payload as a bare array; wrap it in
		// the multi-field shape the Odoo ledger understands.
		if items, ok := args["payload"].([]any); ok && len(items) > 0 {
			payload = map[string]any{"field": items}
		}
	}
	if payload == nil {
		return ErrorResult("payload must be an object")
	}
	level := devStringArg(args, "level")
	if level == "" {
		level = "n1"
	}
	name := devStringArg(args, "name")
	if name == "" {
		name = kind + " change"
	}
	target := devStringArg(args, "target_model")
	if target == "" {
		target, _ = payload["model"].(string)
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action":       "propose",
		"name":         name,
		"request_text": devStringArg(args, "request_text"),
		"kind":         kind,
		"level":        level,
		"target_model": target,
		"payload":      payload,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	data, err := json.MarshalIndent(map[string]any{
		"change_id": result["id"],
		"reference": result["reference"],
		"status":    result["status"],
		"next":      "dev_apply_change",
	}, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}

// DevApplyChangeTool applies a validated draft through the Odoo ledger. The
// module validates permissions, company and effects before writing; the tool
// then reads the change detail so the agent can report what was created.
type DevApplyChangeTool struct{ client *DevClient }

func NewDevApplyChangeTool(client *DevClient) *DevApplyChangeTool {
	return &DevApplyChangeTool{client: client}
}

func (t *DevApplyChangeTool) Name() string { return "dev_apply_change" }

func (t *DevApplyChangeTool) Description() string {
	return "Apply a draft OdooClaw change by change_id. The Odoo module validates and writes it in the current transaction, and records a snapshot for rollback."
}

func (t *DevApplyChangeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"change_id": map[string]any{"type": "integer", "description": "Change id returned by dev_propose_change."},
		},
		"required": []string{"change_id"},
	}
}

func (t *DevApplyChangeTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	changeID := devIntArg(args, "change_id")
	if changeID <= 0 {
		return ErrorResult("change_id is required")
	}
	detail, _ := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action": "detail", "change_id": changeID,
	})
	status := ""
	if detail != nil {
		status, _ = detail["status"].(string)
	}
	if status == "applied" || status == "rolled_back" {
		data, err := json.MarshalIndent(map[string]any{
			"change_id": changeID,
			"status":    status,
			"detail":    detail,
		}, "", "  ")
		if err != nil {
			return ErrorResult(err.Error())
		}
		return NewToolResult(string(data))
	}
	if status == "draft" {
		// The Odoo ledger validates a draft inside its apply action.
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action": "apply", "change_id": changeID,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	detail, _ = t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action": "detail", "change_id": changeID,
	})
	data, err := json.MarshalIndent(map[string]any{
		"change_id": changeID,
		"status":    result["status"],
		"detail":    detail,
	}, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}

// DevDiffTool reads the change detail: the proposal and the recorded snapshot.
// It is the agent's evidence that what it proposed is what was applied.
type DevDiffTool struct{ client *DevClient }

func NewDevDiffTool(client *DevClient) *DevDiffTool { return &DevDiffTool{client: client} }

func (t *DevDiffTool) Name() string { return "dev_diff" }

func (t *DevDiffTool) Description() string {
	return "Read an OdooClaw change by change_id: status, proposed payload and recorded snapshot. Use it to verify what was applied before reporting to the user."
}

func (t *DevDiffTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"change_id": map[string]any{"type": "integer", "description": "Change id to inspect."},
		},
		"required": []string{"change_id"},
	}
}

func (t *DevDiffTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	changeID := devIntArg(args, "change_id")
	if changeID <= 0 {
		return ErrorResult("change_id is required")
	}
	detail, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action": "detail", "change_id": changeID,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	status, _ := detail["status"].(string)
	payload, _ := detail["payload"].(string)
	snapshot, _ := detail["snapshot"].(string)
	var b strings.Builder
	fmt.Fprintf(&b, "change %v status=%s\n", detail["reference"], status)
	if payload != "" {
		fmt.Fprintf(&b, "proposal: %s\n", payload)
	}
	if snapshot != "" {
		fmt.Fprintf(&b, "applied: %s\n", snapshot)
	} else {
		b.WriteString("applied: (not applied yet)\n")
	}
	return NewToolResult(b.String())
}

// DevRollbackTool removes the artifact recorded in the change snapshot.
type DevRollbackTool struct{ client *DevClient }

func NewDevRollbackTool(client *DevClient) *DevRollbackTool {
	return &DevRollbackTool{client: client}
}

func (t *DevRollbackTool) Name() string { return "dev_rollback" }

func (t *DevRollbackTool) Description() string {
	return "Roll back an applied OdooClaw change by change_id. The module removes the artifact recorded in the snapshot and marks the change rolled_back."
}

func (t *DevRollbackTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"change_id": map[string]any{"type": "integer", "description": "Applied change id to roll back."},
		},
		"required": []string{"change_id"},
	}
}

func (t *DevRollbackTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	changeID := devIntArg(args, "change_id")
	if changeID <= 0 {
		return ErrorResult("change_id is required")
	}
	result, err := t.client.Call(ctx, "/odooclaw_evolution/api/change", map[string]any{
		"action": "rollback", "change_id": changeID,
	})
	if err != nil {
		return ErrorResult(err.Error())
	}
	data, err := json.MarshalIndent(map[string]any{
		"change_id": changeID,
		"status":    result["status"],
	}, "", "  ")
	if err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(string(data))
}

func devXMLSubtree(arch, anchor string) (string, error) {
	decoder := xml.NewDecoder(strings.NewReader(arch))
	var buf bytes.Buffer
	encoder := xml.NewEncoder(&buf)
	encoder.Indent("", "  ")
	found := false
	depth := 0
	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		switch tok := token.(type) {
		case xml.StartElement:
			if !found {
				if devXMLAttr(tok.Attr, "name") == anchor {
					found = true
					depth = 1
					if err := encoder.EncodeToken(tok); err != nil {
						return "", err
					}
				}
				continue
			}
			if err := encoder.EncodeToken(tok); err != nil {
				return "", err
			}
			depth++
		case xml.EndElement:
			if !found {
				continue
			}
			if err := encoder.EncodeToken(tok); err != nil {
				return "", err
			}
			depth--
			if depth == 0 {
				if err := encoder.Flush(); err != nil {
					return "", err
				}
				return buf.String(), nil
			}
		case xml.CharData:
			if found {
				if err := encoder.EncodeToken(tok); err != nil {
					return "", err
				}
			}
		case xml.Comment:
			if found {
				if err := encoder.EncodeToken(tok); err != nil {
					return "", err
				}
			}
		case xml.ProcInst:
			if found {
				if err := encoder.EncodeToken(tok); err != nil {
					return "", err
				}
			}
		case xml.Directive:
			if found {
				if err := encoder.EncodeToken(tok); err != nil {
					return "", err
				}
			}
		}
	}
	if !found {
		return "", fmt.Errorf("no node with name %q", anchor)
	}
	return "", fmt.Errorf("unclosed node %q", anchor)
}

func devXMLAttr(attrs []xml.Attr, key string) string {
	for _, attr := range attrs {
		if attr.Name.Local == key {
			return attr.Value
		}
	}
	return ""
}
