---
name: odoo-manager
description: Full-featured Odoo 18 ERP connector. Sales, CRM, Purchase, Inventory, Projects, HR, Accounting, Invoicing. Dynamic XML-RPC via execute_kw. Fuzzy matching, find-or-create, workflow actions (action_confirm, action_post, etc.), financial reporting. Use when user asks about Odoo data or wants to create/update/confirm records.
homepage: https://www.odoo.com/documentation/
metadata: {"openclaw":{"emoji":"🏢","requires":{"env":["ODOO_URL","ODOO_DB","ODOO_USERNAME","ODOO_PASSWORD"]},"primaryEnv":"ODOO_PASSWORD"}}
---

# Odoo Manager Skill

## ⚡ Quick Reference: Main Odoo Models

| Model | What It Contains | Use For |
|-------|------------------|---------|
| `res.partner` | Customers, suppliers, contacts | Find customer by name |
| `res.users` | Users / salespeople | Find salesperson by name, get `user_id` |
| `sale.order` | Quotations and sales orders | Revenue, order count, confirm |
| `account.move` | Invoices and journal entries | Invoices, payments, P&L |
| `purchase.order` | Purchase orders | Vendor, state, confirm |
| `product.template` | Product templates | Search/create products |
| `product.product` | Product variants | Stock, sale price |
| `stock.picking` | Delivery orders / stock moves | Validate deliveries |
| `project.project` | Projects | Search/create projects |
| `project.task` | Tasks | Assign, change state |
| `hr.employee` | Employees | Search employees |
| `crm.lead` | CRM opportunities | Sales pipeline |
| `account.account` | Chart of accounts | Financial reporting |
| `account.move.line` | Journal entry lines | Ledger detail |

## 🚨 Critical Rules (MANDATORY before acting)

1. **NEVER assume**: If the user says "the customer" or "the company" without specifying, ASK which one.
2. **Multi-company**: If multiple companies may exist in Odoo, ASK which one to use.
3. **Confirm before modifying**: For `write`, `create`, `unlink`, `action_confirm` → confirm with the user first.
4. **Numeric IDs**: Never pass names as IDs. Use `search` first to get the integer ID.
5. **Fuzzy matching**: Use `ilike` for name searches (case-insensitive), not `=`.

## 🔍 Find-or-Create Pattern (for names without known IDs)

When the user says "customer Acme" and you don't have the ID:

**Step 1 — Search:**
```json
{
  "model": "res.partner",
  "method": "search_read",
  "args": [[["name", "ilike", "Acme"]]],
  "kwargs": {"fields": ["id", "name"], "limit": 5}
}
```

**Step 2 — If not found, create:**
```json
{
  "model": "res.partner",
  "method": "create",
  "args": [{"name": "Acme Corp", "is_company": true}]
}
```

This pattern applies to: customers (`res.partner`), products (`product.template`), projects (`project.project`), departments (`hr.department`).

---

## 🔐 URL, Database & Credential Resolution

### URL Resolution

Odoo server URL precedence (highest to lowest):

1. `temporary_url` — one-time URL for a specific operation
2. `user_url` — user-defined URL for the current session
3. `ODOO_URL` — environment default URL

This allows you to:

- Switch between multiple Odoo instances (production, staging, client-specific)
- Test against demo databases
- Work with different client environments without changing global config

**Examples (conceptual):**

```text
// Default: uses ODOO_URL from environment
{{resolved_url}}/xmlrpc/2/common

// Override for one operation:
temporary_url = "https://staging.mycompany.odoo.com"
{{resolved_url}}/xmlrpc/2/common

// Override for session:
user_url = "https://client-xyz.odoo.com"
{{resolved_url}}/xmlrpc/2/common
```

### Database Resolution

Database name (`db`) precedence:

1. `temporary_db`
2. `user_db`
3. `ODOO_DB`

Use this to:

- Work with multiple databases on the same Odoo server
- Switch between test and production databases

### Username & Secret Resolution

Username precedence:

1. `temporary_username`
2. `user_username`
3. `ODOO_USERNAME`

Secret (password or API key) precedence:

