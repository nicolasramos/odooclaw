"""Smoke test for embed_semantic_search engine.

Uses HttpCase + browser_js (works in Odoo 17 and 18 without hoot).
Affirms two things:
  1. The asset defines the EmbedSemanticSearch class
  2. init() passes the gate when bridge is stubbed

This is a seed test — it does not load the real ONNX model
(we have no internet in the sandbox), but it proves the engine
reaches _ready when the bridge is available.

browser_js contract (Odoo 17/18): the JS signals success with
console.log("test successful") and failure by throwing or calling
console.error. There is no response body to inspect — assertions
live in the JS itself.
"""
# © 2026 Nicolás Ramos — MIT License
from odoo.tests import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestEmbedSmoke(HttpCase):
    """Smoke test for the embed_semantic_search engine."""

    def _run_embed_probe(self, js):
        """Run a browser probe in the webclient.

        The JS must end with console.log("test successful") and must
        throw / console.error on assertion failure.
        """
        return self.browser_js(
            url_path="/web",
            code=js,
            ready="odoo.isReady",
            login="admin",
            timeout=120,
        )

    def test_01_class_defined(self):
        """The asset defines window.EmbedSemanticSearch."""
        js = """
            if (typeof window.EmbedSemanticSearch !== "function") {
                console.error("EmbedSemanticSearch not defined: " +
                    typeof window.EmbedSemanticSearch);
            }
            console.log("test successful");
        """
        self._run_embed_probe(js)

    def test_02_init_gate_with_stubbed_bridge(self):
        """init() reaches _ready when bridge is stubbed.

        We stub window.runonwebBridge to simulate Stage 1, then call
        init({enable_embed: true}) and assert the engine becomes ready.
        """
        js = """
            (async function () {
                // Stub the bridge so init passes gating
                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    isFeatureEnabled: function (f) { return true; },
                    getDevice: function () { return Promise.resolve("wasm"); },
                    getEmbed: function () {
                        return {
                            load: async function () {},
                            embed: async function (t) { return new Array(384).fill(0.1); },
                            dimensions: 384,
                        };
                    },
                };

                // Create engine and init it
                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });

                if (engine.isReady() !== true) {
                    console.error("engine not ready after init");
                    return;
                }
                if (!engine._bridge) {
                    console.error("bridge was not stored on the engine");
                    return;
                }
                console.log("test successful");
            })();
        """
        self._run_embed_probe(js)

    def test_03_addText_and_search(self):
        """addText() + search() returns results when bridge is stubbed."""
        js = """
            (async function () {
                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    isFeatureEnabled: function (f) { return true; },
                    getDevice: function () { return Promise.resolve("wasm"); },
                    getEmbed: function () {
                        // Deterministic pseudo-embedding: same text → same vector,
                        // similar texts → closer vectors.
                        var vec = function (t) {
                            var v = new Array(384);
                            var h = 0;
                            for (var i = 0; i < t.length; i++) {
                                h = (h * 31 + t.charCodeAt(i)) | 0;
                            }
                            for (var j = 0; j < 384; j++) {
                                v[j] = ((h >> (j % 31)) & 1) ? 1 : 0;
                            }
                            return v;
                        };
                        return {
                            load: async function () {},
                            embed: async function (t) { return vec(t.toLowerCase()); },
                            dimensions: 384,
                        };
                    },
                };

                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });
                if (!engine.isReady()) {
                    console.error("engine not ready");
                    return;
                }

                // Add some text and search
                await engine.addText("Odoo is great");
                await engine.addText("Semantic search works");
                await engine.addText("Testing is important");

                var results = await engine.search("Odoo");
                if (!Array.isArray(results) || results.length === 0) {
                    console.error("search returned no results: " + JSON.stringify(results));
                    return;
                }
                var top = results[0];
                if (!top || typeof top.similarity !== "number") {
                    console.error("bad result shape: " + JSON.stringify(top));
                    return;
                }
                console.log("test successful");
            })();
        """
        self._run_embed_probe(js)

    def test_04_consumer_class_defined(self):
        """The asset defines window.EmbedSemanticSearchConsumer."""
        js = """
            if (typeof window.EmbedSemanticSearchConsumer !== "function") {
                console.error("EmbedSemanticSearchConsumer not defined: " +
                    typeof window.EmbedSemanticSearchConsumer);
            }
            console.log("test successful");
        """
        self._run_embed_probe(js)

    def test_05_consumer_init_gate(self):
        """Consumer init() respects gating — returns silently when disabled."""
        js = """
            (async function () {
                // Stub the bridge with embed DISABLED
                window.runonwebBridge = {
                    settings: { enable_embed: false },
                    isFeatureEnabled: function (f) { return false; },
                    getDevice: function () { return Promise.resolve("wasm"); },
                };

                // Create consumer and init it
                var consumer = new EmbedSemanticSearchConsumer();
                await consumer.init({ enable_embed: true });

                // Engine should NOT be ready (gate blocks it)
                var stats = await consumer.stats();
                if (!stats || stats.ready !== false) {
                    console.error("consumer engine should be gated, stats=" +
                        JSON.stringify(stats));
                    return;
                }
                console.log("test successful");
            })();
        """
        self._run_embed_probe(js)

    def test_06_stats_output(self):
        """stats() returns expected structure."""
        js = """
            (async function () {
                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    isFeatureEnabled: function (f) { return true; },
                    getDevice: function () { return Promise.resolve("wasm"); },
                    getEmbed: function () {
                        return {
                            load: async function () {},
                            embed: async function (t) { return new Array(384).fill(0.1); },
                            dimensions: 384,
                        };
                    },
                };

                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });
                var stats = await engine.stats();

                if (!stats || stats.ready !== true) {
                    console.error("stats.ready != true: " + JSON.stringify(stats));
                    return;
                }
                if (!stats.webGPU || stats.webGPU.type !== "wasm") {
                    console.error("stats.webGPU wrong: " + JSON.stringify(stats.webGPU));
                    return;
                }
                console.log("test successful");
            })();
        """
        self._run_embed_probe(js)
