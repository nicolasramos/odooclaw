#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8765}"
TOKEN="${BROWSER_COPILOT_TOKEN:-dev-token}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

health_out="$tmp_dir/health.json"
snapshot_out="$tmp_dir/snapshot.json"
plan_out="$tmp_dir/plan.json"
action_out="$tmp_dir/action.json"

snapshot_payload="$tmp_dir/snapshot_payload.json"
plan_payload="$tmp_dir/plan_payload.json"
action_payload="$tmp_dir/action_payload.json"

cat > "$snapshot_payload" <<'JSON'
{
  "page": {
    "url": "https://demo.odoo.com/web#id=42&model=res.partner&view_type=form",
    "title": "Azure Interior - Odoo",
    "domain": "demo.odoo.com",
    "timestamp": "2026-03-19T12:30:00Z"
  },
  "app": {
    "detected": "unknown",
    "model": null,
    "record_id": null,
    "view_type": null
  },
  "visible_text": "Azure Interior contact details are partially complete.",
  "elements": [
    {
      "id": "el_001",
      "type": "input",
      "tag": "input",
      "label": "Name",
      "name": "name",
      "role": "textbox",
      "selector": "input[name='name']",
      "value": "",
      "visible": true,
      "enabled": true
    },
    {
      "id": "el_002",
      "type": "button",
      "tag": "button",
      "label": "Guardar",
      "name": "",
      "role": "button",
      "selector": "button.o_form_button_save",
      "value": "",
      "text": "Guardar",
      "visible": true,
      "enabled": true
    }
  ],
  "forms": [],
  "tables": [],
  "headings": ["Azure Interior"],
  "breadcrumbs": ["Sales / Customers"],
  "actions_available": ["click", "set_value", "select_option", "scroll_into_view"]
}
JSON

cat > "$plan_payload" <<JSON
{
  "snapshot": $(cat "$snapshot_payload"),
  "instruction": "resume este cliente"
}
JSON

cat > "$action_payload" <<'JSON'
{
  "action": {
    "action_type": "click",
    "target": {
      "element_id": "el_002",
      "selector": "button.o_form_button_save"
    },
    "reason": "Save as user-approved action"
  },
  "approved": true
}
JSON

echo "1) Checking health endpoint..."
health_code="$(curl -sS -o "$health_out" -w "%{http_code}" "$BASE_URL/browser-copilot/health")"
if [[ "$health_code" != "200" ]]; then
  echo "Health failed (HTTP $health_code)"
  cat "$health_out"
  exit 1
fi

echo "2) Sending snapshot..."
snapshot_code="$(curl -sS -o "$snapshot_out" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "X-Browser-Copilot-Token: $TOKEN" \
  -d @"$snapshot_payload" \
  "$BASE_URL/browser-copilot/snapshot")"
if [[ "$snapshot_code" != "200" ]]; then
  echo "Snapshot failed (HTTP $snapshot_code)"
  cat "$snapshot_out"
  exit 1
fi

echo "3) Requesting plan..."
plan_code="$(curl -sS -o "$plan_out" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "X-Browser-Copilot-Token: $TOKEN" \
  -d @"$plan_payload" \
  "$BASE_URL/browser-copilot/plan")"
if [[ "$plan_code" != "200" ]]; then
  echo "Plan failed (HTTP $plan_code)"
  cat "$plan_out"
  exit 1
fi

echo "4) Requesting action (expected 403 with read_only=true)..."
action_code="$(curl -sS -o "$action_out" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "X-Browser-Copilot-Token: $TOKEN" \
  -d @"$action_payload" \
  "$BASE_URL/browser-copilot/action")"

if [[ "$action_code" == "403" ]]; then
  echo "Action endpoint correctly blocked by read_only mode."
else
  echo "Action endpoint returned HTTP $action_code."
fi

echo
echo "--- Health ---"
cat "$health_out"
echo
echo "--- Snapshot ---"
cat "$snapshot_out"
echo
echo "--- Plan ---"
cat "$plan_out"
echo
echo "--- Action ---"
cat "$action_out"
echo
echo "Smoke test completed."