1. `temporary_api_key` or `temporary_password`
2. `user_api_key` or `user_password`
3. `ODOO_API_KEY` (if set) or `ODOO_PASSWORD`

**Important:**

- Odoo API keys are used **in place of** the password, with the usual login.
- Store passwords / API keys like real passwords; never log or expose them.

Environment variables are handled via standard OpenClaw metadata: `requires.env` declares **required** variables (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`). `ODOO_API_KEY` is an **optional** environment variable used instead of the password when present.

### Resolved Values

At runtime the skill always works with:

- `{{resolved_url}}` — final URL
- `{{resolved_db}}` — final database name
- `{{resolved_username}}` — final login
- `{{resolved_secret}}` — password **or** API key actually used to authenticate

---

## 🔄 Context Management

> The `temporary_*` and `user_*` names are **runtime context variables used by the skill logic**, not OpenClaw metadata fields.

### Temporary Context (One-Time Use)

**User examples:**

- "For this request, use the Odoo staging instance"
- "Use database `odoo_demo` just for this operation"
- "Connect with this user only for this action"

**Behavior:**

- Set `temporary_*` (url, db, username, api_key/password)
- Use them for **a single logical operation**
- Automatically clear after use

### Session Context (Current Session)

**User examples:**

- "Work on client XYZ's Odoo instance"
- "Use database `clientx_prod` for this session"
- "Connect with my admin account for the next operations"

**Behavior:**

- Set `user_*` (url, db, username, api_key/password)
- Persist for the whole current session
- Overridden only by `temporary_*` or by clearing `user_*`

### Resetting Context

**User examples:**

- "Go back to the default Odoo configuration"
- "Clear my Odoo user context"

**Action:**

- Clear `user_url`, `user_db`, `user_username`, `user_password`, `user_api_key`
- Skill falls back to environment variables (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD` / `ODOO_API_KEY`)

### Viewing Current Context

**User examples:**

- "Which Odoo instance are you connected to?"
- "Show me the current Odoo configuration"

**Response should show (never full secrets):**

```text
Current Odoo Context:
- URL: https://client-xyz.odoo.com (user_url)
- DB: clientxyz_prod (user_db)
- Username: api_integration (user_username)
- Secret: using API key (user_api_key)
- Fallback URL: https://default.odoo.com (ODOO_URL)
- Fallback DB: default_db (ODOO_DB)
```

---

## ⚙️ Odoo XML-RPC Basics

Odoo exposes part of its server framework over **XML-RPC** (not REST).
The External API is documented here: https://www.odoo.com/documentation/18.0/fr/developer/reference/external_api.html

Two main endpoints:

- `{{resolved_url}}/xmlrpc/2/common` — authentication and meta calls
- `{{resolved_url}}/xmlrpc/2/object` — model methods via `execute_kw`

### 1. Checking Server Version

Call `version()` on the `common` endpoint to verify URL and connectivity:

```python
common = xmlrpc.client.ServerProxy(f"{resolved_url}/xmlrpc/2/common")
version_info = common.version()
```

Example result:

```json
{
  "server_version": "18.0",
  "server_version_info": [18, 0, 0, "final", 0],
  "server_serie": "18.0",
  "protocol_version": 1
}
```

### 2. Authenticating

Use `authenticate(db, username, password_or_api_key, {})` on the `common` endpoint:

```python
uid = common.authenticate(resolved_db, resolved_username, resolved_secret, {})
```

`uid` is an integer user ID and will be used in all subsequent calls.

If authentication fails, `uid` is `False` / `0` — the skill should:

- Inform the user that credentials or database are invalid
- Suggest checking `ODOO_URL`, `ODOO_DB`, username, and secret

### 3. Calling Model Methods with execute_kw

Build an XML-RPC client for the `object` endpoint:

```python
models = xmlrpc.client.ServerProxy(f"{resolved_url}/xmlrpc/2/object")
```

Then use `execute_kw` with the following signature:

```python
models.execute_kw(
    resolved_db,
    uid,
    resolved_secret,
    "model.name",     # e.g. "res.partner"
    "method_name",    # e.g. "search_read"
    [positional_args],
    {keyword_args}
)
```

