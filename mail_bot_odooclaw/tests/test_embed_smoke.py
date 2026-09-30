"""Smoke test for embed_semantic_search engine.

Uses HttpCase + browser_js (works in Odoo 17 and 18 without hoot).
Affirms two things:
  1. The asset defines the EmbedSemanticSearch class
  2. init() passes the gate when bridge is stubbed

This is a seed test — it does not load the real ONNX model
(we have no internet in the sandbox), but it proves the engine
reaches _ready when the bridge is available.
"""
# © 2026 Nicolás Ramos — MIT License
from odoo.tests import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestEmbedSmoke(HttpCase):
    """Smoke test for the embed_semantic_search engine."""

    def _run_embed_probe(self, extra_js=""):
        """Run a browser probe that checks the embed engine.

        Returns the probe output as a string.
        """
        return self.browser_js(
            url_path="/web",
            extra_js=extra_js,
        )

    def test_01_class_defined(self):
        """The asset defines window.EmbedSemanticSearch."""
        js = """
            var output = [];
            output.push("typeof_EmbedSemanticSearch=" + typeof window.EmbedSemanticSearch);
            output.push("test successful");
            document.body.textContent = output.join("\\n");
        """
        body = self._run_embed_probe(js).content
        self.assertIn("typeof_EmbedSemanticSearch=function", body)
        self.assertIn("test successful", body)

    def test_02_init_gate_with_stubbed_bridge(self):
        """init() reaches _ready when bridge is stubbed.

        We stub window.runonwebBridge to simulate Stage 1, then call
        init({enable_embed: true}) and assert the engine becomes ready.
        """
        js = """
            (async function() {
                var output = [];

                // Stub the bridge so init passes gating
                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    getDevice: function() { return "wasm"; }
                };

                // Create engine and init it
                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });

                output.push("engine_isReady=" + engine.isReady);
                output.push("engine_hasBridge=" + (typeof engine._bridge !== "undefined"));

                // Check that bridge was stored
                if (engine._bridge) {
                    output.push("bridge_stored=true");
                } else {
                    output.push("bridge_stored=false");
                }

                output.push("test successful");
                document.body.textContent = output.join("\\n");
            })();
        """
        body = self._run_embed_probe(js).content
        self.assertIn("engine_isReady=true", body)
        self.assertIn("bridge_stored=true", body)
        self.assertIn("test successful", body)

    def test_03_addText_and_search(self):
        """addText() + search() returns results when bridge is stubbed."""
        js = """
            (async function() {
                var output = [];

                // Stub the bridge
                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    getEmbed: function() {
                        return {
                            load: function() { return Promise.resolve(); },
                            embed: function(text) {
                                var vec = new Float32Array(384);
                                return Promise.resolve(vec);
                            },
                            getDevice: function() { return "wasm"; }
                        };
                    }
                };

                // Create engine and init it
                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });

                // Add some text and search
                await engine.addText("Odoo is great");
                await engine.addText("Semantic search works");
                await engine.addText("Testing is important");

                var results = await engine.search("search");

                output.push("addText_count=" + engine._texts.length);
                output.push("search_results_count=" + results.length);

                // Verify search returned non-empty results
                if (results && results.length > 0) {
                    output.push("search_found=true");
                } else {
                    output.push("search_found=false");
                }

                output.push("test successful");
                document.body.textContent = output.join("\\n");
            })();
        """
        body = self._run_embed_probe(js).content
        self.assertIn("addText_count=3", body)
        self.assertIn("search_results_count=", body)
        self.assertIn("search_found=true", body)
        self.assertIn("test successful", body)

    def test_04_consumer_class_defined(self):
        """The asset defines window.EmbedSemanticSearchConsumer."""
        js = """
            var output = [];
            output.push("typeof_EmbedSemanticSearchConsumer=" + typeof window.EmbedSemanticSearchConsumer);
            output.push("test successful");
            document.body.textContent = output.join("\\n");
        """
        body = self._run_embed_probe(js).content
        self.assertIn("typeof_EmbedSemanticSearchConsumer=function", body)
        self.assertIn("test successful", body)

    def test_05_consumer_init_gate(self):
        """Consumer init() respects gating — returns silently when disabled."""
        js = """
            (async function() {
                var output = [];

                // Stub the bridge with embed DISABLED
                window.runonwebBridge = {
                    settings: { enable_embed: false },
                };

                // Create consumer and init it
                var consumer = new EmbedSemanticSearchConsumer();
                await consumer.init({ enable_embed: true });

                // Engine should NOT be ready (gate blocks it)
                var stats = consumer.stats();
                output.push("consumer_engine_ready=" + (stats ? stats.ready : "no_stats"));

                output.push("test successful");
                document.body.textContent = output.join("\\n");
            })();
        """
        body = self._run_embed_probe(js).content
        self.assertIn("consumer_engine_ready=false", body)
        self.assertIn("test successful", body)

    def test_06_stats_output(self):
        """stats() returns expected structure."""
        js = """
            (async function() {
                var output = [];

                window.runonwebBridge = {
                    settings: { enable_embed: true },
                    isFeatureEnabled: function(name) { return name === "embed"; },
                    getEmbed: function() {
                        return {
                            load: function() { return Promise.resolve(); },
                            embed: function(text) {
                                var vec = new Float32Array(384);
                                return Promise.resolve(vec);
                            },
                            getDevice: function() { return "wasm"; }
                        };
                    }
                };

                var engine = new EmbedSemanticSearch();
                await engine.init({ enable_embed: true });

                var stats = engine.stats();
                output.push("stats_ready=" + stats.ready);
                output.push("stats_webGPU_available=" + stats.webGPU.available);
                output.push("stats_webGPU_isWebGPU=" + stats.webGPU.isWebGPU);
                output.push("stats_webGPU_type=" + stats.webGPU.type);

                output.push("test successful");
                document.body.textContent = output.join("\\n");
            })();
        """
        body = self._run_embed_probe(js).content
        self.assertIn("stats_ready=true", body)
        self.assertIn("stats_webGPU_type=wasm", body)
        self.assertIn("test successful", body)
