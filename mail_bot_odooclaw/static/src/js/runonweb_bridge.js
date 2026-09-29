/**
 * runonweb_bridge.js — Single point of contact with the runonweb npm package.
 *
 * This module wraps the raw runonweb exports into a stable API that survives
 * runonweb API changes (e.g. v0.0.2). If runonweb's interface changes, only
 * this file needs updating.
 *
 * FROZEN DEPENDENCY: runonweb@0.0.1 — pinned to exact version in package.json.
 *
 * Verified against the real runonweb@0.0.1 API:
 *   runonweb/core  -> isWebGPUAvailable, resolveDevice, listCachedModels,
 *                    clearModelCache, clearAllModelCache, storageEstimate, formatBytes
 *   runonweb/stt   -> class SpeechToText { load(), transcribe(audio, opts) }
 *   runonweb/ocr   -> class OCR { load(), read(image), dispose() }
 *   runonweb/embed -> class TextEmbedder { load(), embed(text), dispose() },
 *                     cosineSimilarity(a, b)
 *
 * Nothing is downloaded at page load: models are fetched only when a feature
 * bridge is explicitly loaded by user action, and are persisted by
 * runonweb's own Cache Storage layer (transformers-cache) across sessions.
 */

// ──────────────────────────────────────────────────────────────────────────
// 0. Version pin (mirrors package.json dependency)
// ──────────────────────────────────────────────────────────────────────────
const RUNONWEB_VERSION = "0.0.1";
export { RUNONWEB_VERSION };

// ──────────────────────────────────────────────────────────────────────────
// 1. Dynamic import — only loaded when a feature is actually needed
// ──────────────────────────────────────────────────────────────────────────
async function _importCore() {
  return import("runonweb/core");
}

async function _importStt() {
  return import("runonweb/stt");
}

async function _importOcr() {
  return import("runonweb/ocr");
}