All ORM operations in this skill are expressed in terms of `execute_kw`.

---

## 🔍 Domains & Data Types (Odoo ORM)

### Domain Filters

Domains are lists of conditions:

```python
domain = [["field_name", "operator", value], ...]
```

Examples:

- All companies: `[['is_company', '=', True]]`
- Partners in France: `[['country_id', '=', france_id]]`
- Leads with probability > 50%: `[['probability', '>', 50]]`

Common operators:

- `"="`, `"!="`, `">"`, `">="`, `"<"`, `"<="`
- `"like"`, `"ilike"` (case-insensitive)
- `"in"`, `"not in"`
- `"child_of"` (hierarchical relations)

### Field Value Conventions

- **Integer / Float / Char / Text**: use native types.
- **Date / Datetime**: strings in `YYYY-MM-DD` or ISO 8601 format.
- **Many2one**: supply the **record ID** (`int`) when writing; reads return `[id, display_name]`.
- **One2many / Many2many**: use Odoo **command list** protocol for writes.

---

## 🧩 Generic ORM Operations (execute_kw)

### List / Search Records (search)

**User queries:**

- "List all company partners"
- "Search for confirmed sales orders"

**Action (generic):**

```python
ids = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "search",
    [domain],
    {"offset": 0, "limit": 80}
)
```

### Count Records (search_count)

**User queries:**

- "How many partners are companies?"
- "Count open tasks"

**Action:**

```python
count = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "search_count",
    [domain]
)
```

### Read Records by ID (read)

**User queries:**

- "Show details for partner 7"
- "Give me the name and country_id for these IDs"

**Action:**

```python
records = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "read",
    [ids],
    {"fields": ["name", "country_id", "comment"]}
)
```

### Search and Read in One Step (search_read)

**User queries:**

- "List companies (name, country, comment)"
- "Show the first 5 partners with their countries"

**Action:**

```python
records = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "search_read",
    [domain],
    {
        "fields": ["name", "country_id", "comment"],
        "limit": 5,
        "offset": 0,
        # Optional: "order": "name asc"
    }
)
```

### Create Records (create)

**WARNING FOR MANY2ONE FIELDS:**
If a field is a Many2one relation (e.g. `categ_id`, `partner_id`), you **must** supply an integer ID, NOT a string name or list. Use `search` or `search_read` first to find the correct ID if you only have a name.

**Action:**

```python
new_id = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "create",
    [{
        "name": "New Partner",
        "parent_id": 45  # <-- Correct (Integer ID)
        # "parent_id": ["Some Name"]  <-- INCORRECT!
    }]
)
```

Returns the newly created record ID.

### Update Records (write)

**Action:**

```python
success = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "write",
    [ids, {"field": "new value", "other_field": 123}]
)
```

Notes:

- `ids` is a list of record IDs.
- All records in `ids` receive the **same** values.

### Delete Records (unlink)

**Action:**

```python
success = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "model.name", "unlink",
    [ids]
)
```

### Name-Based Search (name_search)

Useful for quick lookup on models with a display name.

**Action:**

```python
results = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "res.partner", "name_search",
    ["Agrolait"],
    {"limit": 10}
)
```

Result is a list of `[id, display_name]`.

---

## � Workflow Actions (action_confirm, etc.)

> **CRITICAL**: To execute actions like `action_confirm`, `action_cancel`, `action_draft` on any Odoo model, you MUST follow these steps in order:

### Step 1: Get the numeric record ID

NEVER pass the record name (e.g. `"S00005"`) directly to an action. First search for the numeric ID:

```json
{
  "model": "sale.order",
  "method": "search",
  "args": [[["name", "=", "S00005"]]]
}
```
This returns a list of integer IDs, e.g. `[42]`.

### Step 2: Call the action method with the numeric ID

```json
{
  "model": "sale.order",
  "method": "action_confirm",
  "args": [[42]]
}
```

> ⚠️ **NEVER**: `"args": [["S00005"]]` → Error `invalid input syntax for type integer`.
> ✅ **ALWAYS**: `"args": [[42]]` — list containing the integer ID.

