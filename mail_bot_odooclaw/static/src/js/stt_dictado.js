/** @odoo-module **/
/**
 * stt_dictado.js — Integración de dictado por voz en el webclient de Odoo.
 *
 * Usa runonweb/stt (Whisper) para transcripción local en el navegador.
 * Se integra en:
 *   1. Compositor de Discuss (botón de dictado en el footer)
 *   2. Campos de texto marcados (data-runonweb-dictation="true")
 *
 * API real de la etapa 1 (window.runonwebBridge):
 *   window.runonwebBundle.SttBridge
 *   new SttBridge({ model: "onnx-community/whisper-tiny" })
 *   await stt.load()
 *   result = stt.transcribe(audioFloat32Array, { language: "es" })
 *
 * Modelo default: onnx-community/whisper-tiny (multilingüe, ~75 MB)
 * Alternativas: onnx-community/whisper-base, onnx-community/whisper-small
 */
// No logger module in Odoo 17/18 — use console directly

// ──────────────────────────────────────────────────────────────────────────
// 0. Configuración
// ──────────────────────────────────────────────────────────────────────────
const STT_MODEL_ID = "onnx-community/whisper-tiny";
const STT_SAMPLE_RATE = 16000;

// ──────────────────────────────────────────────────────────────────────────
// 1. Estado del dictado
// ──────────────────────────────────────────────────────────────────────────
const DictationState = Object.freeze({
    IDLE: "idle",
    LISTENING: "listening",
    TRANSCRIBING: "transcribing",
    ERROR: "error",
});

// ──────────────────────────────────────────────────────────────────────────
// 2. Servicio STT (instancia por zona de dictado)
// ──────────────────────────────────────────────────────────────────────────
export class DictationService {
    constructor() {
        this.state = DictationState.IDLE;
        this._listeners = [];
        this._sttInstance = null;
        this._mediaRecorder = null;
        this._audioChunks = [];
        this._isRecording = false;
    }

    addListener(fn) {
        this._listeners.push(fn);
    }

    removeListener(fn) {
        const idx = this._listeners.indexOf(fn);
        if (idx !== -1) this._listeners.splice(idx, 1);
    }

    _notify(state, text = "", error = null) {
        for (const fn of this._listeners) {
            fn(state, text, error);
        }
    }

    /**
     * Carga el modelo STT si no está ya cargado.
     * Usa la API real de la etapa 1:
     *   window.runonwebBundle.SttBridge
     *   new SttBridge({ model })
     *   await stt.load()
     */
    async _ensureModelLoaded() {
        if (this._sttInstance) return;

        const SttBridge = window.runonwebBundle?.SttBridge;
        if (!SttBridge) {
            throw new Error("[runonweb] SttBridge not available — runonweb bundle not loaded");
        }

        this._sttInstance = new SttBridge({ model: STT_MODEL_ID });
        await this._sttInstance.load();
        console.info(`[runonweb] STT model ${STT_MODEL_ID} loaded`);
    }

    /**
     * Inicia la grabación de audio usando MediaRecorder nativo.
     */
    async startRecording(targetField) {
        try {
            await this._ensureModelLoaded();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus",
            });
            this._audioChunks = [];
            this._isRecording = true;

