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

    // Verificar si ya tiene botón
    if (fieldEl.closest(".mail-bot-field-wrapper")) return;

    // Crear wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "mail-bot-field-wrapper";

    const parent = fieldEl.parentNode;
    if (!parent) return;

    parent.insertBefore(wrapper, fieldEl);
    wrapper.appendChild(fieldEl);
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

    wrapper.appendChild(btn);
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
// 6. Marcado de campos por selector (producer del atributo en el DOM)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Lista de selectores CSS para campos de texto que deben tener
 * data-runonweb-dictation=true en el DOM.
 * Se usa cuando el widget de campo de Odoo no reenvía atributos
 * arbitrarios desde el arch XML al DOM.
 */
const DICTATION_FIELD_SELECTORS = [
    // res.partner fields
    "form[name='form_res_partner'] input[name='name']",
    "form[name='form_res_partner'] input[name='phone']",
    "form[name='form_res_partner'] input[name='street']",
    // res.users fields
    "form[name='form_res_users'] input[name='name']",
    // Generic textarea fallback
    "textarea[data-runonweb-dictation='true']",
];

/**
 * Marca campos que coincidan con los selectores configurados.
 * Se llama desde initDictationIntegration() para producir el atributo
 * en el DOM donde la vista heredera no puede.
 */
function markFieldsForDictation() {
    for (const selector of DICTATION_FIELD_SELECTORS) {
        const fields = document.querySelectorAll(selector);
        for (const field of fields) {
            if (!field.hasAttribute("data-runonweb-dictation")) {
                field.setAttribute("data-runonweb-dictation", "true");
                console.info(`[runonweb] Marked field for dictation: ${selector}`);
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Integración con el webclient: Discuss composer
// ──────────────────────────────────────────────────────────────────────────

/**
 * Patch del compositor de Discuss para añadir el botón de dictado.
 */
export function patchDiscussComposer() {
    // Buscar el composer actual y añadir el botón
    const composerEls = document.querySelectorAll(".o-mail-Composer, .o-mail-Composer-input");
    for (const composerEl of composerEls) {
        if (!composerEl._dictationService) {
            initDiscussDictation(composerEl);
        }
    }
}

/**
 * Patch de campos marcados con data-runonweb-dictation="true".
 */
export function patchMarkedFields() {
    const fieldEls = document.querySelectorAll("[data-runonweb-dictation='true']");
    for (const fieldEl of fieldEls) {
        initMarkedFieldDictation(fieldEl);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. Inicialización al cargar el webclient
// ──────────────────────────────────────────────────────────────────────────
function initDictationIntegration() {
    console.info("[runonweb] Initializing dictation integration");

    // Mark fields for dictation via selectors (producer for DOM attribute)
    markFieldsForDictation();

    // Patch existing composers
    patchDiscussComposer();

    // Observe for new composers (MutationObserver)
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const composerEl = node.querySelector
                            ? node.querySelector(".o-mail-Composer, .o-mail-Composer-input")
                            : null;
                        if (composerEl && !composerEl._dictationService) {
                            initDiscussDictation(composerEl);
                        }
                        // Also check marked fields
                        const fields = node.querySelectorAll
                            ? node.querySelectorAll("[data-runonweb-dictation='true']")
                            : [];
                        for (const field of fields) {
                            initMarkedFieldDictation(field);
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
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
