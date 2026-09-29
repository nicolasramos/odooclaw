/** @file embed_semantic_search.js
 *  Client-side semantic search — sits on top of Stage 1's EmbedBridge.
 *
 *  API:
 *    const bridge = window.runonwebBridge;
 *    const embed = bridge.getEmbed();   // EmbedBridge instance
 *    await embed.load();               // lazy download
 *    const vec = await embed.embed("text");
 *    const similar = await engine.search("query");
 *
 *  Design decisions
 *  ────────────────
 *  • Model download is **lazy**: 0 requests on page load; the model is
 *    fetched the first time the user explicitly enables semantic search.
 *  • Embeddings are stored in **IndexedDB** with a cosine brute-force index
 *    — no server round-trip, zero server-side infrastructure.
 *  • Semantic results are **mixed** with lexical results at the UI layer;
 *    the lexical pipeline is untouched and remains the default.
 *  • Size budget: 5 000 entries × 384 floats × 4 B ≈ 7,7 MB.  When the
 *    budget is exceeded the oldest 10 % are pruned.
 *  • WebGPU is used when available; a measured CPU fallback is shown to the
 *    user (no silent degradation).
 *  • **Fail-closed gating**: the engine checks `enable_embed` setting
 *    and `isFeatureEnabled("embed")` before vectorising any text.
 */