### Common Odoo Workflow Actions

| Description | Model | Method |
|---|---|---|
| Confirm quotation / sales order | `sale.order` | `action_confirm` |
| Cancel sales order | `sale.order` | `action_cancel` |
| Reset to draft | `sale.order` | `action_draft` |
| Confirm / post invoice | `account.move` | `action_post` |
| Validate delivery | `stock.picking` | `button_validate` |
| Confirm purchase order | `purchase.order` | `button_confirm` |
| Cancel purchase order | `purchase.order` | `button_cancel` |
| Mark invoice as paid | `account.move` | `action_register_payment` |

---

## 👥 Contacts / Partners (res.partner)

`res.partner` is the core model for contacts, companies, and many business relations in Odoo.

### List Company Partners

**Action:**

```python
companies = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "res.partner", "search_read",
    [[["is_company", "=", True]]],
    {"fields": ["name", "country_id", "comment"], "limit": 80}
)
```

### Get a Single Partner

**Action:**

```python
[partner] = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "res.partner", "read",
    [[7]],
    {"fields": ["name", "country_id", "comment"]}
)
```

### Create a New Partner

**Minimal body:**

```python
partner_id = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "res.partner", "create",
    [{"name": "New Partner", "is_company": True}]
)
```

---

## 🧱 Model Introspection (ir.model, fields_get)

### Discover Fields of a Model (fields_get)

**Action:**

```python
fields = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "res.partner", "fields_get",
    [],
    {"attributes": ["string", "help", "type"]}
)
```

### List All Models (ir.model)

**Action:**

```python
models_list = models.execute_kw(
    resolved_db, uid, resolved_secret,
    "ir.model", "search_read",
    [[]],
    {"fields": ["model", "name", "state"], "limit": 200}
)
```

---

## ⚠️ Error Handling & Best Practices

### Typical Errors

- **Authentication failure**: wrong URL, DB, username, or secret → `authenticate` returns `False` or later calls fail.
- **Access rights / ACLs**: user does not have permission on a model or record.
- **Validation errors**: required fields missing, constraints violated.
- **Connectivity issues**: network errors reaching `xmlrpc/2/common` or `xmlrpc/2/object`.
- **Invalid type for integer field**: passing a name string where an integer ID is expected.

The skill should:

- Clearly indicate if the issue is with **connection**, **credentials**, or **business validation**.
- Propose next steps (check env vars, context overrides, user rights).

### Pagination

- Use `limit` / `offset` on `search` and `search_read` to handle large datasets.
- For interactive use, default `limit` to a reasonable value (e.g. 80).

### Field Selection

- Always send an explicit `fields` list for `read` / `search_read` when possible.
- This reduces payload and speeds up responses.

### Domains & Performance

- Prefer indexed fields and simple operators (`=`, `in`) for large datasets.
- Avoid unbounded searches without domain on very big tables when possible.

---

## 💬 Natural Language → Tool Mapping

### Sales

| User says | Model | Method |
|---|---|---|
| "How many pending quotations?" | `sale.order` | `search_count` + `[["state","=","draft"]]` |
| "Confirm order S00005" | `sale.order` | `search` → `action_confirm` |
| "Show orders from this month" | `sale.order` | `search_read` + `date_order` filter |
| "Cancel sale S00010" | `sale.order` | `search` → `action_cancel` |
| "Total invoiced today" | `account.move` | `search_read` + `move_type=out_invoice` |

### CRM

| User says | Model | Method |
|---|---|---|
| "Show me the sales pipeline" | `crm.lead` | `search_read` grouped by `stage_id` |
| "Create an opportunity for John" | `crm.lead` | `search` (partner) → `create` |
| "Which leads are at proposal stage?" | `crm.lead` | `search_read` + stage filter |

### Purchasing

| User says | Model | Method |
|---|---|---|
| "Confirm purchase order PO0001" | `purchase.order` | `search` → `button_confirm` |
| "Show pending purchase orders" | `purchase.order` | `search_read` + `[["state","=","draft"]]` |

