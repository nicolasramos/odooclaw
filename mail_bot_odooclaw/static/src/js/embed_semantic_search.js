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
 *  • **Fail-closed gating**: the engine checks `enable_embed` setting and
 *    `isFeatureEnabled("embed")` before vectorising — if either is false,
 *    `addText()` and `search()` return empty/false silently.
 */

(function () {
    "use strict";

    // ── Constants ──────────────────────────────────────────────────────

    const MAX_TEXT_LENGTH = 4096;
    const MAX_ENTRIES = 5000;
    const PRUNE_PCT = 0.10;
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const MIN_TEXT_LENGTH = 10;
    const DB_NAME = "wvc-embeddings";
    const STORE_NAME = "embeddings";

    // ── Helpers ────────────────────────────────────────────────────────

    /** Normalise text: lowercase, collapse whitespace, strip control chars. */
    function normaliseText(text) {
        if (typeof text !== "string") return "";
        let s = text.toLowerCase();
        // Collapse whitespace
        s = s.replace(/\s+/g, " ").trim();
        // Strip control characters (except newline/tab)
        s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
        // Truncate
        if (s.length > MAX_TEXT_LENGTH) {
            s = s.substring(0, MAX_TEXT_LENGTH);
        }
        return s;
    }

    /** djb2 hash for deduplication. */
    function hashText(text) {
        let hash = 5381;
        for (let i = 0; i < text.length; i++) {
            hash = (hash * 33) ^ text.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    }

    /** Cosine similarity between two Float32Arrays. */
    function cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // ── IndexedDB helpers ──────────────────────────────────────────────

    /** Open or create the IndexedDB store. */
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "hash" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /** Store an entry in IndexedDB. */
    async function putEntry(db, entry) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /** Get an entry from IndexedDB. */
    async function getEntry(db, hash) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const request = tx.objectStore(STORE_NAME).get(hash);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /** Get all entries from IndexedDB. */
    async function getAllEntries(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /** Clear all entries from IndexedDB. */
    async function clearEntries(db) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /** Prune oldest entries when exceeding MAX_ENTRIES. */
    async function pruneIfNeeded(db) {
        const all = await getAllEntries(db);
        if (all.length <= MAX_ENTRIES) return;

        const sorted = all.sort((a, b) => a.created - b.created);
        const toDelete = Math.floor(sorted.length * PRUNE_PCT);
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (let i = 0; i < toDelete; i++) {
            store.delete(sorted[i].hash);
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // ── Session Cache (in-memory, 200 entries, 5-min TTL) ──────────────

    class SessionCache {
        constructor() {
            this.entries = new Map();
        }

        has(hash) {
            return this.entries.has(hash);
        }

        get(hash) {
            const entry = this.entries.get(hash);
            if (!entry) return null;
            if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
                this.entries.delete(hash);
                return null;
            }
            return entry.vector;
        }

        set(hash, text, vector) {
            this.entries.set(hash, { text, vector, timestamp: Date.now() });
            if (this.entries.size > 200) {
                const oldest = Math.max(0, this.entries.size - 150);
                const sorted = [...this.entries.entries()].sort(
                    (a, b) => a[1].timestamp - b[1].timestamp
                );
                sorted.slice(0, oldest).forEach(([k]) => this.entries.delete(k));
            }
        }

        clear() {
            this.entries.clear();
        }
    }

    // ── WebGPU detection ───────────────────────────────────────────────

    /**
     * Get WebGPU status via Stage 1's getDevice().
     * @returns {Promise<Object>} WebGPU status object
     */
    async function getWebGPUStatus() {
        const bridge = window.runonwebBridge;
        if (!bridge || !bridge.getDevice) {
            return { available: false, isWebGPU: false, gpuName: null, type: "unknown" };
        }
        try {
            const device = await bridge.getDevice();
            if (!device) {
                return { available: false, isWebGPU: false, gpuName: null, type: "unknown" };
            }
            // getDevice() returns a string: "webgpu" or "wasm"
            const isWebGPU = device === "webgpu";
            return {
                available: true,
                isWebGPU,
                gpuName: null,
                type: device,
            };
        } catch (err) {
            return { available: false, isWebGPU: false, gpuName: null, type: "unknown" };
        }
    }

    // ── EmbedSemanticSearch class ──────────────────────────────────────

    /**
     * Client-side semantic search engine.
     *
     * Uses Stage 1's EmbedBridge via `window.runonwebBridge.getEmbed()`
     * to vectorise texts and store them in IndexedDB with a cosine
     * brute-force index.
     *
     * **Fail-closed gating**: checks `enable_embed` setting and
     * `isFeatureEnabled("embed")` before vectorising.
     *
     * @example
     *   const engine = new EmbedSemanticSearch();
     *   await engine.init();
     *   await engine.addText("Hello world", "doc-1");
     *   const results = await engine.search("Hello");
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
            return this._ready && this._featureEnabled;
        }

        /**
         * Initialise the engine.
         * - Opens IndexedDB
         * - Gets the EmbedBridge from Stage 1
         * - Checks feature gating (fail closed)
         * - Loads the model (lazy download)
         */
        async init() {
            try {
                // Open IndexedDB
                this._db = await openDB();

                // Get the EmbedBridge from Stage 1, with retry.
                // The bridge may not exist yet if the bundle hasn't finished
                // executing (e.g. in Odoo 17 where odoo may not be ready).
                let bridge = window.runonwebBridge;
                let retries = 0;
                while ((!bridge || !bridge.getEmbed) && retries < 10) {
                    if (window.runonwebBundle && window.runonwebBundle.injectRunonwebBridge) {
                        window.runonwebBundle.injectRunonwebBridge();
                    }
                    bridge = window.runonwebBridge;
                    retries++;
                    if (!bridge) {
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
                if (!bridge || !bridge.getEmbed) {
                    console.warn(
                        "[embed] Stage 1 bridge not available after retries — semantic search disabled"
                    );
                    return;
                }

                // Fail-closed gating: check settings and feature flags
                const settings = bridge.settings || {};
                const enableEmbed = settings.enable_embed === true;
                const featureEnabled = bridge.isFeatureEnabled
                    ? bridge.isFeatureEnabled("embed")
                    : false;

                if (!enableEmbed || !featureEnabled) {
                    console.warn(
                        "[embed] feature gated: enable_embed=" +
                            enableEmbed +
                            ", isFeatureEnabled=" +
                            featureEnabled
                    );
                    this._featureEnabled = false;
                    return;
                }

                this._featureEnabled = true;

                // Get the embed bridge instance
                this._embed = bridge.getEmbed();
                if (!this._embed) {
                    console.warn(
                        "[embed] getEmbed() returned null — semantic search disabled"
                    );
                    return;
                }

                // Load the model (lazy download)
                await this._embed.load();
                this._ready = true;
            } catch (err) {
                console.warn("[embed] init failed:", err);
                this._ready = false;
                this._featureEnabled = false;
            }
        }

        /**
         * Add text to the index.
         * @param {string} text - Text to embed
         * @param {string} id - Unique identifier for this text
         * @returns {boolean} true if the text was added, false otherwise
         */
        async addText(text, id) {
            if (!this._ready) {
                return false;
            }

            const normalised = normaliseText(text);
            if (normalised.length < MIN_TEXT_LENGTH) {
                return false;
            }

            const hash = hashText(normalised);

            // Check session cache first
            const cached = this._sessionCache.get(hash);
            if (cached) {
                // Store in IndexedDB too
                const entry = {
                    hash,
                    id,
                    text: normalised,
                    vector: Array.from(cached),
                    created: Date.now(),
                };
                await putEntry(this._db, entry);
                await pruneIfNeeded(this._db);
                return true;
            }

            // Generate embedding
            let vector;
            try {
                const result = await this._embed.embed(normalised);
                // Handle different return types
                if (result instanceof Float32Array) {
                    vector = result;
                } else if (Array.isArray(result)) {
                    vector = new Float32Array(result);
                } else {
                    console.warn("[embed] unexpected embed result type:", typeof result);
                    return false;
                }
            } catch (err) {
                console.warn("[embed] embed failed:", err);
                return false;
            }

            // Store in IndexedDB
            const entry = {
                hash,
                id,
                text: normalised,
                vector: Array.from(vector),
                created: Date.now(),
            };
            await putEntry(this._db, entry);
            await pruneIfNeeded(this._db);

            // Add to session cache
            this._sessionCache.set(hash, normalised, vector);

            return true;
        }

        /**
         * Search for similar texts.
         * @param {string} query - Search query
         * @param {number} [topK=5] - Number of results to return
         * @returns {Array} Array of { id, text, similarity } objects
         */
        async search(query, topK = 5) {
            if (!this._ready) {
                return [];
            }

            const normalised = normaliseText(query);
            if (normalised.length < MIN_TEXT_LENGTH) {
                return [];
            }

            const hash = hashText(normalised);

            // Check session cache first
            const cached = this._sessionCache.get(hash);
            if (cached) {
                return this._searchWithVector(cached, topK);
            }

            // Generate embedding for query
            let queryVector;
            try {
                const result = await this._embed.embed(normalised);
                if (result instanceof Float32Array) {
                    queryVector = result;
                } else if (Array.isArray(result)) {
                    queryVector = new Float32Array(result);
                } else {
                    console.warn("[embed] unexpected embed result type:", typeof result);
                    return [];
                }
            } catch (err) {
                console.warn("[embed] embed failed:", err);
                return [];
            }

            const results = await this._searchWithVector(queryVector, topK);

            // Add to session cache
            this._sessionCache.set(hash, normalised, queryVector);

            return results;
        }

        /** Helper: search using a pre-computed vector. */
        async _searchWithVector(queryVector, topK) {
            const all = await getAllEntries(this._db);
            const scored = all.map((entry) => {
                const entryVector = new Float32Array(entry.vector);
                const sim = cosineSimilarity(queryVector, entryVector);
                return { id: entry.id, text: entry.text, similarity: sim };
            });

            // Sort by similarity descending
            scored.sort((a, b) => b.similarity - a.similarity);

            // Return top K
            return scored.slice(0, topK);
        }

        /**
         * Clear all stored embeddings.
         */
        async clear() {
            if (this._db) {
                await clearEntries(this._db);
            }
            this._sessionCache.clear();
            this._ready = false;
            this._featureEnabled = false;
        }

        /**
         * Get statistics about the engine.
         * @returns {Object} Statistics object
         */
        async stats() {
            const count = this._db ? (await getAllEntries(this._db)).length : 0;
            const totalBytes = count * 384 * 4; // 384 floats × 4 bytes

            let webGPU = { available: false, isWebGPU: false };
            try {
                webGPU = await getWebGPUStatus();
            } catch (err) {
                // Ignore errors in stats
            }

            return {
                count,
                totalBytes,
                webGPU,
                ready: this._ready,
                featureEnabled: this._featureEnabled,
            };
        }
    }

    // ── Export for tests ───────────────────────────────────────────────

    // Export for Node.js / test harness
    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            EmbedSemanticSearch,
            cosineSimilarity,
            hashText,
            normaliseText,
            SessionCache,
            getWebGPUStatus,
        };
    }

    // Export for browser (IIFE)
    if (typeof window !== "undefined") {
        window.EmbedSemanticSearch = EmbedSemanticSearch;
    }
})();
