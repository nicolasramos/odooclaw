#!/bin/bash
# run_v25.sh — Pipeline end-to-end OdooClaw V25 Fine-Tuning
# Bosgame (Strix Halo, ROCm 7.2, Radeon 8060S, 128GB RAM)
# Uso: ./run_v25.sh [--check-only|--dataset-only|--no-deploy|--use-gigatoken|--verbose]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${SCRIPT_DIR}/run_v25_${TIMESTAMP}.log"
NAS_PATH="/volume1/development/personal/odooclaw-finetuning"
BOSGAME_PATH="/home/nramos/odooclaw-finetuning"
DATASET_V24_PATH="${BOSGAME_PATH}/datasets/odooclaw-v24"
OUTPUT_PATH="/models/odooclaw-v25"
VERBOSE=false
CHECK_ONLY=false
DATASET_ONLY=false
NO_DEPLOY=false
USE_GIGATOKEN=""
NAS_SYNC=true

# Parse flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        --check-only) CHECK_ONLY=true ;;
        --dataset-only) DATASET_ONLY=true ;;
        --no-deploy) NO_DEPLOY=true ;;
        --use-gigatoken) USE_GIGATOKEN="--use-gigatoken" ;;
        --verbose) VERBOSE=true ;;
        --nas-path) NAS_PATH="$2"; shift ;;
        --bosgame-path) BOSGAME_PATH="$2"; shift ;;
        --help)
            echo "Uso: $0 [--check-only|--dataset-only|--no-deploy|--use-gigatoken|--verbose]"
            echo "  --check-only    Solo validación pre-flight (pasos 1-4)"
            echo "  --dataset-only  Solo regenerar dataset (pasos 1-3)"
            echo "  --no-deploy     Entrenar + fusionar, sin deploy"
            echo "  --use-gigatoken Pre-tokenizar con Gigatoken (6x más rápido)"
            echo "  --verbose       Log detallado"
            exit 0
            ;;
        *) echo "Flag desconocido: $1"; exit 1 ;;
    esac
    shift
done

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
vlog() { $VERBOSE && log "[DEBUG] $*" || true; }
die() { log "[ERROR] $*"; exit 1; }
step_header() { log ""; log "══════════════════════════════════════════════"; log "  PASO $*"; log "══════════════════════════════════════════════"; }

# ─── Prerequisitos ────────────────────────────────────────
log "============================================"
log "  OdooClaw V25 Fine-Tuning Pipeline"
log "  Started: $(date)"
log "  Host: $(hostname 2>/dev/null || echo 'unknown')"
log "============================================"

# Verificar Python y dependencias
python3 -c "import torch; print(f'  PyTorch {torch.__version__}, CUDA available: {torch.cuda.is_available()}, ROCm: {hasattr(torch, \"hip\") and torch.hip.is_available()}')" 2>/dev/null || log "[WARN] No se pudo verificar torch"

# Verificar scripts existen
for script in fix_dataset_v25.py validate_dataset.py train_lora_v25.py; do
    [[ -f "${SCRIPT_DIR}/${script}" ]] || die "${script} no encontrado en ${SCRIPT_DIR}"
done

# ─── PASO 1: Sync dataset desde NAS ──────────────────────
step_header "1: Sync dataset V24 desde NAS"

if $NAS_SYNC; then
    if [[ -d "${NAS_PATH}/datasets/odooclaw-v24" ]]; then
        log "  Syncing dataset desde NAS..."
        mkdir -p "${DATASET_V24_PATH}"
        rsync -avz --progress "${NAS_PATH}/datasets/odooclaw-v24/" "${DATASET_V24_PATH}/" | tee -a "$LOG_FILE"
        log "  ✅ Dataset sync completado"
    else
        log "  [WARN] NAS path ${NAS_PATH}/datasets/odooclaw-v24 no encontrado"
        if [[ -f "${DATASET_V24_PATH}/train.jsonl" ]]; then
            log "  Usando dataset local existente"
        else
            die "Dataset V24 no encontrado en NAS ni local"
        $CHECK_ONLY && log "  [CHECK-ONLY] Simulando sync... OK" || true
    fi
else
    log "  Sync omitido (local)"
fi

# ─── PASO 2: Transformar V24 → V25 ──────────────────────
step_header "2: Transform dataset V24 → V25"

if $CHECK_ONLY; then
    log "  [CHECK-ONLY] python3 ${SCRIPT_DIR}/fix_dataset_v25.py --check"
    python3 "${SCRIPT_DIR}/fix_dataset_v25.py" --check 2>&1 | tee -a "$LOG_FILE"
    log "  ✅ Check de transformación completado"
else
    log "  Transformando dataset..."
    python3 "${SCRIPT_DIR}/fix_dataset_v25.py" \
        --input "${DATASET_V24_PATH}/train.jsonl" \
        --output "${OUTPUT_PATH}/datasets/train.jsonl" \
        --val-output "${OUTPUT_PATH}/datasets/val.jsonl" \
        --manifest "${SCRIPT_DIR}/odooclaw_tool_manifest.json" \
        --negative-ratio 0.09 \
        --destructive-ratio 0.05 \
        --val-split 0.1 \
        --verbose 2>&1 | tee -a "$LOG_FILE"
    log "  ✅ Dataset V25 generado"
fi

$DATASET_ONLY && { log "[DATASET-ONLY] Pipeline detenido después de paso 2"; exit 0; }

# ─── PASO 3: Validar dataset contra manifest ─────────────
step_header "3: Validate dataset manifest"