            this._mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this._audioChunks.push(e.data);
                }
            };

            this._mediaRecorder.start();
            this.state = DictationState.LISTENING;
            this._notify(DictationState.LISTENING);
            console.info("[runonweb] Dictation recording started");
        } catch (error) {
            this.state = DictationState.ERROR;
            this._notify(DictationState.ERROR, "", error.message);
            console.error("[runonweb] Failed to start dictation recording:", error);
            throw error;
        }
    }

    /**
     * Detiene la grabación y transcribe.
     * @returns {Promise<string>} Texto transcrito
     */
    async stopRecording() {
        if (!this._isRecording) {
            throw new Error("No recording in progress");
        }

        this.state = DictationState.TRANSCRIBING;
        this._notify(DictationState.TRANSCRIBING);

        try {
            return new Promise((resolve, reject) => {
                const onStop = async () => {
                    try {
                        // Detener el MediaRecorder
                        this._mediaRecorder?.stop();

                        // Detener todas las tracks de audio
                        if (this._mediaRecorder?.stream) {
                            this._mediaRecorder.stream.getTracks().forEach((t) => t.stop());
                        }

                        // Convertir blobs a Float32Array
                        const audioBuffer = await this._chunksToFloat32(this._audioChunks);

                        // Transcribir usando la API real de SttBridge
                        const result = await this._sttInstance.transcribe(audioBuffer, {
                            model: STT_MODEL_ID,
                            language: "es",
                        });

                        this.state = DictationState.IDLE;
                        this._notify(DictationState.IDLE, result.text);
                        console.info(`[runonweb] Dictation result: "${result.text}" (conf: ${result.confidence})`);
                        resolve(result.text);
                    } catch (error) {
                        this.state = DictationState.ERROR;
                        this._notify(DictationState.ERROR, "", error.message);
                        console.error("[runonweb] Dictation transcription failed:", error);
                        reject(error);
                    } finally {
                        this._isRecording = false;
                        this._audioChunks = [];
                    }
                };

                this._mediaRecorder.addEventListener("stop", onStop, { once: true });
            });
        } catch (error) {
            this.state = DictationState.ERROR;
            this._notify(DictationState.ERROR, "", error.message);
            console.error("[runonweb] Dictation error:", error);
            throw error;
        }
    }

    /**
     * Cancela la grabación sin transcribir.
     */
    async cancelRecording() {
        if (!this._isRecording) return;
        try {
            this._mediaRecorder?.stop();
            if (this._mediaRecorder?.stream) {
                this._mediaRecorder.stream.getTracks().forEach((t) => t.stop());
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        this._isRecording = false;
        this._audioChunks = [];
        this.state = DictationState.IDLE;
        this._notify(DictationState.IDLE);
        console.info("[runonweb] Dictation recording cancelled");
    }

    /**
     * Convierte un array de Blobs en un Float32Array.
     */
    async _chunksToFloat32(chunks) {
        const audioContext = new AudioContext({ sampleRate: STT_SAMPLE_RATE });
        try {
            const audioBuffer = await audioContext.decodeAudioData(
                await new Blob(chunks).arrayBuffer()
            );
            // Si es estéreo, mezclar a mono
            const channelData = audioBuffer.getChannelData(0);
            if (audioBuffer.numberOfChannels > 1) {
                const mono = new Float32Array(channelData.length);
                for (let i = 0; i < channelData.length; i++) {
                    let sum = 0;
                    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
                        sum += audioBuffer.getChannelData(ch)[i];
                    }
                    mono[i] = sum / audioBuffer.numberOfChannels;
                }
                return mono;
            }
            return channelData;
        } finally {
            await audioContext.close();
        }
    }

    destroy() {
        this._listeners = [];
        this._sttInstance = null;
        this._mediaRecorder = null;
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Integración con el compositor de Discuss
// ──────────────────────────────────────────────────────────────────────────
export function initDiscussDictation(composerEl) {
    if (!composerEl) return;

    // Buscar el textarea del composer
    const textarea = composerEl.querySelector("textarea")
        || composerEl.querySelector(".o-mail-Composer textarea")
        || composerEl.querySelector(".o-mail-Composer-input textarea");
    if (!textarea) {
        console.warn("[runonweb] No textarea found in Discuss composer");
        return;
    }

    // Buscar el footer del composer
    const footer = composerEl.querySelector(".o_mail_composer_footer")
        || composerEl.querySelector(".o-mail-composer-footer")
        || composerEl.querySelector("[class*='footer']");
    if (!footer) {
        console.warn("[runonweb] No footer found in Discuss composer");
        return;
    }

    // Crear el botón de dictado
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-secondary mail-bot-dictation-btn";
    btn.innerHTML = "🎤";
    btn.title = "Dictado por voz (local, sin salir del equipo)";
    btn.style.marginLeft = "0.25rem";

    const service = new DictationService();
    let isRecording = false;

    service.addListener((state, text, error) => {
        switch (state) {
            case DictationState.LISTENING:
                isRecording = true;
                btn.className = "btn btn-sm btn-danger mail-bot-dictation-btn recording";
                btn.innerHTML = "⏹";
                break;
            case DictationState.TRANSCRIBING:
                isRecording = false;
                btn.className = "btn btn-sm btn-info mail-bot-dictation-btn transcribing";
                btn.innerHTML = "✍️";
                btn.disabled = true;
                break;
            case DictationState.IDLE:
                isRecording = false;
                btn.className = "btn btn-sm btn-outline-secondary mail-bot-dictation-btn";
                btn.innerHTML = "🎤";
                btn.disabled = false;
                if (text) {
                    _insertTextAtCursor(textarea, text);
                }
                break;
            case DictationState.ERROR:
                isRecording = false;
                btn.className = "btn btn-sm btn-danger mail-bot-dictation-btn error";
                btn.innerHTML = "❌";
                btn.disabled = false;
                console.error("[runonweb] Dictation error:", error);
                break;
        }
    });

    btn.addEventListener("click", async () => {
        if (isRecording) {
            try {
                const text = await service.stopRecording();
                // Text already inserted via listener
            } catch (e) {
                console.error("[runonweb] Failed to stop dictation:", e);
            }
        } else {
            try {
                await service.startRecording(textarea);
            } catch (e) {
                console.error("[runonweb] Failed to start dictation:", e);
            }
        }
    });

    // Insertar botón en el footer
    footer.appendChild(btn);

    // Guardar referencia para limpieza
    composerEl._dictationService = service;
    composerEl._dictationBtn = btn;

    console.info("[runonweb] Dictation button added to Discuss composer");
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Integración con campos de texto marcados
// ──────────────────────────────────────────────────────────────────────────
export function initMarkedFieldDictation(fieldEl) {
    if (!fieldEl) return;

    // Idempotente: un campo sólo recibe un botón. Si Odoo re-renderizó el
    // nodo, el botón viejo ya no está en el DOM y se vuelve a enganchar.
    if (fieldEl._dictationBtn && fieldEl._dictationBtn.isConnected) return;

    const parent = fieldEl.parentNode;
    if (!parent) return;

    // El campo NO se mueve de sitio: envolverlo en un div extra rompe el
    // patching de Owl (framework pinta y re-renderiza ese nodo).
    fieldEl.classList.add("mail-bot-field-marked");

    // Crear botón
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-primary mail-bot-dictation-btn";
    btn.innerHTML = "🎤";
    btn.title = "Dictado por voz (local)";
    btn.style.marginLeft = "0.25rem";

    const service = new DictationService();
    let isRecording = false;

    service.addListener((state, text, error) => {
        switch (state) {
            case DictationState.LISTENING:
                isRecording = true;
                btn.className = "btn btn-sm btn-danger mail-bot-dictation-btn recording";
                btn.innerHTML = "⏹";
                break;
            case DictationState.TRANSCRIBING:
                isRecording = false;
                btn.className = "btn btn-sm btn-info mail-bot-dictation-btn transcribing";
                btn.innerHTML = "✍️";
                btn.disabled = true;
                break;
            case DictationState.IDLE:
                isRecording = false;
                btn.className = "btn btn-sm btn-outline-primary mail-bot-dictation-btn";
                btn.innerHTML = "🎤";
                btn.disabled = false;
                if (text) {
                    _insertTextIntoField(fieldEl, text);
                }
                break;
            case DictationState.ERROR:
                isRecording = false;
                btn.className = "btn btn-sm btn-danger mail-bot-dictation-btn error";
                btn.innerHTML = "❌";
                btn.disabled = false;
                console.error("[runonweb] Dictation error:", error);
                break;
        }
    });

    btn.addEventListener("click", async () => {
        if (!fieldEl.isConnected) {
            // Odoo re-renderizó el campo: el botón quedó huérfano, retirarlo.
            btn.remove();
            delete fieldEl._dictationBtn;
            delete fieldEl._dictationService;
            return;
        }
        if (isRecording) {
            try {
                await service.stopRecording();
            } catch (e) {
                console.error("[runonweb] Failed to stop dictation:", e);
            }
        } else {
            try {
                await service.startRecording(fieldEl);
            } catch (e) {
                console.error("[runonweb] Failed to start dictation:", e);
            }
        }
    });

    // El botón va como HERMANO del campo, dentro del wrapper del widget de
    // Odoo (div.o_field_widget): se inserta sin mover ningún nodo pintado.
    parent.insertBefore(btn, fieldEl.nextSibling);
    fieldEl._dictationService = service;
    fieldEl._dictationBtn = btn;

    console.info(`[runonweb] Dictation button added to field: ${fieldEl.id || fieldEl.className}`);
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Utilidades
// ──────────────────────────────────────────────────────────────────────────
function _insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + text + value.substring(end);
    const newCursorPos = start + text.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.info(`[runonweb] Text inserted at cursor: "${text}"`);
}

function _insertTextIntoField(field, text) {
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const value = field.value;
        field.value = value.substring(0, start) + text + value.substring(end);
        const newCursorPos = start + text.length;
        field.setSelectionRange(newCursorPos, newCursorPos);
        field.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (field.contentEditable === "true") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    console.info(`[runonweb] Text inserted into field: "${text}"`);
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Marcado de campos (producer del atributo en el DOM)
// ──────────────────────────────────────────────────────────────────────────

const DICTATION_ATTR = "data-runonweb-dictation";
const DICTATION_MARKED_SEL = "[data-runonweb-dictation='true']";

/**
 * Selectores contra el DOM real de Odoo 17 y 18 (medido en ambas versiones).
 * El <form> NO lleva atributo name: el name vive en el WRAPPER del widget
 * de campo (web.Field):
 *
 *   <div name="name" class="o_field_widget o_field_char …">
 *       <input class="o_input" …/>             ← char
 *   </div>
 *   <div name="note" class="o_field_widget o_field_html …">
 *       <div><textarea class="o_input"/></div>  ← text / html
 *   </div>
 *
 * Sólo tipos de texto (char/text/html), el mismo dominio que exige el
 * feature flag (ttype in ('text','html','char')): los widgets relacionales
 * y de elección (many2one, selection, boolean…) quedan fuera. El selector
 * anterior `textarea[data-runonweb-dictation='true']` era circular: sólo
 * casaba lo que ya estaba marcado.
 */
const DICTATION_FIELD_SELECTORS = [
    ".o_form_view .o_field_widget.o_field_char input.o_input",
    ".o_form_view .o_field_widget.o_field_text textarea",
    ".o_form_view .o_field_widget.o_field_html textarea",
    ".o-mail-Chatter .o_field_widget.o_field_char input.o_input",
    ".o-mail-Chatter .o_field_widget.o_field_text textarea",
    ".o-mail-Chatter .o_field_widget.o_field_html textarea",
];

function _bridge() {
    return (typeof window !== "undefined" && window.runonwebBridge) || null;
}

/**
 * Feature gating: kill-switch global + feature flags, ambos fail-closed,
 * con el MISMO contrato que ocr_invoice.js. Sin `enable_stt` y al menos una
 * flag `stt` activa no se marca NINGÚN campo del ERP: el botón sólo aparece
 * donde alguien activó la flag ("no en todos los inputs").
 * El compositor de Discuss NO pasa por este gate: es alcance decidido
 * por Nicolás (botón ahí siempre).
 */
function sttFeatureEnabled(fieldName) {
    const bridge = _bridge();
    if (!bridge) return false;
    const settings = bridge.settings || {};
    if (settings.enable_stt !== true) return false;
    try {
        return !!bridge.isFeatureEnabled("stt", fieldName, settings.userId);
    } catch (e) {
        return false;
    }
}

/** querySelectorAll que incluye también el propio nodo raíz. */
function _collect(root, selector) {
    const found = [];
    if (!root) return found;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches && root.matches(selector)) {
        found.push(root);
    }
    if (root.querySelectorAll) {
        for (const el of root.querySelectorAll(selector)) {
            found.push(el);
        }
    }
    return found;
}

/**
 * Produce el atributo data-runonweb-dictation en los campos de texto reales
 * del DOM (gated por feature flag).
 *
 * Se llama desde initDictationIntegration() y, lo importante, desde el
 * MutationObserver: los campos se marcan cuando EXISTEN, no una sola vez en
 * DOMContentLoaded (que corre antes de que el webclient pinte ninguna vista).
 */
function markFieldsForDictation(root = document) {
    let marked = 0;
    for (const selector of DICTATION_FIELD_SELECTORS) {
        for (const field of _collect(root, selector)) {
            if (field.hasAttribute(DICTATION_ATTR)) continue;
            const wrapper = field.closest(".o_field_widget");
            const fieldName =
                (wrapper && wrapper.getAttribute("name")) || field.getAttribute("name");
            if (!fieldName) continue;
            if (!sttFeatureEnabled(fieldName)) continue;
            field.setAttribute(DICTATION_ATTR, "true");
            marked += 1;
            console.info(`[runonweb] Marked field for dictation: ${fieldName}`);
        }
    }
    if (marked > 0) {
        // Productor e inyector van juntos: un campo recién marcado recibe su
        // botón en la misma pasada (patchMarkedFields no tenía ningún
        // call-site: era código muerto).
        patchMarkedFields(root);
    }
    return marked;
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Integración con el webclient: Discuss composer
// ──────────────────────────────────────────────────────────────────────────

const COMPOSER_SEL = ".o-mail-Composer, .o-mail-Composer-input";

/**
 * Patch del compositor de Discuss para añadir el botón de dictado.
 * @param {Node} [root] subtree donde buscar (por defecto, todo el documento)
 */
export function patchDiscussComposer(root = document) {
    if (!root || !root.querySelectorAll) return;
    const composerEls = root.querySelectorAll(COMPOSER_SEL);
    for (const composerEl of composerEls) {
        if (!composerEl._dictationService) {
            initDiscussDictation(composerEl);
        }
    }
}

/**
 * Engancha el botón de dictado a los campos marcados con
 * data-runonweb-dictation="true" (producidos por markFieldsForDictation o
 * ya presentes en el arch). Idempotente: cada campo sólo recibe un botón.
 * @param {Node} [root] subtree donde buscar (por defecto, todo el documento)
 */
export function patchMarkedFields(root = document) {
    for (const fieldEl of _collect(root, DICTATION_MARKED_SEL)) {
        initMarkedFieldDictation(fieldEl);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. Inicialización al cargar el webclient
// ──────────────────────────────────────────────────────────────────────────

/**
 * El bridge se inyecta de forma asíncrona (sesión + settings + flags): hasta
 * que no está listo, el gate devuelve false y no se marca ningún campo.
 * Al llegar, repasamos todo el DOM para no perder la primera vista pintada.
 */
function _whenBridgeReady(callback, tries = 120) {
    const tick = (left) => {
        if (_bridge()) {
            callback();
            return;
        }
        if (left <= 0) {
            console.warn("[runonweb] Bridge not ready: dictation fields stay gated off");
            return;
        }
        setTimeout(() => tick(left - 1), 250);
    };
    tick(tries);
}

function initDictationIntegration() {
    console.info("[runonweb] Initializing dictation integration");

    // Campos: se marcan cuando EXISTEN, no sólo al cargar la página.
    markFieldsForDictation(document);
    // Campos ya marcados en el arch (o marcados a mano): enganchar su botón.
    patchMarkedFields(document);
    // Compositor de Discuss (sin feature gate: alcance decidido).
    patchDiscussComposer(document);

    // Observe new composers AND new fields: every subtree Odoo paints is a
    // chance to mark a field that did not exist on the previous pass.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                patchDiscussComposer(node);
                markFieldsForDictation(node);
                patchMarkedFields(node);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    _whenBridgeReady(() => {
        markFieldsForDictation(document);
        patchMarkedFields(document);
    });

    console.info("[runonweb] Dictation integration initialized");
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDictationIntegration);
} else {
    initDictationIntegration();
}

// ──────────────────────────────────────────────────────────────────────────
// 9. Exportación
// ──────────────────────────────────────────────────────────────────────────
export { DictationState, STT_MODEL_ID, STT_SAMPLE_RATE };
