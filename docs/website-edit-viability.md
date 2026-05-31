# OdooClaw Website Edit Mode and Guided Training Viability Study

This document defines the feasibility study and development roadmap for OdooClaw's next browser-assisted capabilities:

1. **Website Edit Mode** — visually edit Odoo Website pages with controlled browser automation.
2. **Backend Guided Training Mode** — guide users through Odoo backend workflows without executing business actions for them.
3. **Odoo Website MCP Knowledge Pack** — enrich OdooClaw/Odoo MCP with structured knowledge of Odoo Website domains and native modules.

Tracking issue: https://github.com/nicolasramos/odooclaw/issues/10

Related deployment/community issues:

- TLS support: https://github.com/nicolasramos/odooclaw/issues/9
- OCA/ai module strategy: https://github.com/nicolasramos/odooclaw/issues/8

---

## 1. Product Decision

OdooClaw must treat Odoo Website and Odoo Backend differently.

| Area | User expectation | Correct mode |
|---|---|---|
| Website frontend | “Edit this page for me” | Controlled visual editing |
| Odoo backend | “Show me how to do this” | Guided training, not execution |
| Odoo business records | “Change this invoice/order/product” | ORM/MCP first, browser only for context/preview |

**Rule:** Website can be edited visually; backend should primarily teach and guide.

---

## 2. Current Foundation

Current tracked code already includes:

- `browser_extension/` — browser extension that captures tab context and can execute basic actions.
- `odooclaw/browser_copilot/` — FastAPI backend for snapshots, pairing, planning and action approval.
- Existing Browser Copilot tests pass at HEAD `e41a8a2`.

Current Browser Copilot capabilities:

| Capability | Status |
|---|---|
| Pair browser tab to conversation | Present |
| Capture page snapshot | Present |
| Basic Odoo detection | Present |
| Domain allowlist/token/read-only | Present |
| Basic actions: click/set/select/scroll | Present |
| Website-specific editor knowledge | Missing |
| Guided training primitives | Missing |
| Visual edit runner with logs/screenshots | Missing |
| Website chat widget | Missing |

---

## 3. Scope of the Viability Study

The study must cover the full Odoo Website ecosystem, not only static pages.

### Domains

| Domain | Native concepts/models | Notes |
|---|---|---|
| Pages | `website.page`, `ir.ui.view`, `website` | URLs, publication, SEO, multi-website |
| Menus | `website.menu` | Navigation, hierarchy, sequence, URLs |
| Editor | `web_editor`, website editor UI | Open editor, select blocks, save, discard, publish |
| Snippets/blocks | QWeb snippets, snippet options | Static/dynamic snippets, options, editor sidebar |
| Blog | `website_blog`, `blog.blog`, `blog.post` | Posts, tags, covers, publication, SEO |
| eCommerce | `website_sale` | Shop pages, checkout, product snippets |
| Catalog | `product.template`, `product.public.category` | Publish, categories, images, descriptions |
| Forms | `website_form`, `website_crm` | Contact/lead forms and actions |
| SEO | website metadata fields | Titles, descriptions, slugs, OG image |
| Media | `ir.attachment`, images | Upload, replace, optimize, reuse |
| Themes/assets | `web.assets_frontend`, QWeb, SCSS | Frontend widget, overlays, chat |
| i18n/multi-website | `website`, translations | Language/context-sensitive changes |

---

## 4. Execution Matrix

Not every operation should be browser automation. The feasibility study must classify each capability.

| Capability | Preferred executor | Reason |
|---|---|---|
| Change visible page text | Browser / Playwright | Visual editor behavior matters |
| Change hero or CTA | Browser / Playwright | User wants to see it happen |
| Add/reorder visual block | Browser / Playwright | Editor-specific UX |
| Create/update menu | ORM/MCP + preview | Deterministic data operation |
| Create page draft | Hybrid | ORM possible, preview required |
| Publish page | ORM/MCP or browser, explicit confirmation | High-impact action |
| Create blog post draft | ORM/MCP + preview | Structured content object |
| Publish blog post | ORM/MCP with confirmation | High-impact action |
| Update product website description | ORM/MCP + preview | Product data must stay consistent |
| Assign product public category | ORM/MCP | Structured catalog data |
| Change product images | ORM/MCP + browser preview | Media needs validation |
| Audit catalog SEO/images | ORM/MCP | Data inspection task |
| Guide backend user | Extension overlay | User should perform actions |

---

## 5. MCP Knowledge Pack Proposal

Create a structured knowledge layer instead of dumping documentation into prompts.

Proposed location:

```text
odooclaw/browser_copilot/knowledge/odoo_website/
├── capabilities.schema.json
├── odoo16.json
├── odoo17.json
├── odoo18.json
├── native_modules.json
├── snippets.json
├── editor_flows.json
├── risk_policy.json
└── training_flows.json
```

