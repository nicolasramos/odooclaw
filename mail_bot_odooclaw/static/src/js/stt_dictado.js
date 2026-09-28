/**
 * stt_dictado.js — Integración de dictado por voz en el webclient de Odoo.
 *
 * Usa runonweb/stt (Whisper) para transcripción local en el navegador.
 * Se integra en:
 *   1. Compositor de Discuss (botón de dictado en el footer)
 *   2. Campos de texto marcados (data-runonweb-dictation="true")
 *
 * API real de la etapa 1:
 *   RunOnWebBridge.getOrCreate()
 *   bridge.getStt({ model, language, ... })
 *   stt.transcribe(audioSamples, options)
 *
 * Modelo default: onnx-community/whisper-tiny (multilingüe, ~75 MB)
 * Alternativas: onnx-community/whisper-base, onnx-community/whisper-small
 */
import { RunOnWebBridge } from "./runonweb_bridge";
import { log } from "@web/utils/logger";

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
        this._bridge = null;
        this._stt = null;
        this._capturing = false;
        this._audioChunks = [];
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
     *   RunOnWebBridge.getOrCreate() -> bridge.getStt() -> stt.load()
     */
    async _ensureModelLoaded() {
        if (!this._bridge) {
            this._bridge = await RunOnWebBridge.getOrCreate();
        }
        if (!this._stt) {
            this._stt = this._bridge.getStt({
                model: STT_MODEL_ID,
                sampleRate: STT_SAMPLE_RATE,
            });
            await this._stt.load();
            log.info(`[runonweb] STT model ${STT_MODEL_ID} loaded`);
        }
    }

    /**
     * Inicia la grabación de audio.
     */
    async startRecording(targetField) {
        try {
            await this._ensureModelLoaded();
            const capture = this._stt.createAudioCapture();

            this._capturing = true;
            this._audioChunks = [];
            this.state = DictationState.LISTENING;
            this._notify(DictationState.LISTENING);

            capture.onAudioChunk((chunk) => {
                this._audioChunks.push(chunk);
            });
            await capture.start({ sampleRate: STT_SAMPLE_RATE });
            log.info("[runonweb] Dictation recording started");
        } catch (error) {
            this.state = DictationState.ERROR;
            this._notify(DictationState.ERROR, "", error.message);
            log.error("[runonweb] Failed to start dictation recording:", error);
            throw error;
        }
    }

    /**
     * Detiene la grabación y transcribe.
     * @returns {Promise<string>} Texto transcrito
     */
    async stopRecording() {
        if (!this._capturing) {
            throw new Error("No recording in progress");
        }

        this.state = DictationState.TRANSCRIBING;
        this._notify(DictationState.TRANSCRIBING);

        try {
            const capture = this._stt._captures.get(STT_MODEL_ID);
            if (capture) {
                capture.stop();
            }

            // Concatenar chunks
            const totalLength = this._audioChunks.reduce((s, c) => s + c.length, 0);
            const allSamples = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of this._audioChunks) {
                allSamples.set(chunk, offset);
                offset += chunk.length;
            }

            // Transcribir usando la API real
            const result = await this._stt.transcribe(allSamples, {
                model: STT_MODEL_ID,
            });

            this.state = DictationState.IDLE;
            this._notify(DictationState.IDLE, result.text);
            log.info(`[runonweb] Dictation result: "${result.text}" (conf: ${result.confidence})`);
            return result.text;
        } catch (error) {
            this.state = DictationState.ERROR;
            this._notify(DictationState.ERROR, "", error.message);
            log.error("[runonweb] Dictation transcription failed:", error);
            throw error;
        } finally {
            this._capturing = false;
            this._audioChunks = [];
        }
    }

    /**
     * Cancela la grabación sin transcribir.
     */
    async cancelRecording() {
        if (!this._capturing) return;
        try {
            const capture = this._stt._captures.get(STT_MODEL_ID);
            if (capture) {
                capture.stop();
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        this._capturing = false;
        this._audioChunks = [];
        this.state = DictationState.IDLE;
        this._notify(DictationState.IDLE);
        log.info("[runonweb] Dictation recording cancelled");
    }

    destroy() {
        this._listeners = [];
        this._bridge = null;
        this._stt = null;
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Integración con el compositor de Discuss
// ──────────────────────────────────────────────────────────────────────────
export function initDiscussDictation(composerEl) {
    if (!composerEl) return;

    // Buscar el textarea del composer
    const textarea = composerEl.querySelector("textarea")
        || composerEl.querySelector("[name='message']")
        || composerEl.querySelector(".o_mail_composer_body textarea");
    if (!textarea) {
        log.warn("[runonweb] No textarea found in Discuss composer");
        return;
    }

    // Buscar el footer del composer
    const footer = composerEl.querySelector(".o_mail_composer_footer")
        || composerEl.querySelector(".o-mail-composer-footer")
        || composerEl.querySelector("[class*='footer']");
    if (!footer) {
        log.warn("[runonweb] No footer found in Discuss composer");
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
                log.error("[runonweb] Dictation error:", error);
                break;
        }
    });

    btn.addEventListener("click", async () => {
        if (isRecording) {
            try {
                const text = await service.stopRecording();
                // Text already inserted via listener
            } catch (e) {
                log.error("[runonweb] Failed to stop dictation:", e);
            }
        } else {
            try {
                await service.startRecording(textarea);
            } catch (e) {
                log.error("[runonweb] Failed to start dictation:", e);
            }
        }
    });

    // Insertar botón en el footer
    footer.appendChild(btn);

    // Guardar referencia para limpieza
    composerEl._dictationService = service;
    composerEl._dictationBtn = btn;

    log.info("[runonweb] Dictation button added to Discuss composer");
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
                log.error("[runonweb] Dictation error:", error);
                break;
        }
    });

    btn.addEventListener("click", async () => {
        if (isRecording) {
            try {
                await service.stopRecording();
            } catch (e) {
                log.error("[runonweb] Failed to stop dictation:", e);
            }
        } else {
            try {
                await service.startRecording(fieldEl);
            } catch (e) {
                log.error("[runonweb] Failed to start dictation:", e);
            }
        }
    });

    wrapper.appendChild(btn);
    fieldEl._dictationService = service;
    fieldEl._dictationBtn = btn;

    log.info(`[runonweb] Dictation button added to field: ${fieldEl.id || fieldEl.className}`);
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
    log.info(`[runonweb] Text inserted at cursor: "${text}"`);
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
    log.info(`[runonweb] Text inserted into field: "${text}"`);
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Exportación
// ──────────────────────────────────────────────────────────────────────────
export { DictationState, STT_MODEL_ID, STT_SAMPLE_RATE };
