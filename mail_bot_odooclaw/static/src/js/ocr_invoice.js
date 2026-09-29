/**
 * ocr_invoice.js — runonweb OCR as a client-side pre-step for invoices.
 *
 * When the user attaches or pastes an invoice IMAGE in the Odoo webclient
 * (Discuss composer or chatter), the image is OCR'd locally with
 * runonweb/ocr (PP-OCRv6, onnxruntime-web) BEFORE the upload leaves the
 * machine. The extracted text is stored on the ir.attachment through
 * `store_client_ocr`, so the odooclaw ocr-invoice skill can skip its
 * vision layer entirely — the image never has to reach a third-party
 * vision model.
 *
 * PDF DECISION (required by the spec):
 *   This iteration handles IMAGES only. runonweb/ocr reads raster inputs
 *   (Blob/File/dataURL/Image/Canvas). Rasterizing a PDF in the browser
 *   would mean shipping pdf.js (~1 MB extra asset) and rendering pages to
 *   canvases before OCR. That is not worth it here because:
 *     1. The server pipeline already reads the PDF's NATIVE text layer
 *        first (exact, deterministic, zero cost) and only falls back to
 *        vision for image-only PDFs.
 *     2. A client rasterization would throw away that native text layer —
 *        strictly worse than what the server does today for digital PDFs.
 *   So: images -> local OCR (this module); PDFs -> unchanged server flow.
 *   A future iteration can rasterize PDFs client-side for the scanned-PDF
 *   case only, reusing the same store_client_ocr contract.
 *
 * Degradation: if the OCR model cannot load (no WebGPU/WASM, offline,
 * download refused) or the feature is disabled, the upload proceeds
 * untouched — the existing server flow is the default and never breaks.
 *
 * Hook strategy (works on Odoo 17 and 18 without patching OWL classes):
 *   Odoo's file_upload_service uses XMLHttpRequest against
 *   /mail/attachment/upload (verified in both versions). We wrap
 *   XMLHttpRequest.open/send once: when a POST to that endpoint carries an
 *   image file, we OCR it locally and — before the request is sent —
 *   upload is paused only for the OCR step, then the text is written to
 *   the attachment via JSON-RPC once the server responds with its id.
 *   The upload itself is NOT delayed: OCR runs in parallel and the text is
 *   attached right after the server confirms the attachment id.
 */

const UPLOAD_PATH = "/mail/attachment/upload";
const IMAGE_MIME_RE = /^image\/(png|jpe?g|webp|bmp|gif|tiff?)$/i;
// Only OCR reasonably-sized images; huge scans would stall the UI.
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

// The RPC helper lives in the bridge module; importing it keeps the 17/18
// session/CSRF logic in one place and avoids the fragile window-global
// indirection (esbuild's namespace object can shadow window.runonwebBundle).
import { _callKw } from "./runonweb_bridge.js";

function _log(...args) {
  console.log("[runonweb-ocr]", ...args);
}

function _bridge() {
  return (typeof window !== "undefined" && window.runonwebBridge) || null;
}

/** Feature gating: settings kill-switch + feature flags, both fail-closed. */
function ocrFeatureEnabled() {
  const bridge = _bridge();
  if (!bridge) return false;
  const session = bridge.settings || {};
  if (session.enable_ocr !== true) return false;
  // Module-level flag (no field) must allow "ocr" for this user.
  try {
    return bridge.isFeatureEnabled("ocr", undefined, bridge.settings.userId);
  } catch (e) {
    return false;
  }
}

/**
 * OCR a File/Blob in the browser using the runonweb OCR bridge.
 * Returns {text, confidence} or null on any failure (never throws).
 */
async function ocrImageFile(file) {
  const bridge = _bridge();
  if (!bridge) return null;
  try {
    const ocr = bridge.getOcr({ size: "small" });
    const result = await ocr.read(file);
    if (!result || typeof result.text !== "string") return null;
    const text = result.text.trim();
    if (!text) return null;
    return {
      text,
      confidence: typeof result.confidence === "number" ? result.confidence : 0,
    };
  } catch (err) {
    console.warn("[runonweb-ocr] local OCR failed, server flow will handle it:", err);
    return null;
  }
}

