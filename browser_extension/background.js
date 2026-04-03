// Cross-browser compatibility - use browser namespace with chrome fallback
globalThis.browser = globalThis.browser || globalThis.chrome;

const DEFAULT_API_BASE = "http://127.0.0.1:8765";
const HEALTH_PATH = "/browser-copilot/health";
const SNAPSHOT_PATH = "/browser-copilot/snapshot";
const PLAN_PATH = "/browser-copilot/plan";
const ACTION_PATH = "/browser-copilot/action";
const AUTO_SHARE_MIN_INTERVAL_MS = 10000;

function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return DEFAULT_API_BASE;
  }
  return value.replace(/\/+$/, "");
}

async function getConfig() {
  const config = await browser.storage.local.get({
    apiBase: DEFAULT_API_BASE,
    token: "dev-token",
    pairingCode: "",
    pairingLinked: false,
    pairingChatID: "",
    tabStates: {},
    lastResult: null,
    pendingAction: null
  });
  return {
    ...config,
    apiBase: normalizeApiBase(config.apiBase)
  };
}

async function setStateForTab(tabId, updates) {
  const config = await getConfig();
  const current = config.tabStates[String(tabId)] || {
    enabled: false,
    pairingCode: "",
    pairingLinked: false,
    pairingChatID: "",
    lastSnapshot: null,
    lastAutoSharedAt: null,
    lastAutoSharedUrl: ""
  };
  const tabStates = {
    ...config.tabStates,
    [String(tabId)]: { ...current, ...updates }
  };
  await browser.storage.local.set({ tabStates });
  return tabStates[String(tabId)];
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function postJson(url, token, payload) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Browser-Copilot-Token": token
    },
    body: JSON.stringify(payload)
  });
}

async function getBackendHealth(config, tabId) {
  if (!config.token) {
    return {
      reachable: false,
      status: "missing token",
      readOnly: true,
      error: "Token is not configured"
    };
  }

  if (typeof tabId !== "number") {
    return {
      reachable: false,
      status: "no active tab",
      readOnly: true,
      error: "No active tab to perform health check"
    };
  }

  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "CHECK_BACKEND_HEALTH",
      apiBase: config.apiBase
    });

    if (!response || !response.ok) {
      return {
        reachable: false,
        status: "unreachable",
        readOnly: true,
        error: response && response.error ? response.error : "Health check failed"
      };
    }

    const body = response.body || {};
    return {
      reachable: true,
      status: body.status || "ok",
      readOnly: Boolean(body.read_only),
      domains: Array.isArray(body.domains_configured) ? body.domains_configured : []
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    return {
      reachable: false,
      status: "unreachable",
      readOnly: true,
      error: message
    };
  }
}

async function buildSnapshotFromTab(tabId) {
  const response = await browser.tabs.sendMessage(tabId, { type: "BUILD_SNAPSHOT" });
  if (!response || !response.ok) {
    const error = (response && response.error) || "Unable to build snapshot";
    throw new Error(error);
  }
  return response.snapshot;
}

async function sendSnapshot(tab, userInstruction = "") {
  const config = await getConfig();
  const tabState = config.tabStates[String(tab.id)] || null;
  const snapshot = await buildSnapshotFromTab(tab.id);
  snapshot.source = "browser_extension";
  if (tabState && tabState.pairingLinked && tabState.pairingCode) {
    snapshot.pairing_code = tabState.pairingCode;
  }

  const snapshotResponse = await postJson(`${config.apiBase}${SNAPSHOT_PATH}`, config.token, snapshot);
  const snapshotBody = await snapshotResponse.json();
  if (!snapshotResponse.ok) {
    throw new Error(snapshotBody.detail || "Snapshot endpoint failed");
  }

  let planBody = null;
  if (userInstruction && userInstruction.trim().length > 0) {
    const planPayload = { snapshot, instruction: userInstruction.trim() };
    const planResponse = await postJson(`${config.apiBase}${PLAN_PATH}`, config.token, planPayload);
    planBody = await planResponse.json();
    if (!planResponse.ok) {
      throw new Error(planBody.detail || "Plan endpoint failed");
    }
  }

  const latest = {
    when: new Date().toISOString(),
    tabId: tab.id,
    domain: snapshot.page.domain,
    snapshot,
    analysis: snapshotBody,
    plan: planBody
  };

  await setStateForTab(tab.id, { enabled: true, lastSnapshot: latest });
  await browser.storage.local.set({
    lastResult: latest,
    pendingAction: planBody && planBody.actions_suggested ? planBody.actions_suggested[0] || null : null
  });
  return latest;
}

function shouldAutoShare(tabState, tab) {
  if (!tabState || !tabState.enabled || !tab || typeof tab.id !== "number") {
    return false;
  }
  const currentUrl = String(tab.url || "");
  const lastUrl = String(tabState.lastAutoSharedUrl || "");
  const lastAt = tabState.lastAutoSharedAt ? Date.parse(tabState.lastAutoSharedAt) : 0;
  const tooSoon = Number.isFinite(lastAt) && (Date.now() - lastAt) < AUTO_SHARE_MIN_INTERVAL_MS;
  return currentUrl !== lastUrl || !tooSoon;
}

