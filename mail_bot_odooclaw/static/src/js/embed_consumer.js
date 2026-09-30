/** @odoo-module **/
/**
 * embed_consumer.js — Minimal consumer for the EmbedSemanticSearch engine.
 *
 * When `enable_embed` is true and the feature flag is active, this module:
 *   1. Instantiates the EmbedSemanticSearch engine
 *   2. Provides a search button in the Discuss composer footer
 *   3. Indexes visible DOM text (composer content, chatter messages)
 *   4. Displays top-N results ordered by cosine similarity
 *
 * The lexical search path is untouched — embeddings are a complement.
 *
 * @license MIT
 */

const MAX_RESULTS = 10;
const MAX_TEXT_LENGTH = 500;

/** Extract text from DOM elements relevant to the user. */
function extractTextFromDOM() {
    var texts = [];
    // Composer textarea content
    var composer = document.querySelector(".o-mail-Composer textarea, .o-mail-Composer-input");
    if (composer && composer.value.trim()) {
        texts.push(composer.value.trim());
    }
    // Chatter message content
    var messages = document.querySelectorAll(".o-mail-discuss__message_body .o-mail-message__body-text");
    messages.forEach(function(msg) {
        var text = msg.textContent.trim();
        if (text && text.length > 5) {
            texts.push(text.slice(0, MAX_TEXT_LENGTH));
        }
    });
    return texts;
}

/** EmbedSemanticSearchConsumer — main consumer class. */
var EmbedSemanticSearchConsumer = /** @class */ (function () {
    function EmbedSemanticSearchConsumer() {
        this._engine = null;
        this._initialized = false;
        this._searchResults = [];
    }
    /** Initialize the consumer — lazy, respects gating. */
    EmbedSemanticSearchConsumer.prototype.init = function (settings) {
        var _this = this;
        if (this._initialized)
            return Promise.resolve();
        this._initialized = true;
        // Initialize the engine (gating is handled inside init)
        this._engine = new EmbedSemanticSearch();
        return this._engine.init(settings).then(function () {
            if (!_this._engine.isReady()) {
                console.debug("[embed] consumer: engine not ready (gated)");
                return;
            }
            console.info("[embed] consumer: engine ready");
            // Index initial DOM text
            _this.indexCurrentDOM();
            // Register search handler
            _this._registerSearchHandler();
        });
    };
    /** Index text from the current DOM. */
    EmbedSemanticSearchConsumer.prototype.indexCurrentDOM = function () {
        var _this = this;
        if (!this._engine || !this._engine.isReady())
            return Promise.resolve();
        var texts = extractTextFromDOM();
        var promises = texts.map(function (text) {
            return _this._engine.addText(text).catch(function (err) {
                console.warn("[embed] indexCurrentDOM failed for text:", err);
            });
        });
        return Promise.all(promises);
    };
    /** Register a search handler in the composer footer. */
    EmbedSemanticSearchConsumer.prototype._registerSearchHandler = function () {
        var _this = this;
        // Wait for DOM to be ready
        var checkDOM = function () {
            var footer = document.querySelector(".o_discuss_composer_footer, .o_composer_footer");
            if (!footer) {
                setTimeout(checkDOM, 500);
                return;
            }
            // Create search button
            var searchBtn = document.createElement("button");
            searchBtn.className = "o_button o_button_icon o_embed_search_btn";
            searchBtn.title = "Semantic search";
            searchBtn.textContent = "🔍";
            searchBtn.style.cssText = "margin-left: 4px;";
            searchBtn.addEventListener("click", function () {
                if (!_this._engine || !_this._engine.isReady())
                    return;
                // Get composer text
                var composer = document.querySelector(".o_discuss_composer textarea, .o_composer_textarea");
                var query = composer ? composer.value.trim() : "";
                if (!query)
                    return;
                // Search
                _this._engine.search(query).then(function (results) {
                    _this._searchResults = results;
                    _this._showResults(results, searchBtn);
                }).catch(function (err) {
                    console.warn("[embed] search failed:", err);
                });
            });
            footer.appendChild(searchBtn);
        };
        checkDOM();
    };
    /** Display search results in a dropdown near the button. */
    EmbedSemanticSearchConsumer.prototype._showResults = function (results, anchorEl) {
        var _this = this;
        // Remove existing results panel
        var existing = document.querySelector(".o_embed_search_results");
        if (existing)
            existing.remove();
        if (!results || results.length === 0)
            return;
        // Create results panel
        var panel = document.createElement("div");
        panel.className = "o_embed_search_results";
        panel.style.cssText = "position:absolute;background:white;border:1px solid #ccc;border-radius:4px;max-height:300px;overflow-y:auto;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.15);";
        // Position near anchor
        var rect = anchorEl.getBoundingClientRect();
        panel.style.left = rect.left + "px";
        panel.style.top = (rect.bottom + 4) + "px";
        results.forEach(function (result) {
            var item = document.createElement("div");
            item.style.cssText = "padding:8px 12px;border-bottom:1px solid #eee;cursor:pointer;font-size:13px;";
            item.textContent = result.text.slice(0, 200);
            item.title = "Similarity: " + result.similarity.toFixed(3);
            item.addEventListener("mouseenter", function () { item.style.background = "#f5f5f5"; });
            item.addEventListener("mouseleave", function () { item.style.background = ""; });
            panel.appendChild(item);
        });
        anchorEl.parentElement.appendChild(panel);
        // Close on outside click
        var closeHandler = function (e) {
            if (!panel.contains(e.target) && e.target !== anchorEl) {
                panel.remove();
                document.removeEventListener("click", closeHandler);
            }
        };
        setTimeout(function () {
            document.addEventListener("click", closeHandler);
        }, 100);
    };
    /** Search manually by query. */
    EmbedSemanticSearchConsumer.prototype.search = function (query) {
        if (!this._engine || !this._engine.isReady())
            return Promise.resolve([]);
        return this._engine.search(query);
    };
    /** Get current results. */
    EmbedSemanticSearchConsumer.prototype.getResults = function () {
        return this._searchResults;
    };
    /** Get engine stats. */
    EmbedSemanticSearchConsumer.prototype.stats = function () {
        if (!this._engine)
            return null;
        return this._engine.stats();
    };
    /** Clear all indexed text. */
    EmbedSemanticSearchConsumer.prototype.clear = function () {
        var _this = this;
        if (this._engine) {
            return this._engine.clear().then(function () {
                _this._searchResults = [];
            });
        }
        return Promise.resolve();
    };
    return EmbedSemanticSearchConsumer;
}());

// ── Export ───────────────────────────────────────────────────────────────

if (typeof window !== "undefined") {
    window.EmbedSemanticSearchConsumer = EmbedSemanticSearchConsumer;

    // Auto-instantiate consumer when the page is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            var consumer = new EmbedSemanticSearchConsumer();
            consumer.init({ enable_embed: true }).catch(function (e) {
                console.warn("[embed] consumer init failed:", e);
            });
        });
    } else {
        var consumer = new EmbedSemanticSearchConsumer();
        consumer.init({ enable_embed: true }).catch(function (e) {
            console.warn("[embed] consumer init failed:", e);
        });
    }
}