/**
 * Store client-extracted OCR text on an attachment via JSON-RPC.
 * attachmentId may be a number or numeric string.
 */
async function storeClientOcr(attachmentId, text, confidence) {
  try {
    await _callKw(
      "ir.attachment",
      "store_client_ocr",
      [Number(attachmentId), text, confidence || 0],
      {}
    );
    _log("client OCR stored on attachment", attachmentId);
    return true;
  } catch (err) {
    console.warn("[runonweb-ocr] could not store client OCR text:", err);
    return false;
  }
}

/**
 * Extract the real attachment id from the upload response body.
 *  - Odoo 17: JSON object with "id" at top level.
 *  - Odoo 18: {data: {...}} Store payload; the attachment record carries "id".
 * Returns a number or null.
 */
function extractAttachmentId(responseText) {
  if (!responseText) return null;
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (e) {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.id === "number") return payload.id;
  if (payload.data && typeof payload.data === "object") {
    // Store.get_result(): {ir.attachment: {id: ...}} or {ir.attachment: [{id: ...}]}
    const att = payload.data["ir.attachment"];
    if (att && typeof att === "object") {
      if (typeof att.id === "number") return att.id;
      if (Array.isArray(att) && att.length && typeof att[0].id === "number") {
        return att[0].id;
      }
    }
  }
  return null;
}

/**
 * Install the XHR interception once. Safe to call multiple times.
 * Only touches POSTs to /mail/attachment/upload carrying an image file.
 */
let _installed = false;
export function installInvoiceOcrHook() {
  if (_installed || typeof window === "undefined" || !window.XMLHttpRequest) {
    return false;
  }
  _installed = true;

  const XhrProto = window.XMLHttpRequest.prototype;
  const origOpen = XhrProto.open;
  const origSend = XhrProto.send;

  XhrProto.open = function (method, url, ...rest) {
    this.__runonwebUpload =
      String(method).toUpperCase() === "POST" &&
      typeof url === "string" &&
      url.indexOf(UPLOAD_PATH) !== -1;
    return origOpen.call(this, method, url, ...rest);
  };

  XhrProto.send = function (body) {
    if (!this.__runonwebUpload || !(body instanceof FormData)) {
      return origSend.call(this, body);
    }
    const file = body.get("ufile");
    const isImage =
      file &&
      typeof file.type === "string" &&
      IMAGE_MIME_RE.test(file.type) &&
      file.size <= MAX_IMAGE_BYTES;
    if (!isImage || !ocrFeatureEnabled()) {
      return origSend.call(this, body);
    }

    // Kick off local OCR in parallel with the upload. When the server
    // answers with the attachment id, write the OCR text onto it.
    const xhr = this;
    const ocrPromise = ocrImageFile(file);

    xhr.addEventListener("load", function () {
      if (xhr.status < 200 || xhr.status >= 300) return;
      const attId = extractAttachmentId(xhr.responseText);
      if (!attId) return;
      ocrPromise.then((ocrRes) => {
        if (!ocrRes) return;
        storeClientOcr(attId, ocrRes.text, ocrRes.confidence);
      });
    });

    return origSend.call(this, body);
  };

  _log("invoice OCR hook installed");
  return true;
}

/**
 * Direct entry point for tests and manual use: OCR a pasted image file and
 * return the extracted text (no upload involved).
 */
export async function ocrPastedImage(file) {
  if (!file || !IMAGE_MIME_RE.test(file.type || "")) return null;
  return ocrImageFile(file);
}

// Boot: the hook itself needs no bridge (feature gating happens per-upload
// against window.runonwebBridge, which may arrive later or never — a
// missing bridge simply means the feature is off). Install once, never
// blocks the page.
if (typeof window !== "undefined" && typeof window.odoo === "object") {
  installInvoiceOcrHook();
}