async function autoShareTab(tabId) {
  const config = await getConfig();
  const tab = await browser.tabs.get(tabId);
  const tabState = config.tabStates[String(tabId)] || null;
  if (!shouldAutoShare(tabState, tab)) {
    return;
  }

  try {
    const result = await sendSnapshot(tab, "");
    await setStateForTab(tabId, {
      enabled: true,
      lastSnapshot: result,
      lastAutoSharedAt: new Date().toISOString(),
      lastAutoSharedUrl: String(tab.url || "")
    });
  } catch (error) {
    console.warn("Auto-share failed", error);
  }
}

async function executePendingAction(tabId) {
  const config = await getConfig();
  if (!config.pendingAction) {
    throw new Error("No pending action available");
  }

  const actionResponse = await postJson(`${config.apiBase}${ACTION_PATH}`, config.token, {
    action: config.pendingAction,
    approved: true
  });

  const actionBody = await actionResponse.json();
  if (!actionResponse.ok) {
    throw new Error(actionBody.detail || "Action endpoint failed");
  }

  const executeResponse = await browser.tabs.sendMessage(tabId, {
    type: "EXECUTE_ACTION",
    action: actionBody.command
  });

  if (!executeResponse || !executeResponse.ok) {
    throw new Error((executeResponse && executeResponse.error) || "Execution failed in tab");
  }

  await browser.storage.local.set({ pendingAction: null });
  return actionBody;
}

async function linkWithCode(code) {
  const config = await getConfig();
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No hay una pestaña activa para vincular");
  }
  const normalized = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== 6) {
    throw new Error("Código inválido");
  }

  const response = await postJson(`${config.apiBase}/browser-copilot/pairing/link`, config.token, {
    code: normalized
  });
  const body = await response.json();
  if (!response.ok || !body.linked) {
    throw new Error((body && body.detail) || "Código no válido o expirado");
  }

  await setStateForTab(tab.id, {
    enabled: true,
    pairingCode: body.code,
    pairingLinked: true,
    pairingChatID: body.chat_id || ""
  });

  try {
    const shared = await shareActiveTabAfterPairing(tab.id);
    return { ...body, autoShared: Boolean(shared.shared) };
  } catch (error) {
    return {
      ...body,
      autoShared: false,
      autoShareError: error && error.message ? error.message : String(error)
    };
  }
}

async function clearPairing() {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  await setStateForTab(tab.id, {
    enabled: false,
    pairingCode: "",
    pairingLinked: false,
    pairingChatID: ""
  });
}

async function shareActiveTabAfterPairing(tabId) {
  const resolvedTabId = typeof tabId === "number" ? tabId : null;
  const tab = resolvedTabId !== null ? await browser.tabs.get(resolvedTabId) : await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    return { shared: false };
  }

  const config = await getConfig();
  const tabState = config.tabStates[String(tab.id)] || null;
  if (!tabState || !tabState.enabled) {
    return { shared: false };
  }

  const result = await sendSnapshot(tab, "");
  await setStateForTab(tab.id, {
    enabled: true,
    lastSnapshot: result,
    lastAutoSharedAt: new Date().toISOString(),
    lastAutoSharedUrl: String(tab.url || "")
  });

  return { shared: true, result };
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) {
      sendResponse({ ok: false, error: "Invalid message" });
      return;
    }

    if (message.type === "GET_POPUP_STATE") {
      const tab = await getActiveTab();
      const config = await getConfig();
      const state = (tab && config.tabStates[String(tab.id)]) || {
        enabled: false,
        pairingCode: "",
        pairingLinked: false,
        pairingChatID: "",
        lastSnapshot: null
      };
      const backendHealth = await getBackendHealth(config, tab && typeof tab.id === "number" ? tab.id : undefined);
      sendResponse({
        ok: true,
        tab,
        state,
        apiBase: config.apiBase,
        hasToken: Boolean(config.token),
        pairingCode: state.pairingCode || "",
        pairingLinked: Boolean(state.pairingLinked),
        pairingChatID: state.pairingChatID || "",
        backendHealth,
        pendingAction: config.pendingAction,
        lastResult: config.lastResult
      });
      return;
    }

    if (message.type === "UPDATE_SETTINGS") {
      const normalizedApiBase = normalizeApiBase(message.apiBase || DEFAULT_API_BASE);
      await browser.storage.local.set({
        apiBase: normalizedApiBase,
        token: message.token || ""
      });
      sendResponse({ ok: true, apiBase: normalizedApiBase });
      return;
    }

    if (message.type === "LINK_WITH_CODE") {
      const result = await linkWithCode(message.code || "");
      sendResponse({ ok: true, result });
      return;
    }

    if (message.type === "CLEAR_PAIRING") {
      await clearPairing();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "TOGGLE_CAPTURE") {
      const tab = await getActiveTab();
      if (!tab || typeof tab.id !== "number") {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }
      const updated = await setStateForTab(tab.id, { enabled: Boolean(message.enabled) });
      if (message.enabled) {
        await autoShareTab(tab.id);
      }
      sendResponse({ ok: true, state: updated });
      return;
    }

    if (message.type === "SEND_CONTEXT") {
      const tab = await getActiveTab();
      if (!tab || typeof tab.id !== "number") {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }
      const result = await sendSnapshot(tab, message.instruction || "");
      sendResponse({ ok: true, result });
      return;
    }

    if (message.type === "EXECUTE_ACTION") {
      const tab = await getActiveTab();
      if (!tab || typeof tab.id !== "number") {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }
      const result = await executePendingAction(tab.id);
      sendResponse({ ok: true, result });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })().catch((error) => {
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  autoShareTab(tabId).catch((error) => {
    console.warn("Auto-share update failed", error);
  });
});
