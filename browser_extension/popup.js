// Cross-browser compatibility - use browser namespace with chrome fallback
globalThis.browser = globalThis.browser || globalThis.chrome;

function sendMessage(message) {
  return browser.runtime.sendMessage(message);
}

function setMessage(text, isError = false) {
  const messageEl = document.getElementById("message");
  messageEl.textContent = text || "";
  messageEl.style.color = isError ? "#b91c1c" : "#1e3a8a";
}

function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "http://127.0.0.1:8765";
  }
  return value.replace(/\/+$/, "");
}

function formatRelativeTime(isoString) {
  if (!isoString) {
    return "-";
  }

  const timestamp = Date.parse(isoString);
  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) {
    return "ahora";
  }
  if (seconds < 60) {
    return `hace ${seconds} s`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}

function formatConversationLabel(chatId) {
  const value = String(chatId || "").trim();
  if (!value) {
    return "-";
  }
  if (value.startsWith("discuss.channel_")) {
    return `Canal ${value.replace("discuss.channel_", "#")}`;
  }
  return value;
}

function updateStateView(state) {
  const lastSnapshot = state.state && state.state.lastSnapshot ? state.state.lastSnapshot : null;
  const badge = document.getElementById("pairingStatusBadge");
  badge.textContent = state.pairingLinked ? "Vinculada" : "No vinculada";
  badge.classList.toggle("is-on", Boolean(state.pairingLinked));
  badge.classList.toggle("is-off", !state.pairingLinked);

  const sharedLabel = state.state && state.state.enabled ? "Compartida" : "No compartida";
  const chatLabel = state.pairingLinked ? formatConversationLabel(state.pairingChatID) : "sin conversación vinculada";
  const timeLabel = state.pairingLinked && lastSnapshot && lastSnapshot.when
    ? ` · último contexto ${formatRelativeTime(lastSnapshot.when)}`
    : "";
  document.getElementById("shareStatus").textContent = `${sharedLabel}${state.pairingLinked ? ` · ${chatLabel}` : ""}${timeLabel}`;

  const captureToggle = document.getElementById("captureToggle");
  captureToggle.checked = Boolean(state.state && state.state.enabled);
  captureToggle.disabled = !state.pairingLinked;

  const pairingCodeInput = document.getElementById("pairingCode");
  if (state.pairingLinked) {
    pairingCodeInput.value = state.pairingCode || "";
  } else if (!document.activeElement || document.activeElement.id !== "pairingCode") {
    pairingCodeInput.value = "";
  }
}

async function refreshState() {
  const result = await sendMessage({ type: "GET_POPUP_STATE" });
  if (!result || !result.ok) {
    setMessage((result && result.error) || "Failed to load popup state", true);
    return;
  }
  updateStateView(result);
}

async function onToggleCapture(event) {
  const enabled = event.target.checked;
  if (enabled) {
    const popupState = await sendMessage({ type: "GET_POPUP_STATE" });
    if (!popupState || !popupState.ok || !popupState.pairingLinked) {
      event.target.checked = false;
      setMessage("Primero vincula la extensión con un código.", true);
      return;
    }
  }
  const result = await sendMessage({ type: "TOGGLE_CAPTURE", enabled });
  if (!result || !result.ok) {
    setMessage((result && result.error) || "Failed to update capture mode", true);
    return;
  }
  setMessage(enabled ? "Pestaña compartida con OdooClaw." : "Pestaña ya no compartida.");
  await refreshState();
}

async function onLinkCode() {
  const code = document.getElementById("pairingCode").value.trim();
  const result = await sendMessage({ type: "LINK_WITH_CODE", code });
  if (!result || !result.ok) {
    setMessage((result && result.error) || "No se pudo vincular el código", true);
    return;
  }
  const linkedChat = formatConversationLabel(result.result && result.result.chat_id);
  const autoShared = Boolean(result.result && result.result.autoShared);
  setMessage(autoShared
    ? `Vinculada a ${linkedChat}. Contexto compartido automáticamente.`
    : `Vinculada a ${linkedChat}. Activa compartir pestaña para enviar contexto.`);
  await refreshState();
}

async function onClearPairing() {
  const result = await sendMessage({ type: "CLEAR_PAIRING" });
  if (!result || !result.ok) {
    setMessage((result && result.error) || "No se pudo limpiar la vinculación", true);
    return;
  }
  document.getElementById("pairingCode").value = "";
  setMessage("Esta pestaña quedó desvinculada de la conversación.");
  await refreshState();
}

document.getElementById("captureToggle").addEventListener("change", onToggleCapture);
document.getElementById("linkCode").addEventListener("click", onLinkCode);
document.getElementById("clearPairing").addEventListener("click", onClearPairing);

refreshState().catch((error) => {
  setMessage(String(error), true);
});
