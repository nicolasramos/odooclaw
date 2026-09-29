/** @file embed_semantic_search.js
 *  Client-side semantic search — sits on top of Stage 1's EmbedBridge.
 *
 *  API:
 *    const bridge = RunonwebBridge.getOrCreate();
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
 */

(function () {
    "use strict";

    // ── Constants ──────────────────────────────────────────────────────

    const EMBED_DIM = 384;
    const DB_NAME = "wvc-embeddings";
    const DB_VERSION = 1;
    const STORE_NAME = "embeddings";
    const MAX_ENTRIES = 5000;
    const PRUNE_RATIO = 0.1;
    const MAX_TEXT_LENGTH = 4096;
    const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // ── IndexedDB helpers ──────────────────────────────────────────────

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: "id",
                    });
                    store.createIndex("hash", "hash", { unique: true });
                    store.createIndex("created", "created", { unique: false });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveEmbedding(entry) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            entry.created = entry.created || Date.now();
            const putReq = store.put(entry);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        });
    }

    async function loadAllEmbeddings() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteByHash(hashes) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            hashes.forEach((h) => store.delete(h));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function pruneIfNeeded() {
        const all = await loadAllEmbeddings();
        if (all.length <= MAX_ENTRIES) return;
        const toPrune = Math.ceil(all.length * PRUNE_RATIO);
        all.sort((a, b) => a.created - b.created);
        const hashes = all.slice(0, toPrune).map((e) => e.hash);
        if (hashes.length) {
            await deleteByHash(hashes);
        }
    }

    // ── Session cache ──────────────────────────────────────────────────

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
            if (Date.now() - entry.timestamp > SESSION_CACHE_TTL) {
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

    const sessionCache = new SessionCache();

    // ── Vector math ────────────────────────────────────────────────────

    function dotProduct(a, b) {
        let sum = 0;
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    function norm(v) {
        let sum = 0;
        for (let i = 0; i < v.length; i++) {
            sum += v[i] * v[i];
        }
        return Math.sqrt(sum);
    }

    function cosineSimilarity(a, b) {
        const nA = norm(a);
        const nB = norm(b);
        if (nA === 0 || nB === 0) return 0;
        return dotProduct(a, b) / (nA * nB);
    }

    // ── Text normalisation ─────────────────────────────────────────────

    function normaliseText(text) {
        if (typeof text !== "string") return "";
        return text
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[^\x20-\x7E\u00A0-\u024F]/g, " ")
            .trim()
            .slice(0, MAX_TEXT_LENGTH);
    }

    function hashText(text) {
        let hash = 5381;
        for (let i = 0; i < text.length; i++) {
            hash = (hash * 33) ^ text.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    }

    // ── Public API ─────────────────────────────────────────────────────

    /**
     * EmbedSemanticSearch — client-side semantic search engine.
     *
     * Uses Stage 1's `RunonwebBridge.getOrCreate().getEmbed()` for embedding
     * generation.  Embeddings are stored in IndexedDB with a cosine index.
     *
     * Usage:
     *   const engine = new EmbedSemanticSearch();
     *   await engine.init();
     *   await engine.addText("some text", "unique-id");
     *   const results = await engine.search("query text", { topK: 5 });
     */
    class EmbedSemanticSearch {
        constructor() {
            this._bridge = null;
            this._ready = false;
            this._loading = false;
            this._pruned = false;
        }

        /**
         * Initialise the engine — lazy-loads the EmbedBridge from Stage 1.
         * @returns {Promise<void>}
         */
        async init() {
            if (this._ready || this._loading) return;
            this._loading = true;
            try {
                // Stage 1 pattern: RunonwebBridge.getOrCreate().getEmbed()
                if (typeof RunonwebBridge === "undefined") {
                    console.warn("[embed] RunonwebBridge not available");
                    return;
                }
                const bridge = RunonwebBridge.getOrCreate();
                this._bridge = bridge.getEmbed();
                if (this._bridge) {
                    this._ready = true;
                } else {
                    console.warn("[embed] EmbedBridge not available");
                }
            } finally {
                this._loading = false;
            }
        }

        isReady() {
            return this._ready;
        }

        /** Get WebGPU status for diagnostics. */
        getWebGPUStatus() {
            if (typeof RunonwebBridge === "undefined") {
                return { available: false, isWebGPU: false };
            }
            const bridge = RunonwebBridge.getOrCreate();
            return bridge.getWebGPUStatus();
        }

        /**
         * Add text for semantic indexing.
         * @param {string} text - Text to embed
         * @param {string} id - Unique identifier
         * @returns {Promise<boolean>} true if indexed, false if skipped
         */
        async addText(text, id) {
            if (!this._ready) {
                await this.init();
                if (!this._ready) return false;
            }

            const normalised = normaliseText(text);
            if (normalised.length < 10) {
                return false;
            }

            const hash = hashText(normalised);

            // Check session cache first
            const cached = sessionCache.get(hash);
            if (cached) {
                await saveEmbedding({ id, hash, text: normalised, vector: cached });
                return true;
            }

            // Check if already in IndexedDB
            const existing = await this._getByHash(hash);
            if (existing) {
                return true;
            }

            // Generate embedding via Stage 1's EmbedBridge
            const vector = await this._bridge.embed(normalised);
            const vecArray = Array.isArray(vector) ? vector : [...vector];
            const floatVec = new Float32Array(vecArray.slice(0, EMBED_DIM));

            await saveEmbedding({ id, hash, text: normalised, vector: floatVec });
            sessionCache.set(hash, normalised, floatVec);

            if (!this._pruned) {
                await pruneIfNeeded();
                this._pruned = true;
            }

            return true;
        }

        /**
         * Search for semantically similar texts.
         * @param {string} query - Search query
         * @param {Object} [options] - Search options
         * @param {number} [options.topK=10] - Number of results
         * @param {number} [options.minScore=0.3] - Min cosine similarity
         * @returns {Promise<Array<{ id: string, text: string, score: number }>>}
         */
        async search(query, options = {}) {
            if (!this._ready) {
                await this.init();
                if (!this._ready) return [];
            }

            const topK = options.topK || 10;
            const minScore = options.minScore || 0.3;

            const queryVector = await this._bridge.embed(query);
            const vecArray = Array.isArray(queryVector) ? queryVector : [...queryVector];
            const queryVec = new Float32Array(vecArray.slice(0, EMBED_DIM));

            const all = await loadAllEmbeddings();
            const scored = [];

            for (const entry of all) {
                const score = cosineSimilarity(queryVec, entry.vector);
                if (score >= minScore) {
                    scored.push({
                        id: entry.id,
                        text: entry.text,
                        score: parseFloat(score.toFixed(4)),
                    });
                }
            }

            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, topK);
        }

        async _getByHash(hash) {
            const all = await loadAllEmbeddings();
            return all.find((e) => e.hash === hash) || null;
        }

        async clear() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                const req = store.clear();
                tx.oncomplete = () => {
                    sessionCache.clear();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        }

        async stats() {
            const all = await loadAllEmbeddings();
            const totalBytes = all.length * (EMBED_DIM * 4 + 128);
            return {
                count: all.length,
                totalBytes,
                webGPU: this.getWebGPUStatus(),
            };
        }
    }

    // ── Export ─────────────────────────────────────────────────────────

    if (typeof window !== "undefined") {
        window.EmbedSemanticSearch = EmbedSemanticSearch;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { EmbedSemanticSearch, cosineSimilarity, hashText, normaliseText };
    }
})();
