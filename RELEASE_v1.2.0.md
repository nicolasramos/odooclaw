# OdooClaw v1.2.0: business verbs, deterministic dev tools, resilient pipeline

## Summary

OdooClaw 1.2.0 makes the assistant useful for everyday ERP work with a small local model. The Odoo MCP now ships prebuilt business verbs instead of asking the model to compose domains and one2many commands, the dev tools build view changes themselves, the MCP is part of the default configuration, and the pipeline survives the failures found in a full functional pass.

## Highlights

### Business verbs in the Odoo MCP
- `odoo_update_by(model, lookup, values)`: resolve a name, a label or a number against the schema and write the field. The model no longer needs the record id or the technical field type.
- `odoo_create_sale_order`, `odoo_create_record`, `odoo_run_action`, `odoo_set_line_quantity`: create a quotation, create any record, run a workflow button and change an order line by product name.
- `odoo_create_invoice_from_sale_order` stays as the billing path.

### Deterministic dev tools
- `dev_add_field_to_view` and `dev_set_view_field_visibility` read the view, check the anchor and build the inherited `<data><xpath>` themselves. The model only picks model, view, anchor, field and whether to apply.
- The ledger validates the inherited view as XML before proposing it.

### MCP by default
- `tools.mcp` is enabled by default and, with `ODOO_URL` and `ODOO_DB`, the gateway wires `odoo_manager` on its own.
- Every pipeline prompt carries the business tools rule: a value is written into its field, never by creating a field; `dev_*` is only for views, fields and modules.

### Pipeline resilience
- A prose answer (or an invented action name) becomes the draft body instead of a failed run with nothing to read.
- A run that hits the job deadline still reports its failure, so it does not stay `queued` forever.
- The reply token is kept across several answers to the same conversation.

### Proactive
- Quiet hours are configurable with `ODOOCLAW_PROACTIVE_QUIET_FROM` and `ODOOCLAW_PROACTIVE_QUIET_TO`.
- The opt-in is persisted in SQLite and reloaded at startup: accepting suggestions survives a deploy.

## Verification

- 49 Go packages pass, build clean.
- RLM kernel suite: 21 tests.
- Module suite `mail_bot_odooclaw`: 93 tests, 0 failures.
- End to end on the staging preview: invoice image read by the multimodal model, voice note transcribed, partner, phone, CRM lead, quotation, order line and workflow action executed from the chatter, artifact stored in Odoo, `/mcp` endpoint with scoped keys, proactive signal with area, opt-in, quiet hours and cooldown.