Each domain entry should define:

```json
{
  "domain": "menus",
  "models": ["website.menu", "website.page"],
  "capabilities": ["list", "create", "update", "reorder"],
  "safe_actions": ["list", "preview"],
  "risky_actions": ["delete", "publish"],
  "preferred_executor": "orm",
  "browser_verification": true,
  "version_notes": {
    "16": [],
    "17": [],
    "18": []
  }
}
```

---

## 6. MCP Tools Candidate List

### Website base

- `odoo_website_detect_installed_modules`
- `odoo_website_get_current_site`
- `odoo_website_list_pages`
- `odoo_website_get_page`
- `odoo_website_create_page_draft`
- `odoo_website_update_page_seo`
- `odoo_website_publish_page`

### Menus

- `odoo_website_list_menus`
- `odoo_website_create_menu`
- `odoo_website_update_menu`
- `odoo_website_reorder_menu`

### Snippets/blocks

- `odoo_website_list_known_snippets`
- `odoo_website_detect_page_blocks`
- `odoo_website_get_snippet_capabilities`
- `odoo_website_validate_snippet_change`

### Blog

- `odoo_blog_list_blogs`
- `odoo_blog_create_post_draft`
- `odoo_blog_update_post`
- `odoo_blog_publish_post`

### eCommerce/catalog

- `odoo_shop_list_categories`
- `odoo_shop_list_published_products`
- `odoo_shop_publish_product`
- `odoo_shop_update_product_website_content`
- `odoo_shop_assign_product_category`
- `odoo_shop_audit_catalog`

### Training

- `odoo_backend_get_menu_path`
- `odoo_backend_get_action_for_menu`
- `odoo_backend_generate_training_steps`
- `odoo_backend_explain_workflow`

---

## 7. Browser Copilot Extensions Needed

### New action types

For guided training:

- `highlight_element`
- `show_tooltip`
- `wait_for_user_click`
- `confirm_step_completed`
- `clear_guidance`

For website editing:

- `open_website_editor`
- `select_block`
- `edit_text`
- `edit_link`
- `replace_image`
- `save_draft`
- `preview_page`

### Safety rules

- Backend guided training must not perform business actions automatically.
- Website publish/delete/custom HTML require explicit confirmation.
- Browser actions must be domain-allowlisted.
- Every visual edit run must produce logs and screenshots.

---

## 8. Webwright-Style Runner Proposal

Do not integrate Webwright as unrestricted shell execution. Borrow its good pattern:

```text
plan → validate → execute controlled actions → capture evidence → verify
```

Proposed output per run:

```text
runs/website_edit_<timestamp>/
├── instruction.txt
├── plan.json
├── actions.jsonl
├── screenshot_before.png
├── screenshot_after.png
├── verification.json
└── user_confirmation.json
```

---

## 9. First PoC

### Goal

Edit a basic Odoo Website hero section and CTA visibly.

### Scenario

User instruction:

> Change the hero title, subtitle and primary CTA button on this website page. Show me the preview before publishing.

### Acceptance criteria

- [ ] Browser Copilot detects current website page.
- [ ] Runner opens website editor.
- [ ] Runner edits hero title/subtitle.
- [ ] Runner edits CTA label/link.
- [ ] System captures before/after screenshots.
- [ ] System verifies the text exists in preview.
- [ ] System does not publish without explicit confirmation.

---

## 10. Reuse from `odoo-development-skill`

Useful areas:

- website module structure;
- controllers;
- QWeb templates;
- snippets and snippet options;
- frontend assets;
- OWL/public widgets;
- security and access patterns;
- Odoo version awareness.

Gaps:

- no complete operational map of the native Website Editor UI;
- no browser automation strategy;
- no version-specific editor selector catalog;
- no execution/audit/verification pattern for visual website edits.

---

## 11. Implementation Phases

1. **Feasibility study**
   - Complete this document with verified Odoo editor findings.
   - Map supported Odoo versions and native modules.

2. **Knowledge pack skeleton**
   - Add schema and initial Odoo 16/17/18 capability files.

3. **Guided Training Mode**
   - Add highlight/tooltip/wait primitives.
   - Build first backend training flow.

4. **Website Chat**
   - Add website chat widget and Odoo controller.
   - Link chat sessions to Browser Copilot context.

5. **Website Edit PoC**
   - Implement hero + CTA edit flow.
   - Add before/after verification.

6. **Roadmap expansion**
   - Menus, pages, snippets, blog, shop/catalog, forms, SEO/media.

---

## 12. Open Questions

- Which Odoo version should be used for the first PoC: 16, 17 or 18?
- Should Website Edit Mode require an installed browser extension, or can it run in a managed browser session?
- Should website publishing require a second confirmation beyond save/preview?
- Should generated visual edits be stored as reusable workflows?
- How much of website page editing should be done via `ir.ui.view` patches versus native editor UI?