### Inventory

| User says | Model | Method |
|---|---|---|
| "Stock level for Widget" | `product.product` | `search_read` + `qty_available` |
| "Low stock products" | `product.product` | `search_read` + `qty_available < X` filter |

### Accounting

| User says | Model | Method |
|---|---|---|
| "Unpaid invoices" | `account.move` | `search_read` + `payment_state=not_paid` |
| "Confirm invoice INV/2026/001" | `account.move` | `search` → `action_post` |
| "Total sales this month" | `account.move.line` | `search_read` + date and type filters |

---

## 📊 Advanced Financial Queries

### Correct Net Worth / Equity Calculation in Odoo

> **CRITICAL**: The `equity_unaffected` account type in Odoo is a **suspense account** for undistributed profits. Do NOT use its ledger balance directly.

```
Total Equity = Equity (type: equity) + Retained Earnings (equity_unaffected) + Current Year Earnings
```

Where: **Current Year Earnings** = Sum(income credit-debit) - Sum(expense debit-credit)

Models to use: `account.account`, `account.move.line`, groupby `account_id.internal_group`

### Revenue by Salesperson

```json
{
  "model": "sale.order",
  "method": "search_read",
  "args": [[["user_id.name", "ilike", "Maria"], ["state", "in", ["sale", "done"]]]],
  "kwargs": {"fields": ["name", "amount_total", "date_order", "partner_id"], "limit": 100}
}
```

### AR Aging (Overdue Invoices)

```json
{
  "model": "account.move",
  "method": "search_read",
  "args": [[["move_type", "=", "out_invoice"], ["payment_state", "!=", "paid"], ["invoice_date_due", "<", "2026-03-04"]]],
  "kwargs": {"fields": ["name", "partner_id", "amount_residual", "invoice_date_due"], "limit": 100}
}
```

---

## 🚀 End-to-End Examples

### Example 1: Confirm quotation S00005 (full flow)

1. `search` on `sale.order` with `[["name", "=", "S00005"]]` → returns `[42]`
2. `action_confirm` on `sale.order` with `args: [[42]]`
3. Verify with `search_read` on `sale.order` with `[["id","=",42]]` and `fields: ["name","state"]`

### Example 2: Create a quotation for customer "Acme" with product "Widget"

1. `search_read` on `res.partner` with `[["name","ilike","Acme"]]` → get `partner_id`
2. `search_read` on `product.product` with `[["name","ilike","Widget"]]` → get `product_id`
3. `create` on `sale.order` with `partner_id` from step 1
4. `create` on `sale.order.line` with `order_id`, `product_id`, `product_uom_qty`, `price_unit`

### Example 3: Sales pipeline summary

1. `search_read` on `crm.lead` with `[["active","=",true]]` and `fields: ["name","stage_id","expected_revenue"]`
2. Group results by `stage_id` in the response
3. Calculate total expected revenue per stage

### Example 4: Check Connection & List Company Partners

1. Resolve context: `{{resolved_url}}`, `{{resolved_db}}`, `{{resolved_username}}`, `{{resolved_secret}}`
2. Call `version()` on `{{resolved_url}}/xmlrpc/2/common`
3. Authenticate to get `uid`
4. Call `execute_kw` on `res.partner` with `search_read` and domain `[['is_company', '=', True]]`

---

## 📚 References & Capabilities Summary

- Official Odoo External API (XML-RPC): https://www.odoo.com/documentation/18.0/fr/developer/reference/external_api.html

**This skill can:**

- Full CRUD on **any Odoo 18 model** via `execute_kw`.
- Execute **workflow actions** (`action_confirm`, `action_post`, `button_validate`, etc.)
- **Fuzzy matching** with `ilike` to search by name without knowing the exact ID.
- **Find-or-create** for customers, products, projects and departments.
- Advanced financial queries (revenue by salesperson, AR aging, P&L).
- Model introspection with `fields_get`, `ir.model`, `ir.model.fields`.
- Dynamic instance/database switching with context variables.
- Connect to Odoo via XML-RPC using password **or** API key.
