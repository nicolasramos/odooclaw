/**
 * runonweb_bridge.js — Single point of contact with the runonweb npm package.
 *
 * This module wraps the raw runonweb exports into a stable API that survives
 * runonweb API changes (e.g. v0.0.2). If runonweb's interface changes, only
 * this file needs updating.
 *
 * FROZEN DEPENDENCY: runonweb@0.0.1 — pin to exact version in package.json.
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
  // Import the core subpath of runonweb (device detection, caching, progress)
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

  /** Returns 'webgpu' | 'wasm' | null */
  async detect() {
    if (this.#available !== null) return this.#available;
    try {
      const rw = await _importCore();
      const isGpu = await rw.isWebGPUAvailable();
      this.#available = isGpu ? "webgpu" : "wasm";
    } catch {
      this.#available = "wasm";
    }
    return this.#available;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Model cache layer — IndexedDB persistence
// ──────────────────────────────────────────────────────────────────────────
const CACHE_DB_NAME = "runonweb_models";
const CACHE_STORE = "models";

class ModelCache {
  #db = null;

  async _openDB() {
    if (this.#db) return this.#db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: "modelId" });
        }
      };
      request.onsuccess = () => {
        this.#db = request.result;
        resolve(this.#db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** Check if a model is cached by model ID */
  async isCached(modelId) {
    const db = await this._openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(modelId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  }

  /** Store model metadata in IndexedDB */
  async storeMetadata(modelId, metadata) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.put({ modelId, metadata, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Get cached metadata for a model */
  async getMetadata(modelId) {
    const db = await this._openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(modelId);
      req.onsuccess = () => resolve(req.result?.metadata || null);
      req.onerror = () => resolve(null);
    });
  }

  /** Clear all cached model metadata */
  async clearAll() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Get total cache size in bytes (approximate) */
  async estimateSize() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        return est.quota || 0;
      }
    } catch {
      // storage estimation not available
    }
    return 0;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Progress tracker — bridges runonweb progress to Odoo UI
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
    const info = { status, progress, file };
    for (const cb of this.#callbacks) {
      cb(info);
    }
  }

  setTotalBytes(bytes) {
    this.#totalBytes = bytes;
  }

  setLoadedBytes(bytes) {
    this.#loadedBytes = bytes;
  }

  getProgressPercent() {
    if (this.#totalBytes === 0) return 0;
    return Math.min(100, (this.#loadedBytes / this.#totalBytes) * 100);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. STT Bridge — wraps runonweb STT with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class SttBridge {
  #transcriber = null;
  #loading = null;
  #deviceDetector = new DeviceDetector();
  #cache = new ModelCache();
  #progress = new ProgressTracker();
  #modelName = "onnx-community/whisper-tiny.en";

  constructor(options = {}) {
    this.#modelName = options.model || this.#modelName;
  }

  async load() {
    if (this.#transcriber) return this.#transcriber;
    if (this.#loading) return this.#loading;

    this.#loading = (async () => {
      const rw = await _importStt();
      const device = await this.#deviceDetector.detect();

      // Check cache first
      const cached = await this.#cache.isCached(this.#modelName);
      if (!cached) {
        this.#progress.notify("downloading", undefined, this.#modelName);
      }

      const transcriber = new rw.SpeechTranscriber({
        model: this.#modelName,
        device,
        onProgress: (info) => {
          this.#progress.notify(info.status, info.progress, info.file);
        },
      });

      await transcriber.load();
      this.#transcriber = transcriber;
      await this.#cache.storeMetadata(this.#modelName, { device });

      this.#progress.notify("ready");
    })();

    return this.#loading;
  }

  async transcribe(audioBlob, language) {
    await this.load();
    return this.#transcriber.transcribe(audioBlob, { language });
  }

  startTranscribing(stream, language) {
    return this.load().then(() => {
      return this.#transcriber.startTranscribing(stream, { language });
    });
  }

  stopTranscribing() {
    if (this.#transcriber) {
      return this.#transcriber.stopTranscribing();
    }
    return Promise.resolve({ text: "", chunks: [] });
  }

  get progress() {
    return this.#progress;
  }

  get device() {
    return this.#deviceDetector;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 6. OCR Bridge — wraps runonweb OCR with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class OcrBridge {
  #service = null;
  #loading = null;
  #deviceDetector = new DeviceDetector();
  #cache = new ModelCache();
  #progress = new ProgressTracker();
  #modelName = "tiny";

  constructor(options = {}) {
    this.#modelName = options.model || this.#modelName;
  }

  async load() {
    if (this.#service) return this.#service;
    if (this.#loading) return this.#loading;

    this.#loading = (async () => {
      const rw = await _importOcr();
      const device = await this.#deviceDetector.detect();

      const cached = await this.#cache.isCached(this.#modelName);
      if (!cached) {
        this.#progress.notify("downloading", undefined, this.#modelName);
      }

      const service = new rw.OcrService({
        model: this.#modelName,
        device,
        onProgress: (info) => {
          this.#progress.notify(info.status, info.progress, info.file);
        },
      });

      await service.load();
      this.#service = service;
      await this.#cache.storeMetadata(this.#modelName, { device });

      this.#progress.notify("ready");
    })();

    return this.#loading;
  }

  async extract(image) {
    await this.load();
    return this.#service.extract(image);
  }

  get progress() {
    return this.#progress;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Embed Bridge — wraps runonweb embed with on-demand loading
// ──────────────────────────────────────────────────────────────────────────
export class EmbedBridge {
  #embedder = null;
  #loading = null;
  #deviceDetector = new DeviceDetector();
  #cache = new ModelCache();
  #progress = new ProgressTracker();
  #modelName = "Xenova/all-MiniLM-L6-v2";

  constructor(options = {}) {
    this.#modelName = options.model || this.#modelName;
  }

  async load() {
    if (this.#embedder) return this.#embedder;
    if (this.#loading) return this.#loading;

    this.#loading = (async () => {
      const rw = await _importEmbed();
      const device = await this.#deviceDetector.detect();

      const cached = await this.#cache.isCached(this.#modelName);
      if (!cached) {
        this.#progress.notify("downloading", undefined, this.#modelName);
      }

      const embedder = new rw.TextEmbedder({
        model: this.#modelName,
        device,
        onProgress: (info) => {
          this.#progress.notify(info.status, info.progress, info.file);
        },
      });

      await embedder.load();
      this.#embedder = embedder;
      await this.#cache.storeMetadata(this.#modelName, { device });

      this.#progress.notify("ready");
    })();

    return this.#loading;
  }

  async embed(text) {
    await this.load();
    return this.#embedder.embed(text);
  }

  get progress() {
    return this.#progress;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. Feature flag resolver — per-field, per-user
// ──────────────────────────────────────────────────────────────────────────
export class FeatureFlagResolver {
  #flags = [];

  setFlags(flags) {
    this.#flags = flags;
  }

  /** Check if a feature is enabled for a given field and user */
  isEnabled(featureType, fieldName, userId) {
    const activeFlags = this.#flags.filter(
      (f) => f.feature_type === featureType && f.active
    );

    if (activeFlags.length === 0) return false;

    // Check if there's a specific flag for this field
    const fieldFlags = activeFlags.filter((f) => f.field_id === fieldName);
    if (fieldFlags.length > 0) {
      // Check user restriction
      if (fieldFlags[0].user_ids.length === 0) return true;
      return fieldFlags[0].user_ids.includes(userId);
    }

    // Check module-level flags (no field restriction)
    const moduleFlags = activeFlags.filter((f) => !f.field_id);
    if (moduleFlags.length > 0) {
      if (moduleFlags[0].user_ids.length === 0) return true;
      return moduleFlags[0].user_ids.includes(userId);
    }

    return false;
  }

  /** Get all enabled features for a user */
  getEnabledFeatures(userId) {
    return this.#flags
      .filter((f) => f.active && (f.user_ids.length === 0 || f.user_ids.includes(userId)))
      .map((f) => f.feature_type);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 9. Main bridge — orchestrates all bridges
// ──────────────────────────────────────────────────────────────────────────
export class RunonwebBridge {
  #stt = null;
  #ocr = null;
  #embed = null;
  #deviceDetector = new DeviceDetector();
  #cache = new ModelCache();
  #featureResolver = new FeatureFlagResolver();
  #settings = {};

  constructor(settings = {}) {
    this.#settings = settings;
  }

  get version() {
    return RUNONWEB_VERSION;
  }

  async getDevice() {
    return this.#deviceDetector.detect();
  }

  getStt(options) {
    if (!this.#stt) {
      this.#stt = new SttBridge(options);
    }
    return this.#stt;
  }

  getOcr(options) {
    if (!this.#ocr) {
      this.#ocr = new OcrBridge(options);
    }
    return this.#ocr;
  }

  getEmbed(options) {
    if (!this.#embed) {
      this.#embed = new EmbedBridge(options);
    }
    return this.#embed;
  }

  setFeatureFlags(flags) {
    this.#featureResolver.setFlags(flags);
  }

  isFeatureEnabled(featureType, fieldName, userId) {
    return this.#featureResolver.isEnabled(featureType, fieldName, userId);
  }

  getEnabledFeatures(userId) {
    return this.#featureResolver.getEnabledFeatures(userId);
  }

  async getCachedModels() {
    // Returns list of cached model IDs
    const db = await this.#cache._openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve((req.result || []).map((item) => item.modelId));
      };
      req.onerror = () => resolve([]);
    });
  }

  async clearCache() {
    await this.#cache.clearAll();
    // Also clear runonweb's internal cache
    try {
      const rw = await _importCore();
      if (rw.clearAllModelCache) {
        await rw.clearAllModelCache();
      }
    } catch {
      // runonweb cache API may not exist
    }
  }

  async getCacheSize() {
    return this.#cache.estimateSize();
  }

  get featureResolver() {
    return this.#featureResolver;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 10. Odoo integration helper — injects into webclient
// ──────────────────────────────────────────────────────────────────────────
export function injectRunonwebBridge(odoo) {
  if (!odoo || !odoo.__session_info__) {
    console.warn("[runonweb] Odoo session info not available");
    return;
  }

  const userId = odoo.__session_info__.user_id;
  const bridge = new RunonwebBridge({
    runonwebVersion: RUNONWEB_VERSION,
    defaultDevice: "auto",
  });

  // Expose on global for Odoo JS modules to access
  window.runonwebBridge = bridge;

  console.log(`[runonweb] Bridge v${RUNONWEB_VERSION} initialized for user ${userId}`);

  return bridge;
}

// ──────────────────────────────────────────────────────────────────────────
// All classes and utilities are individually exported above.
// ──────────────────────────────────────────────────────────────────────────