python3 "${SCRIPT_DIR}/validate_dataset.py" \
    --input "${OUTPUT_PATH}/datasets/train.jsonl" \
    --manifest "${SCRIPT_DIR}/odooclaw_tool_manifest.json" \
    --output-report "${OUTPUT_PATH}/validation_report.md" \
    --verbose 2>&1 | tee -a "$LOG_FILE" || die "❌ Validación del dataset falló"

log "  ✅ Dataset validado contra manifest"

# ─── PASO 4: Verificar chat template ─────────────────────
step_header "4: Verify chat template (pre-flight)"

python3 "${SCRIPT_DIR}/train_lora_v25.py" \
    --train-file "${OUTPUT_PATH}/datasets/train.jsonl" \
    --val-file "${OUTPUT_PATH}/datasets/val.jsonl" \
    --check-only 2>&1 | tee -a "$LOG_FILE" || die "❌ Pre-flight check falló"

log "  ✅ Chat template y pre-flight verification OK"
$CHECK_ONLY && { log "[CHECK-ONLY] Pipeline detenido después de paso 4"; exit 0; }

# ─── PASO 5: Entrenar ────────────────────────────────────
step_header "5: Train LoRA V25"

log "  Iniciando training..."
python3 "${SCRIPT_DIR}/train_lora_v25.py" \
    --train-file "${OUTPUT_PATH}/datasets/train.jsonl" \
    --val-file "${OUTPUT_PATH}/datasets/val.jsonl" \
    --output-dir "${OUTPUT_PATH}/lora-adapter" \
    --base-model "Qwen/Qwen2.5-Coder-1.5B-Instruct" \
    --seq-length 2048 \
    --batch-size 2 \
    --grad-accum 4 \
    --lr 1e-4 \
    --num-epochs 1 \
    ${USE_GIGATOKEN} \
    --verbose 2>&1 | tee -a "$LOG_FILE" || die "❌ Training falló"

log "  ✅ Training completado"

# ─── PASO 6: Fusión LoRA + Base ──────────────────────────
step_header "6: Fuse LoRA adapter + base model"

if [[ -d "${OUTPUT_PATH}/lora-adapter/final" ]]; then
    log "  Fusionando LoRA..."
    python3 "${SCRIPT_DIR}/train_lora_v25.py" \
        --fuse \
        --lora-path "${OUTPUT_PATH}/lora-adapter/final" \
        --output-dir "${OUTPUT_PATH}/fused" \
        --verbose 2>&1 | tee -a "$LOG_FILE" || die "❌ Fusión falló"
    log "  ✅ Fusión completada"
else
    log "  [SKIP] No se encontró adapter final en ${OUTPUT_PATH}/lora-adapter/final"
fi

# ─── PASO 7: Convertir a GGUF ────────────────────────────
step_header "7: Convert to GGUF Q4_K_M"

FUSED_PATH="${OUTPUT_PATH}/fused"
if [[ -d "$FUSED_PATH" ]] && command -v llama.cpp/convert.py &>/dev/null; then
    log "  Convirtiendo a GGUF Q4_K_M..."
    python3 llama.cpp/convert.py "$FUSED_PATH" \
        --outfile "${OUTPUT_PATH}/odooclaw-v25-q4_k_m.gguf" \
        --outtype q4_k_m 2>&1 | tee -a "$LOG_FILE" || log "  [WARN] Conversión GGUF falló"
    log "  ✅ GGUF generado"
elif [[ -d "$FUSED_PATH" ]]; then
    log "  [WARN] llama.cpp/convert.py no encontrado. Conversión manual requerida"
    log "  Usa: python3 llama.cpp/convert.py ${FUSED_PATH} --outfile ${OUTPUT_PATH}/odooclaw-v25-q4_k_m.gguf --outtype q4_k_m"
else
    log "  [SKIP] No hay modelo fusionado para convertir"
fi

# ─── PASO 8: Deploy ──────────────────────────────────────
step_header "8: Deploy to llama-server"

$NO_DEPLOY && { log "[NO-DEPLOY] Deploy omitido. Modelo en: ${OUTPUT_PATH}"; exit 0; }

GGUF_FILE="${OUTPUT_PATH}/odooclaw-v25-q4_k_m.gguf"
if [[ -f "$GGUF_FILE" ]]; then
    MODEL_SIZE=$(du -h "$GGUF_FILE" | cut -f1)
    log "  Deployando modelo (${MODEL_SIZE})..."

    # Detener servidor anterior si existe
    pkill llama-server 2>/dev/null || true
    sleep 1

    # Iniciar nuevo servidor
    nohup llama-server \
        -m "$GGUF_FILE" \
        --host 0.0.0.0 \
        --port 8081 \
        --n-gpu-layers -1 \
        --ctx-size 8192 \
        --batch-size 512 \
        --parallel 1 \
        > "${OUTPUT_PATH}/llama-server.log" 2>&1 &

    LLAMA_PID=$!
    log "  llama-server iniciado (PID: ${LLAMA_PID})"

    # Health check
    sleep 3
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        log "  ✅ Modelo servido en http://0.0.0.0:8081"
    else
        log "  [WARN] Health check falló. Revisar ${OUTPUT_PATH}/llama-server.log"
    fi
else
    log "  [SKIP] GGUF no encontrado en ${GGUF_FILE}"
fi

# ─── FIN ──────────────────────────────────────────────────
log ""
log "============================================"
log "  ✅ Pipeline V25 completado: $(date)"
log "  Log: ${LOG_FILE}"
log "  Output: ${OUTPUT_PATH}"
log "============================================"