(function () {
    "use strict";

    // ── Constants ────────────────────────────────────────────────────────

    const DB_NAME = "wvc-embeddings";
    const STORE_NAME = "embeddings";
    const MAX_ENTRIES = 5000;
    const PRUNE_RATIO = 0.10;
    const SESSION_CACHE_MAX = 200;
    const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const MAX_TEXT_LENGTH = 4096;

    // ── Helpers ──────────────────────────────────────────────────────────

    /** djb2 hash for deduplication */
    function hashText(text) {
        let hash = 5381;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
        }
        return hash.toString(36);
    }

    /** Normalise text before embedding */
    function normalise(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            .trim()
            .slice(0, MAX_TEXT_LENGTH);
    }

    /** Cosine similarity between two vectors */
    function cosineSimilarity(a, b) {
        let dot = 0,
            magA = 0,
            magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        if (magA === 0 || magB === 0) return 0;
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }

    // ── IndexedDB helpers ────────────────────────────────────────────────

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: "hash",
                    });
                    store.createIndex("created", "created", { unique: false });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function addTextToDB(db, hash, text, vector, created) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.add({ hash, text, vector, created });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    function getTextByHash(db, hash) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(hash);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    function loadAllEmbeddings(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    function deleteByHash(db, hashes) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            hashes.forEach((h) => store.delete(h));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    function pruneIfNeeded(db) {
        return loadAllEmbeddings(db).then((all) => {
            if (all.length <= MAX_ENTRIES) return;
            const toPrune = Math.ceil(all.length * PRUNE_RATIO);
            all.sort((a, b) => a.created - b.created);
            const hashes = all.slice(0, toPrune).map((e) => e.hash);
            if (hashes.length) {
                return deleteByHash(db, hashes);
            }
        });
    }

    // ── Session cache ────────────────────────────────────────────────────

    class SessionCache {
        constructor() {
            this._map = new Map();
        }

        get(key) {
            const entry = this._map.get(key);
            if (!entry) return null;
            if (Date.now() - entry.ts > SESSION_CACHE_TTL_MS) {
                this._map.delete(key);
                return null;
            }
            return entry.vec;
        }

        set(key, vec) {
            if (this._map.size >= SESSION_CACHE_MAX) {
                const first = this._map.keys().next().value;
                this._map.delete(first);
            }
            this._map.set(key, { vec, ts: Date.now() });
        }
    }

    // ── WebGPU detection ─────────────────────────────────────────────────

    function getWebGPUStatus(bridge) {
        try {
            const device = bridge.getDevice();
            const isWebGPU = device === "webgpu";
            return {
                available: true,
                isWebGPU,
                gpuName: null,
                type: isWebGPU ? "webgpu" : device || "unknown",
            };
        } catch {
            return { available: false, isWebGPU: false, gpuName: null, type: "unknown" };
        }
    }

    // ── Main engine ──────────────────────────────────────────────────────

    /**
     * EmbedSemanticSearch — client-side semantic search engine.
     *
     * Uses the EmbedBridge from Stage 1 via
     * `window.runonwebBridge.getEmbed()`.
     *
     * @example
     *   const engine = new EmbedSemanticSearch();
     *   await engine.init();
     *   if (engine.isReady()) {
     *       const results = await engine.search("query");
     *   }
     */
    class EmbedSemanticSearch {
        constructor() {
            this._ready = false;
            this._db = null;
            this._embed = null;
            this._sessionCache = new SessionCache();
            this._featureEnabled = false;
        }

        /** Check if the engine is ready for search. */
        isReady() {
            return this._ready;
        }

        /** Initialize the engine — lazy, does nothing until called. */
        async init(settings) {
            if (this._ready) return;

            // Fail-closed gating
            const enableEmbed =
                settings && typeof settings.enable_embed === "boolean"
                    ? settings.enable_embed
                    : false;
            const featureEnabled =
                typeof window.isFeatureEnabled === "function"
                    ? window.isFeatureEnabled("embed")
                    : false;

            if (!enableEmbed || !featureEnabled) {
                console.warn(
                    "[embed] semantic search disabled: enable_embed=" +
                        enableEmbed +
                        ", isFeatureEnabled=" +
                        featureEnabled
                );
                return;
            }

            // Get the bridge from Stage 1
            let bridge = window.runonwebBridge;
            if (!bridge) {
                // Retry once in case the bridge hasn't booted yet
                await new Promise((r) => setTimeout(r, 100));
                bridge = window.runonwebBridge;
            }
            if (!bridge) {
                console.warn("[embed] runonwebBridge not available");
                return;
            }

            // Get the embed instance (Stage 1 API)
            this._embed = bridge.getEmbed();
            if (!this._embed) {
                console.warn("[embed] getEmbed() returned undefined");
                return;
            }

            // Open IndexedDB
            try {
                this._db = await openDB();
            } catch (err) {
                console.warn("[embed] IndexedDB open failed:", err);
                return;
            }

            // Load the model (lazy — only now)
            try {
                await this._embed.load();
            } catch (err) {
                console.warn("[embed] model load failed:", err);
                return;
            }

            this._featureEnabled = true;
            this._ready = true;
        }

        /** Add text to the embedding store. Returns true on success. */
        async addText(text) {
            if (!this._ready) return false;

            const normalised = normalise(text);
            if (!normalised) return false;

            const hash = hashText(normalised);

            // Check session cache first
            const cached = this._sessionCache.get(hash);
            if (cached) {
                // Still store in IndexedDB for persistence
                const existing = await getTextByHash(this._db, hash);
                if (!existing) {
                    await addTextToDB(this._db, hash, normalised, cached, Date.now());
                    await pruneIfNeeded(this._db);
                }
                return true;
            }

            // Compute embedding
            let vec;
            try {
                vec = await this._embed.embed(normalised);
            } catch (err) {
                console.warn("[embed] embed() failed:", err);
                return false;
            }

            // Store in IndexedDB
            try {
                await addTextToDB(this._db, hash, normalised, vec, Date.now());
                await pruneIfNeeded(this._db);
                // Also cache in session
                this._sessionCache.set(hash, vec);
                return true;
            } catch (err) {
                console.warn("[embed] IndexedDB write failed:", err);
                return false;
            }
        }

        /** Search for similar texts. Returns array sorted by similarity desc. */
        async search(query) {
            if (!this._ready) return [];

            const normalised = normalise(query);
            if (!normalised) return [];

            // Check session cache
            const cached = this._sessionCache.get(hashText(normalised));
            if (cached) {
                return this._searchWithVector(cached);
            }

            // Compute query embedding
            let queryVec;
            try {
                queryVec = await this._embed.embed(normalised);
            } catch (err) {
                console.warn("[embed] query embed failed:", err);
                return [];
            }

            const results = await this._searchWithVector(queryVec);

            // Cache the query vector
            this._sessionCache.set(hashText(normalised), queryVec);

            return results;
        }

        async _searchWithVector(queryVec) {
            const all = await loadAllEmbeddings(this._db);
            const scored = all.map((entry) => ({
                hash: entry.hash,
                text: entry.text,
                similarity: cosineSimilarity(entry.vector, queryVec),
            }));

            scored.sort((a, b) => b.similarity - a.similarity);

            // Return top 10
            return scored.slice(0, 10).map((s) => ({
                text: s.text,
                similarity: s.similarity,
            }));
        }

        /** Clear all stored embeddings. */
        async clear() {
            if (!this._db) return;
            return new Promise((resolve, reject) => {
                const tx = this._db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                const req = store.clear();
                tx.oncomplete = () => {
                    this._ready = false;
                    this._embed = null;
                    this._db = null;
                    this._sessionCache = new SessionCache();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        }

        /** Get engine statistics. */
        async stats() {
            if (!this._db) return { ready: false, entryCount: 0, webGPU: null };
            const all = await loadAllEmbeddings(this._db);
            return {
                ready: this._ready,
                entryCount: all.length,
                webGPU: getWebGPUStatus(this._embed),
            };
        }
    }

    // ── Export ───────────────────────────────────────────────────────────

    if (typeof window !== "undefined") {
        window.EmbedSemanticSearch = EmbedSemanticSearch;
    }
})();
