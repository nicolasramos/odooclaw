const ACTION_TYPES = new Set(["click", "set_value", "select_option", "scroll_into_view"]);

function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
}

function normalizeText(text, maxLen = 200) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}

function firstNonEmptyText(values, maxLen = 120) {
  for (const value of values || []) {
    const normalized = normalizeText(value, maxLen);
    if (normalized) return normalized;
  }
  return "";
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value || "").replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

function buildSelector(element) {
  if (!element) return "";
  if (element.id) return `#${cssEscape(element.id)}`;

  const name = element.getAttribute("name");
  if (name) return `${element.tagName.toLowerCase()}[name="${cssEscape(name)}"]`;

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return `${element.tagName.toLowerCase()}[aria-label="${cssEscape(ariaLabel)}"]`;

  const classes = Array.from(element.classList || []).slice(0, 2);
  const classSelector = classes.map((cls) => `.${cssEscape(cls)}`).join("");
  const parent = element.parentElement;
  if (!parent) return `${element.tagName.toLowerCase()}${classSelector}`;

  const siblings = Array.from(parent.children).filter((node) => node.tagName === element.tagName);
  const idx = Math.max(siblings.indexOf(element), 0) + 1;
  return `${element.tagName.toLowerCase()}${classSelector}:nth-of-type(${idx})`;
}

function labelForElement(element) {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return normalizeText(ariaLabel, 120);

  const id = element.getAttribute("id");
  if (id) {
    const matchingLabel = document.querySelector(`label[for="${cssEscape(id)}"]`);
    if (matchingLabel && isVisible(matchingLabel)) return normalizeText(matchingLabel.innerText, 120);
  }

  const wrappedLabel = element.closest("label");
  if (wrappedLabel && isVisible(wrappedLabel)) return normalizeText(wrappedLabel.innerText, 120);

  const placeholder = element.getAttribute("placeholder");
  if (placeholder) return normalizeText(placeholder, 120);

  return "";
}

function summarizeVisibleText() {
  return normalizeText(document.body ? document.body.innerText : "", 4000);
}

function collectElements() {
  const selector = "input, select, textarea, button, a";
  const nodes = Array.from(document.querySelectorAll(selector)).filter((element) => isVisible(element));

  return nodes.slice(0, 200).map((element, index) => {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute("role") || "";
    const type = element.getAttribute("type") || tag;
    const value = ["input", "textarea", "select"].includes(tag) ? element.value || "" : "";

    return {
      id: `el_${String(index + 1).padStart(3, "0")}`,
      type,
      tag,
      label: labelForElement(element),
      name: element.getAttribute("name") || "",
      role,
      selector: buildSelector(element),
      value: normalizeText(value, 300),
      text: normalizeText(element.innerText || element.textContent || "", 120),
      visible: true,
      enabled: !element.disabled
    };
  });
}

function collectTables() {
  const tables = Array.from(document.querySelectorAll("table")).filter((table) => isVisible(table));
  return tables.slice(0, 20).map((table, index) => {
    const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
    const headers = headerRow
      ? Array.from(headerRow.querySelectorAll("th, td"))
          .slice(0, 20)
          .map((cell) => normalizeText(cell.innerText, 80))
          .filter(Boolean)
      : [];

    const bodyRows = Array.from(table.querySelectorAll("tbody tr")).filter((row) => isVisible(row));
    const rowNodes = bodyRows.length > 0
      ? bodyRows
      : Array.from(table.querySelectorAll("tr")).filter((row) => isVisible(row) && row.querySelectorAll("td").length > 0);

    const rows = rowNodes.slice(0, 20).map((row) => {
      return Array.from(row.querySelectorAll("td"))
        .slice(0, 20)
        .map((cell) => normalizeText(cell.innerText, 80));
    });

    const footerRow = table.querySelector("tfoot tr");
    const footer = footerRow
      ? Array.from(footerRow.querySelectorAll("td, th"))
          .slice(0, 20)
          .map((cell) => normalizeText(cell.innerText, 80))
          .filter(Boolean)
      : [];

    const title = firstNonEmptyText([
      table.getAttribute("aria-label"),
      table.getAttribute("summary"),
      table.caption ? table.caption.innerText : "",
      table.closest("section, .o_content, .o_control_panel, .o_list_view")?.querySelector("h1, h2, h3")?.innerText || ""
    ]);

    return {
      id: `table_${String(index + 1).padStart(2, "0")}`,
      title,
      headers,
      rows,
      footer,
      row_count: rowNodes.length
    };
  });
}