async function _importEmbed() {
  return import("runonweb/embed");
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Device detection layer — mirrors runonweb/core API
// ──────────────────────────────────────────────────────────────────────────
export class DeviceDetector {
  #available = null;

  /** Returns 'webgpu' | 'wasm' */
  async detect() {
    if (this.#available !== null) return this.#available;
    try {
      const rw = await _importCore();
      const isGpu = await rw.isWebGPUAvailable();
      this.#available = isGpu ? "webgpu" : "wasm";
    } catch (err) {
      // Never swallow silently: a hidden failure here masked the externals bug.
      console.warn("[runonweb] WebGPU probe failed, falling back to wasm:", err);
      this.#available = "wasm";
    }
    return this.#available;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Progress tracker — bridges runonweb progress to the UI callback
// ──────────────────────────────────────────────────────────────────────────
export class ProgressTracker {
  #callbacks = [];
  #totalBytes = 0;
  #loadedBytes = 0;

  onProgress(cb) {
    this.#callbacks.push(cb);
    return () => {
      this.#callbacks = this.#callbacks.filter((c) => c !== cb);
    };
  }

  notify(status, progress, file) {
    for (const cb of this.#callbacks) {
      try {
        cb({ status, progress, file });
      } catch (err) {
        console.warn("[runonweb] progress callback error:", err);
      }
    }
  }

  addBytes(bytes) {
    this.#loadedBytes += bytes || 0;
  }

  setTotalBytes(bytes) {
    this.#totalBytes = bytes;
  }

  setLoadedBytes(bytes) {
    this.#loadedBytes = bytes;
  }

  get loadedBytes() {
    return this.#loadedBytes;
  }

  getProgressPercent() {
    if (this.#totalBytes === 0) return 0;
    return Math.min(100, (this.#loadedBytes / this.#totalBytes) * 100);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Base feature bridge — on-demand load + metrics, shared by STT/OCR/embed
// ──────────────────────────────────────────────────────────────────────────
class BaseBridge {
  static featureType = "base";

  #deviceDetector = new DeviceDetector();
  #progress = new ProgressTracker();
  #loading = null;
  #service = null;
  #metrics = {
    feature: this.constructor.featureType,
    device: null,
    downloadBytes: 0,
    downloadMs: 0,
    inferenceMs: 0,
    cachedAtStart: false,
  };

  get progress() {
    return this.#progress;
  }

  get metrics() {
    return { ...this.#metrics };
  }

  get service() {
    return this.#service;
  }

  get detector() {
    return this.#deviceDetector;
  }

  /**
   * Ensure the model is loaded. Triggers the (single) download on first call.
   * Subsequent calls reuse the loaded service; across page loads the weights
   * come from runonweb's Cache Storage without a new network download.
   */
  async load() {
    if (this.#service) return this.#service;
    if (this.#loading) return this.#loading;

    this.#loading = (async () => {
      const device = await this.#deviceDetector.detect();
      this.#metrics.device = device;

      // Was the model already on disk before we started? (persisted from a
      // previous session => no download this time)
      this.#metrics.cachedAtStart = await this.#isModelCached();

      const t0 = performance.now();
      const service = await this._createService(device);
      await service.load();
      this.#metrics.downloadMs = Math.round(performance.now() - t0);
      this.#service = service;
      // Measure how many bytes the model occupies in the browser cache.
      try {
        const rw = await _importCore();
        const cached = await rw.listCachedModels();
        const mine = cached.find((m) => m.id && m.id.includes(this._modelHint()));
        this.#metrics.downloadBytes = mine ? mine.bytes : 0;
      } catch {
        /* metrics are best-effort */
      }
      this.#progress.notify("ready");
      return service;
    })();

    return this.#loading;
  }

  /** Run one inference with timing recorded in metrics. */
  async _timedInference(fn) {
    const t0 = performance.now();
    const res = await fn();
    this.#metrics.inferenceMs = Math.round(performance.now() - t0);
    return res;
  }

  async #isModelCached() {
    try {
      const rw = await _importCore();
      const cached = await rw.listCachedModels();
      return cached.some((m) => m.id && m.id.includes(this._modelHint()));
    } catch (err) {
      console.warn("[runonweb] cache probe failed:", err);
      return false;
    }
  }

  /** Subclasses return a substring that identifies their model in the cache. */
  _modelHint() {
    return this.constructor.featureType;
  }

  /** Subclasses implement: build the runonweb service for the resolved device. */
  async _createService(/* device */) {
    throw new Error("not implemented");
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. STT Bridge — wraps runonweb SpeechToText with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class SttBridge extends BaseBridge {
  static featureType = "stt";
  #model;
  #language;

  constructor(options = {}) {
    super();
    this.#model = options.model || "onnx-community/whisper-tiny.en";
    this.#language = options.language;
  }

  _modelHint() {
    return this.#model;
  }

  async _createService(device) {
    const rw = await _importStt();
    return new rw.SpeechToText({
      model: this.#model,
      device,
      language: this.#language,
      onProgress: (info) => this.progress.notify(info.status, info.progress, info.file),
    });
  }

  /** Transcribe an audio Blob/File/Float32Array. Loads the model on demand.
   *
   * runonweb@0.0.1 always sends task:'transcribe', which English-only Whisper
   * checkpoints (any model ending in .en) reject with
   * "Cannot specify `task` or `language` for an English-only model".
   * For those models we drive the pipeline directly through runonweb/core's
   * loader instead of SpeechToText.transcribe. This is exactly the kind of
   * upstream quirk this bridge exists to absorb.
   */
  async transcribe(audio, options = {}) {
    if (/\.en(\b|$)/.test(this.#model)) {
      await this._loadRawPipeline();
      const input = await this._prepareAudio(audio);
      return this._timedInference(async () => {
        const out = await this._rawPipe(input, {
          chunk_length_s: 30,
          stride_length_s: 5,
          force_full_sequences: false,
        });
        return { text: out?.text ?? "", chunks: out?.chunks ?? [] };
      });
    }
    await this.load();
    const opts = { ...options };
    if (this.#language && !opts.language) opts.language = this.#language;
    return this._timedInference(() => this.service.transcribe(audio, opts));
  }

  async _loadRawPipeline() {
    if (this._rawPipe) return this._rawPipe;
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    const device = await this.detector.detect();
    const pipe = await pipeline("automatic-speech-recognition", this.#model, {
      device,
      dtype: device === "webgpu" ? "fp32" : "q8",
      progress_callback: (data) => {
        this.progress.notify(
          typeof data.status === "string" ? data.status : "progress",
          typeof data.progress === "number" ? data.progress : undefined,
          typeof data.file === "string" ? data.file : undefined
        );
      },
    });
    this._rawPipe = pipe;
    return pipe;
  }

  async _prepareAudio(audio) {
    if (audio instanceof Float32Array) return audio;
    const arrayBuffer = audio instanceof Blob ? await audio.arrayBuffer() : audio;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtor({ sampleRate: 16000 });
    try {
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      return decoded.getChannelData(0).slice(0);
    } finally {
      audioCtx.close();
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 6. OCR Bridge — wraps runonweb OCR with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class OcrBridge extends BaseBridge {
  static featureType = "ocr";
  #size;

  constructor(options = {}) {
    super();
    this.#size = options.size || "small";
  }

  _modelHint() {
    // Cache ids look like "PaddlePaddle/PP-OCRv6_tiny_det_onnx".
    return "PP-OCR";
  }

  async _createService(device) {
    const rw = await _importOcr();
    return new rw.OCR({
      size: this.#size,
      device,
      onProgress: (info) => this.progress.notify(info.status, info.progress, info.file),
    });
  }

  /** Read text from an image (Blob/File/dataURL/HTMLImageElement). */
  async read(image) {
    await this.load();
    return this._timedInference(() => this.service.read(image));
  }

  dispose() {
    this.#serviceSafeDispose();
  }

  #serviceSafeDispose() {
    const svc = this.service;
    if (svc && typeof svc.dispose === "function") svc.dispose();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Embed Bridge — wraps runonweb TextEmbedder with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class EmbedBridge extends BaseBridge {
  static featureType = "embed";
  #model;

  constructor(options = {}) {
    super();
    this.#model = options.model || "Xenova/all-MiniLM-L6-v2";
  }

  _modelHint() {
    return this.#model;
  }

  async _createService(device) {
    const rw = await _importEmbed();
    return new rw.TextEmbedder({
      model: this.#model,
      device,
      onProgress: (info) => this.progress.notify(info.status, info.progress, info.file),
    });
  }

  /** Embed one string or an array of strings. */
  async embed(text) {
    await this.load();
    return this._timedInference(() => this.service.embed(text));
  }

  async cosineSimilarity(a, b) {
    const rw = await _importEmbed();
    return rw.cosineSimilarity(a, b);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. Feature flag resolver — per-field / per-user activation
//
// Flags arrive from the backend as rows of runonweb.feature.flag with:
//   { feature_type, active, field: [id, "Model.name (technical)"] | false,
//     user_ids: [ids] }
// fieldName is matched as "model.name" (e.g. "mail.message.body") or bare
// "name". field_id is NEVER compared to a field name.
// ──────────────────────────────────────────────────────────────────────────
export class FeatureFlagResolver {
  #flags = [];

  setFlags(flags) {
    this.#flags = flags || [];
  }

  get flags() {
    return this.#flags;
  }

  #fieldMatches(flag, fieldName) {
    // flag.field_ref is the computed "model.name" (e.g. "mail.message.body").
    const technical = flag.field_ref || "";
    if (!technical) return false;
    return technical === fieldName || technical.split(".").pop() === fieldName;
  }

  #userAllowed(flag, userId) {
    const ids = flag.user_ids || [];
    return ids.length === 0 || ids.includes(userId);
  }

  /** Check if a feature is enabled for a given field ("model.name") and user. */
  isEnabled(featureType, fieldName, userId) {
    const activeFlags = this.#flags.filter(
      (f) => f.feature_type === featureType && f.active
    );
    if (activeFlags.length === 0) return false;

    // A flag that names this exact field wins.
    const fieldFlags = activeFlags.filter((f) => this.#fieldMatches(f, fieldName));
    if (fieldFlags.length > 0) {
      return fieldFlags.some((f) => this.#userAllowed(f, userId));
    }

    // Otherwise fall back to module-level flags (no field restriction).
    const moduleFlags = activeFlags.filter((f) => !f.field_ref);
    return moduleFlags.some((f) => this.#userAllowed(f, userId));
  }

  /** Get all enabled feature types for a user (module-level or any field). */
  getEnabledFeatures(userId) {
    const set = new Set();
    for (const f of this.#flags) {
      if (f.active && this.#userAllowed(f, userId)) set.add(f.feature_type);
    }
    return [...set];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 9. Minimal progress UI — DOM overlay, no Odoo component dependency
// ──────────────────────────────────────────────────────────────────────────
export class ProgressUI {
  #el = null;

  attach(progressTracker, label) {
    this.detach();
    this.#el = document.createElement("div");
    this.#el.id = "runonweb-progress";
    this.#el.style.cssText =
      "position:fixed;bottom:12px;right:12px;z-index:9999;background:#1a1a2e;color:#fff;" +
      "padding:8px 12px;border-radius:8px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);" +
      "max-width:320px;display:none;";
    document.body.appendChild(this.#el);

    progressTracker.onProgress((info) => {
      if (!this.#el) return;
      if (info.status === "ready" || info.status === "done") {
        this.#el.style.display = "none";
        return;
      }
      this.#el.style.display = "block";
      const pct =
        typeof info.progress === "number" ? ` ${Math.round(info.progress)}%` : "";
      const file = info.file ? ` — ${info.file}` : "";
      this.#el.textContent = `${label || "runonweb"}: ${info.status}${pct}${file}`;
    });
  }

  detach() {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 10. Main bridge — orchestrates all bridges
// ──────────────────────────────────────────────────────────────────────────
export class RunonwebBridge {
  #stt = null;
  #ocr = null;
  #embed = null;
  #deviceDetector = new DeviceDetector();
  #featureResolver = new FeatureFlagResolver();
  #settings = {};
  #ui = new ProgressUI();

  constructor(settings = {}) {
    this.#settings = settings;
  }

  get version() {
    return RUNONWEB_VERSION;
  }

  get settings() {
    return this.#settings;
  }

  async getDevice() {
    return this.#deviceDetector.detect();
  }

  getStt(options) {
    if (!this.#stt) this.#stt = new SttBridge(options);
    return this.#stt;
  }

  getOcr(options) {
    if (!this.#ocr) this.#ocr = new OcrBridge(options);
    return this.#ocr;
  }

  getEmbed(options) {
    if (!this.#embed) this.#embed = new EmbedBridge(options);
    return this.#embed;
  }

  setFeatureFlags(flags) {
    this.#featureResolver.setFlags(flags);
  }

  isFeatureEnabled(featureType, fieldName, userId) {
    // Global kill-switch from runonweb.settings must be on for the feature type.
    const globalOn = {
      stt: "enable_stt",
      ocr: "enable_ocr",
      embed: "enable_embed",
    }[featureType];
    // Fail closed: the global toggle must be explicitly enabled.
    if (globalOn && !(this.#settings && this.#settings[globalOn] === true)) {
      return false;
    }
    return this.#featureResolver.isEnabled(featureType, fieldName, userId);
  }

  getEnabledFeatures(userId) {
    return this.#featureResolver.getEnabledFeatures(userId);
  }

  /** Models currently stored in the browser cache (id, bytes, files). */
  async getCachedModels() {
    try {
      const rw = await _importCore();
      return await rw.listCachedModels();
    } catch (err) {
      console.warn("[runonweb] listCachedModels failed:", err);
      return [];
    }
  }

  /** Delete one cached model (UI "borrar modelo"). */
  async deleteCachedModel(modelId) {
    const rw = await _importCore();
    return rw.clearModelCache(modelId);
  }

  /** Delete every cached model. */
  async clearCache() {
    const rw = await _importCore();
    return rw.clearAllModelCache();
  }

  /** Browser storage usage for the cache. */
  async storageEstimate() {
    try {
      const rw = await _importCore();
      return await rw.storageEstimate();
    } catch {
      return null;
    }
  }

  /** Metrics collected by each feature bridge (for the PR report). */
  collectMetrics() {
    return {
      stt: this.#stt ? this.#stt.metrics : null,
      ocr: this.#ocr ? this.#ocr.metrics : null,
      embed: this.#embed ? this.#embed.metrics : null,
    };
  }

  /** Attach the download-progress overlay to a feature's tracker. */
  showProgress(featureType) {
    const bridge =
      featureType === "stt"
        ? this.getStt()
        : featureType === "ocr"
        ? this.getOcr()
        : this.getEmbed();
    this.#ui.attach(bridge.progress, featureType.toUpperCase());
    bridge.progress.onProgress((info) => {
      if (info.status === "ready" || info.status === "done") this.#ui.detach();
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 11. Session + RPC over the HTTP APIs supported by Odoo 17 and 18.
//     window.odoo.__session_info__ and odoo.rpc do NOT exist in the webclient;
//     use /web/session/get_session_info and /web/dataset/call_kw instead.
// ──────────────────────────────────────────────────────────────────────────
let _sessionInfo = null;
let _csrfToken = null;

export async function _getSessionInfo(force = false) {
  if (_sessionInfo && !force) return _sessionInfo;
  try {
    const resp = await fetch("/web/session/get_session_info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: Date.now(), params: {} }),
    });
    const data = await resp.json();
    _sessionInfo = data.result || null;
    if (_sessionInfo && _sessionInfo.csrf_token) _csrfToken = _sessionInfo.csrf_token;
    return _sessionInfo;
  } catch (err) {
    console.warn("[runonweb] session fetch failed:", err);
    return null;
  }
}

export async function _getCsrfToken() {
  if (_csrfToken) return _csrfToken;
  const session = await _getSessionInfo();
  return (session && session.csrf_token) || null;
}

export async function _callKw(model, method, args, kwargs) {
  const csrf = await _getCsrfToken();
  const resp = await fetch("/web/dataset/call_kw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf || "",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: { model, method, args: args || [], kwargs: kwargs || {} },
    }),
  });
  const data = await resp.json();
  if (data.error) {
    throw new Error(
      (data.error.data && data.error.data.message) || JSON.stringify(data.error)
    );
  }
  return data.result;
}

async function _rpcSettings() {
  try {
    return await _callKw("runonweb.settings", "get_default_settings", [], {});
  } catch (e) {
    console.warn("[runonweb] Failed to fetch settings:", e);
    return {};
  }
}

async function _rpcFeatureFlags() {
  try {
    return await _callKw(
      "runonweb.feature.flag",
      "search_read",
      [[["active", "=", true]]],
      {
        fields: ["active", "feature_type", "field_id", "field_ref", "user_ids"],
        limit: 1000,
      }
    );
  } catch (e) {
    console.warn("[runonweb] Failed to fetch feature flags:", e);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 12. Odoo integration — boots the bridge inside the webclient.
//     Called automatically at bundle load (see bottom of file). Never
//     downloads any model here: only settings and flags are fetched.
// ──────────────────────────────────────────────────────────────────────────
export async function injectRunonwebBridge() {
  const sessionInfo = await _getSessionInfo();
  // Odoo 18 exposes `uid`; Odoo 17 exposes `user_id`.
  const userId = sessionInfo && (sessionInfo.uid ?? sessionInfo.user_id);
  if (!userId) {
    // Public frontend / logged out: nothing to enable.
    return null;
  }

  const [settings, flags] = await Promise.all([_rpcSettings(), _rpcFeatureFlags()]);
  const bridge = new RunonwebBridge({
    userId,
    ...settings,
    defaultDevice: settings.default_device || "auto",
  });
  bridge.setFeatureFlags(flags);

  window.runonwebBridge = bridge;
  return bridge;
}

// Expose the bundle on the real global. NOTE (measured in 17/18): with
// esbuild's --global-name the IIFE result (the ESM namespace, whose exports
// keep their underscore prefix: _callKw, _getCsrfToken, ...) is what ends up
// as window.runonwebBundle; this literal is overwritten by it. Feature
// modules must import helpers from the bridge module directly (see
// ocr_invoice.js), NOT through this global.
if (typeof window !== "undefined") {
  window.runonwebBundle = {
    RUNONWEB_VERSION,
    DeviceDetector,
    ProgressTracker,
    SttBridge,
    OcrBridge,
    EmbedBridge,
    FeatureFlagResolver,
    ProgressUI,
    RunonwebBridge,
    injectRunonwebBridge,
  };
}

// Feature modules bundled alongside the bridge. Their boot code is guarded
// (window.odoo check + feature gating) and never blocks the page.
import "./ocr_invoice.js";

// Auto-boot when loaded inside an Odoo page (window.odoo exists).
// The boot is async and its failure must never break the page.
if (typeof window !== "undefined" && typeof window.odoo === "object") {
  injectRunonwebBridge().catch((err) =>
    console.warn("[runonweb] bridge boot failed:", err)
  );
}
