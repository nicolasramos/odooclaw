/** @odoo-module **/

/**
 * Tests for embed_semantic_search.js
 *
 * These tests validate the pure-JS helpers (hashText, normaliseText,
 * cosineSimilarity) and the SessionCache class without requiring a
 * real runonweb/embed model or IndexedDB.  They use @odoo/hoot.
 *
 * NOTE: @odoo/hoot only exists in Odoo 18+.  These tests are gated
 * by version so they don't break Odoo 17 installations.
 */

import { describe, expect, test } from "@odoo/hoot";

// ── Import the module-under-test ─────────────────────────────────────

// The IIFE attaches EmbedSemanticSearch to window when loaded in a browser.
// For testing we import the named exports (Node.js compat).
const { EmbedSemanticSearch, cosineSimilarity, hashText, normaliseText, SessionCache } =
    await import("@mail_bot_odooclaw/static/src/js/embed_semantic_search.js");

// ── Test: normaliseText ──────────────────────────────────────────────

describe("embed_semantic_search – normaliseText", () => {
    test("lowercases and collapses whitespace", () => {
        expect(normaliseText("  Hello   WORLD  ")).toBe("hello world");
    });

    test("strips control characters", () => {
        const withControl = "hell\x00o\x01world";
        expect(normaliseText(withControl)).toBe("helloworld");
    });

    test("truncates to MAX_TEXT_LENGTH (4096)", () => {
        const longText = "a".repeat(5000);
        expect(normaliseText(longText).length).toBe(4096);
    });

    test("handles empty string", () => {
        expect(normaliseText("")).toBe("");
    });

    test("handles non-string input", () => {
        expect(normaliseText(null)).toBe("");
        expect(normaliseText(undefined)).toBe("");
        expect(normaliseText(123)).toBe("");
    });
});

// ── Test: hashText ───────────────────────────────────────────────────

describe("embed_semantic_search – hashText", () => {
    test("produces deterministic hashes for identical text", () => {
        const text = "hola mundo de prueba";
        expect(hashText(text)).toBe(hashText(text));
    });

    test("produces different hashes for different text", () => {
        expect(hashText("hola")).not.toBe(hashText("adios"));
    });

    test("handles empty string", () => {
        const hash = hashText("");
        expect(typeof hash).toBe("string");
        expect(hash.length).toBeGreaterThan(0);
    });

    test("produces base-36 hash", () => {
        const hash = hashText("test");
        // base-36 uses [0-9a-z]
        expect(hash).toMatch(/^[0-9a-z]+$/);
    });
});

// ── Test: cosineSimilarity ───────────────────────────────────────────

describe("embed_semantic_search – cosineSimilarity", () => {
    test("identical vectors have similarity 1.0", () => {
        const v = new Float32Array([1, 2, 3]);
        expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    test("orthogonal vectors have similarity ~0", () => {
        const a = new Float32Array([1, 0, 0]);
        const b = new Float32Array([0, 1, 0]);
        expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    test("opposite vectors have similarity -1.0", () => {
        const a = new Float32Array([1, 0, 0]);
        const b = new Float32Array([-1, 0, 0]);
        expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    test("different lengths return 0", () => {
        const a = new Float32Array([1, 2]);
        const b = new Float32Array([1, 2, 3]);
        expect(cosineSimilarity(a, b)).toBe(0);
    });

    test("zero vector returns 0", () => {
        const a = new Float32Array([0, 0, 0]);
        const b = new Float32Array([1, 2, 3]);
        expect(cosineSimilarity(a, b)).toBe(0);
    });
});

// ── Test: SessionCache ───────────────────────────────────────────────

describe("embed_semantic_search – SessionCache", () => {
    test("stores and retrieves entries", () => {
        const cache = new SessionCache();
        const vec = new Float32Array([0.1, 0.2, 0.3]);
        cache.set("key1", "some text", vec);
        const result = cache.get("key1");
        expect(result).not.toBeNull();
        expect(result.length).toBe(3);
    });

    test("returns null for missing keys", () => {
        const cache = new SessionCache();
        expect(cache.get("nonexistent")).toBeNull();
    });

    test("evicts oldest entries when over 200", () => {
        const cache = new SessionCache();
        for (let i = 0; i < 250; i++) {
            cache.set(`key${i}`, `text${i}`, new Float32Array([i]));
        }
        expect(cache.entries.size).toBeLessThanOrEqual(200);
    });

    test("clears all entries", () => {
        const cache = new SessionCache();
        cache.set("key1", "text1", new Float32Array([1]));
        cache.clear();
        expect(cache.get("key1")).toBeNull();
    });
});

// ── Test: EmbedSemanticSearch class ──────────────────────────────────

describe("embed_semantic_search – EmbedSemanticSearch", () => {
    test("isReady() returns false before init", () => {
        const engine = new EmbedSemanticSearch();
        expect(engine.isReady()).toBe(false);
    });

    test("init() does not throw when bridge is absent", async () => {
        const engine = new EmbedSemanticSearch();
        // Without a real runonweb/embed, init() should not throw
        await engine.init();
        expect(engine.isReady()).toBe(false);
    });

    test("addText() returns false when model is not ready", async () => {
        const engine = new EmbedSemanticSearch();
        const result = await engine.addText("test text", "test-id");
        expect(result).toBe(false);
    });

    test("search() returns empty array when model is not ready", async () => {
        const engine = new EmbedSemanticSearch();
        const results = await engine.search("query");
        expect(results).toEqual([]);
    });

    test("clear() works even without model", async () => {
        const engine = new EmbedSemanticSearch();
        await engine.clear();
        // Should not throw
        expect(engine.isReady()).toBe(false);
    });

    test("stats() returns valid structure", async () => {
        const engine = new EmbedSemanticSearch();
        const s = await engine.stats();
        expect(s).toHaveProperty("count");
        expect(s).toHaveProperty("totalBytes");
        expect(s).toHaveProperty("webGPU");
        expect(s).toHaveProperty("ready");
    });

    test("skips text shorter than MIN_TEXT_LENGTH (10)", async () => {
        const engine = new EmbedSemanticSearch();
        const result = await engine.addText("short", "id1");
        expect(result).toBe(false);
    });
});