function collectHeadingsAndBreadcrumbs() {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3")).filter((element) => isVisible(element));
  const breadcrumbCandidates = Array.from(
    document.querySelectorAll("nav[aria-label*='breadcrumb' i], .breadcrumb, .o_breadcrumb, .o_control_panel_breadcrumbs")
  );

  const breadcrumbs = breadcrumbCandidates
    .filter((element) => isVisible(element))
    .map((element) => normalizeText(element.innerText, 300))
    .filter((value) => value.length > 0)
    .slice(0, 5);

  const headingTexts = headings
    .map((element) => normalizeText(element.innerText, 140))
    .filter((value) => value.length > 0)
    .slice(0, 20);

  return { headings: headingTexts, breadcrumbs };
}

function collectForms() {
  const forms = Array.from(document.querySelectorAll("form")).filter((form) => isVisible(form));
  return forms.slice(0, 20).map((form, index) => {
    const inputs = Array.from(form.querySelectorAll("input, select, textarea"))
      .filter((element) => isVisible(element))
      .slice(0, 50)
      .map((element) => ({
        selector: buildSelector(element),
        name: element.getAttribute("name") || "",
        type: element.getAttribute("type") || element.tagName.toLowerCase(),
        label: labelForElement(element)
      }));

    return {
      id: `form_${String(index + 1).padStart(2, "0")}`,
      selector: buildSelector(form),
      fields: inputs
    };
  });
}

function buildSnapshot() {
  const now = new Date().toISOString();
  const { headings, breadcrumbs } = collectHeadingsAndBreadcrumbs();

  return {
    page: {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: now
    },
    app: {
      detected: "unknown",
      model: null,
      record_id: null,
      view_type: null
    },
    visible_text: summarizeVisibleText(),
    elements: collectElements(),
    forms: collectForms(),
    tables: collectTables(),
    headings,
    breadcrumbs,
    actions_available: ["click", "set_value", "select_option", "scroll_into_view"]
  };
}

function triggerInputEvents(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function executeAction(payload) {
  if (!payload || !ACTION_TYPES.has(payload.action_type)) {
    return { ok: false, error: "Unsupported action type" };
  }

  const selector = payload.target && payload.target.selector;
  if (!selector) return { ok: false, error: "Missing target selector" };

  const element = document.querySelector(selector);
  if (!element) return { ok: false, error: `Element not found for selector: ${selector}` };
  if (!isVisible(element)) return { ok: false, error: "Target element is not visible" };

  if (payload.action_type === "scroll_into_view") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return { ok: true };
  }

  if (payload.action_type === "click") {
    if (element.disabled) return { ok: false, error: "Target element is disabled" };
    element.click();
    return { ok: true };
  }

  if (payload.action_type === "set_value") {
    if (!["INPUT", "TEXTAREA"].includes(element.tagName)) {
      return { ok: false, error: "set_value requires input or textarea" };
    }
    if (element.disabled) return { ok: false, error: "Target element is disabled" };
    element.focus();
    element.value = payload.value || "";
    triggerInputEvents(element);
    return { ok: true };
  }

  if (payload.action_type === "select_option") {
    if (element.tagName !== "SELECT") return { ok: false, error: "select_option requires select element" };
    if (element.disabled) return { ok: false, error: "Target element is disabled" };

    const value = payload.value || "";
    const option = Array.from(element.options).find((candidate) => {
      return candidate.value === value || normalizeText(candidate.textContent || "") === normalizeText(value);
    });
    if (!option) return { ok: false, error: "Option not found" };

    element.value = option.value;
    triggerInputEvents(element);
    return { ok: true };
  }

  return { ok: false, error: "Unhandled action type" };
}

globalThis.browser = globalThis.browser || globalThis.chrome;

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "BUILD_SNAPSHOT") {
    try {
      const snapshot = buildSnapshot();
      sendResponse({ ok: true, snapshot });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return true;
  }

  if (message.type === "EXECUTE_ACTION") {
    try {
      const result = executeAction(message.action);
      sendResponse(result);
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return true;
  }

  if (message.type === "CHECK_BACKEND_HEALTH") {
    (async () => {
      const url = `${message.apiBase}/browser-copilot/health`;
      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          sendResponse({ ok: false, error: `Backend returned error: ${response.status}` });
          return;
        }
        const body = await response.json();
        sendResponse({ ok: true, body });
      } catch (error) {
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }
});
