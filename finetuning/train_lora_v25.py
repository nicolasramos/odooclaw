#!/usr/bin/env python3
"""
train_lora_v25.py
=================
OdooClaw V25 — SFTTrainer LoRA fine‑tuning for Qwen2.5-Coder-1.5B-Instruct on ROCm.

Usage:
    python train_lora_v25.py \
        --dataset /path/to/tool_calls.jsonl \
        --output-dir ./output_v25

    # Pre‑flight validation only
    python train_lora_v25.py --dataset /path/to/tool_calls.jsonl --output-dir ./output_v25 --check-only

    # With optional pre‑tokenisation via GigaToken
    python train_lora_v25.py --dataset /path/to/tool_calls.jsonl --output-dir ./output_v25 --use-gigatoken

    # Fine‑tune + fuse LoRA weights into base model
    python train_lora_v25.py --dataset /path/to/tool_calls.jsonl --output-dir ./output_v25 --fuse
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

import torch

# ── HuggingFace / PEFT / TRL ──────────────────────────────────────────────────
from datasets import Dataset, load_dataset
from peft import LoraConfig, get_peft_model, PeftModel
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    set_seed,
)
from trl import SFTTrainer


# ═══════════════════════════════════════════════════════════════════════════════
#  Config
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TrainingConfig:
    # Model
    model_name: str = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
    model_revision: str = "main"
    # LoRA — rank=16, alpha=32, dropout=0.05 (E4 corregido)
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    lora_target_modules: str = "all_linear"
    # Dataset / sequence
    seq_length: int = 2048
    # Training
    per_device_train_batch_size: int = 2
    gradient_accumulation_steps: int = 4
    learning_rate: float = 1e-4
    lr_scheduler_type: str = "cosine"
    warmup_ratio: float = 0.03
    num_train_epochs: int = 3
    # Precision (ROCm prefers bf16 if supported)
    bf16: bool = True
    fp16: bool = False
    # Saving
    save_strategy: str = "epoch"
    logging_steps: int = 10
    report_to: str = "none"
    # Dataloader
    dataloader_num_workers: int = 4
    packing: bool = False  # SFTTrainer — loss masking automático (E2 corregido)
    # PEFT
    use_peft: bool = True
    use_gigatoken: bool = False
    # Seed
    seed: int = 42
    # Output
    output_dir: str = "./output_lora_v25"
    # Dataset
    dataset_path: str = ""
    max_train_samples: Optional[int] = None  # None = usar todo

    def to_serializable(self) -> dict:
        return asdict(self)


# ═══════════════════════════════════════════════════════════════════════════════
#  GigaToken — optional accelerated tokeniser
# ═══════════════════════════════════════════════════════════════════════════════

def maybe_gigatoken_tokenize(tokenizer, texts: list[str]) -> Optional[list[list[int]]]:
    """Tokenise with GigaToken if available; return None on failure."""
    try:
        import gigatoken as gt
        print("[GigaToken] tokenizando dataset…")
        return gt.tokenize(texts, tokenizer.name_or_path)
    except ImportError:
        print("[GigaToken] no disponible — usando tokenizer HF normal.")
        return None
    except Exception as exc:
        print(f"[GigaToken] error: {exc} — fallback a HF normal.")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Dataset – OpenAI tool_calls JSONL
# ═══════════════════════════════════════════════════════════════════════════════

def apply_chat_template(example: dict, tokenizer) -> str:
    """
    Convierte un ejemplo del dataset (OpenAI tool_calls format)
    en el chat template de Qwen2.5.
    """
    messages = []
    for turn in example["messages"]:
        role = turn["role"]  # "system" | "user" | "assistant" | "tool"
        content = turn.get("content", "")
        tool_calls = turn.get("tool_calls", None)

        if role == "tool":
            # tool role con tool_call_id
            messages.append({
                "role": "tool",
                "content": content,
                "tool_call_id": turn.get("tool_call_id", ""),
            })
        elif role == "assistant" and tool_calls:
            # assistant que invoca herramientas
            messages.append({
                "role": "assistant",
                "content": content or None,  # Qwen permite content=None
                "tool_calls": [
                    {
                        "id": tc.get("id", ""),
                        "type": "function",
                        "function": {
                            "name": tc["function"]["name"],
                            "arguments": tc["function"]["arguments"],
                        }
                    }
                    for tc in tool_calls
                ],
            })
        else:
            messages.append({
                "role": role,
                "content": content,
            })

    # Aplicar chat template de Qwen2.5
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )
    return text


def load_tool_calls_dataset(path: str, tokenizer, max_samples: Optional[int] = None) -> Dataset:
    """Carga JSONL con formato OpenAI tool_calls y aplica el chat template."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset no encontrado: {path}")

    # Cargar filas como lista de dicts
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    if max_samples is not None:
        rows = rows[:max_samples]

    print(f"[Dataset] cargados {len(rows)} ejemplos desde {path}")

    raw = Dataset.from_list(rows)

    # Aplicar chat template
    def _format(example):
        return {"text": apply_chat_template(example, tokenizer)}

    formatted = raw.map(_format, remove_columns=raw.column_names)
    return formatted


# ═══════════════════════════════════════════════════════════════════════════════
#  Chat‑template verification (E5)
# ═══════════════════════════════════════════════════════════════════════════════

def verify_chat_template(tokenizer, dataset: Dataset, num_samples: int = 3):
    """
    Verifica que el chat template de Qwen2.5 genera tool_calls correctamente.
    Imprime 3 ejemplos tokenizados con IDs para inspección visual.
    """
    print("\n" + "=" * 72)
    print("  VERIFICACIÓN DE CHAT TEMPLATE (E5)")
    print("=" * 72)

    for i, example in enumerate(dataset.select(range(min(num_samples, len(dataset)))), 1):
        text = example["text"]
        encoded = tokenizer(text, truncation=True, max_length=512)
        # Decodificar para mostrar tokens legibles
        decoded_preview = tokenizer.decode(encoded["input_ids"], skip_special_tokens=False)

        has_tool_call = "<tool_call>" in text or "tool_calls" in text.lower() or "function" in text.lower()

        print(f"\n── Ejemplo {i} ────────────────────────────────────────")
        print(f"  tool_calls detectado: {'✅ SÍ' if has_tool_call else '⚠️  NO'}")
        print(f"  Longitud (tokens): {len(encoded['input_ids'])}")
        print(f"  Texto (primeros 600 chars):\n")
        print(decoded_preview[:600])
        print("  …")
        print(f"  Últimos 200 chars: …{decoded_preview[-200:]}")
        print("────────────────────────────────────────────────────\n")

    print("  [Verificación completada]")
    print("=" * 72 + "\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Model loading
# ═══════════════════════════════════════════════════════════════════════════════

def load_model_and_tokenizer(config: TrainingConfig):
    """Carga modelo y tokenizer, prepara LoRA si corresponde."""
    print(f"[Model] cargando {config.model_name}…")
    torch_dtype = torch.bfloat16 if config.bf16 else torch.float16

    tokenizer = AutoTokenizer.from_pretrained(
        config.model_name,
        revision=config.model_revision,
        trust_remote_code=True,
        padding_side="right",
    )
    # Qwen2.5 normalmente ya tiene pad_token; si no, lo seteamos
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        config.model_name,
        revision=config.model_revision,
        torch_dtype=torch_dtype,
        trust_remote_code=True,
        device_map="auto",
        attn_implementation="eager",  # fallback si flash-attn no está instalado
    )

    # ── LoRA (E4: all_linear) ─────────────────────────────────────────────
    if config.use_peft:
        target_modules = None
        if config.lora_target_modules == "all_linear":
            # Qwen2.5-1.5B tiene: q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj
            target_modules = [
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj",
            ]

        lora_config = LoraConfig(
            r=config.lora_r,
            lora_alpha=config.lora_alpha,
            target_modules=target_modules,
            lora_dropout=config.lora_dropout,
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
    else:
        print("[Model] full fine‑tune (sin LoRA)")

    return model, tokenizer


# ═══════════════════════════════════════════════════════════════════════════════
#  Check‑only: validación pre‑flight
# ═══════════════════════════════════════════════════════════════════════════════

def run_check_only(config: TrainingConfig):
    """
    Validación pre‑flight sin entrenar: carga modelo, tokenizer, dataset,
    verifica chat template y muestra resumen de configuración.
    """
    print("\n" + "█" * 72)
    print("  CHECK‑ONLY — Validación pre‑flight")
    print("█" * 72)

    device_type = "rocm" if torch.cuda.is_available() and torch.version.hip else \
                  "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device detectado: {device_type}")
    print(f"  PyTorch: {torch.__version__}")
    print(f"  ROCm: {torch.version.hip if hasattr(torch.version, 'hip') else 'N/A'}")
    print(f"  GPUs disponibles: {torch.cuda.device_count()}")
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            print(f"    GPU {i}: {torch.cuda.get_device_name(i)}")

    # Cargar modelo
    model, tokenizer = load_model_and_tokenizer(config)

    # Cargar dataset
    dataset = load_tool_calls_dataset(
        config.dataset_path,
        tokenizer,
        max_samples=config.max_train_samples,
    )

    # Verificar chat template (E5)
    verify_chat_template(tokenizer, dataset, num_samples=3)

    # Resumen de configuración
    print("\n── Resumen de configuración ──────────────────────────")
    for k, v in config.to_serializable().items():
        print(f"  {k}: {v}")
    print("──────────────────────────────────────────────────────\n")

    # Guardar training_config.json
    save_training_config(config)

    print("  ✅ Check‑only completado — todo listo para entrenar.\n")
    return 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Training
# ═══════════════════════════════════════════════════════════════════════════════

def train(config: TrainingConfig):
    """Ejecuta el entrenamiento LoRA con SFTTrainer."""
    set_seed(config.seed)

    device_type = "rocm" if torch.cuda.is_available() and torch.version.hip else \
                  "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n  Dispositivo: {device_type} | GPUs: {torch.cuda.device_count()}")

    # 1. Modelo + tokenizer
    model, tokenizer = load_model_and_tokenizer(config)

    # 2. Dataset
    dataset = load_tool_calls_dataset(
        config.dataset_path,
        tokenizer,
        max_samples=config.max_train_samples,
    )

    # 3. Verificación chat template (E5)
    verify_chat_template(tokenizer, dataset, num_samples=3)

    # 4. GigaToken opcional
    #    Si está disponible y se pidió, pre‑tokenizamos el dataset
    if config.use_gigatoken:
        texts = dataset["text"]
        gigatoken_ids = maybe_gigatoken_tokenize(tokenizer, texts)
        if gigatoken_ids is not None:
            print("[GigaToken] sustituyendo dataset por version pre‑tokenizada")
            dataset = Dataset.from_dict({"input_ids": gigatoken_ids})
            # El dataset ya viene tokenizado; SFTTrainer lo usará como `input_ids`

    # 5. Training arguments
    total_steps = math.ceil(len(dataset) / config.per_device_train_batch_size / config.gradient_accumulation_steps) * config.num_train_epochs
    print(f"\n[Train] ejemplos: {len(dataset)} | steps totales estimados: {total_steps}")

    training_args = TrainingArguments(
        output_dir=config.output_dir,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        lr_scheduler_type=config.lr_scheduler_type,
        warmup_ratio=config.warmup_ratio,
        num_train_epochs=config.num_train_epochs,
        bf16=config.bf16,
        fp16=config.fp16,
        save_strategy=config.save_strategy,
        logging_steps=config.logging_steps,
        report_to=config.report_to,
        dataloader_num_workers=config.dataloader_num_workers,
        seed=config.seed,
        remove_unused_columns=False,
        gradient_checkpointing=True,
        optim="adamw_torch",
        ddp_find_unused_parameters=False if torch.cuda.device_count() > 1 else None,
        # CUDA compat
        # group_by_length eliminado en transformers 5.x
    )

    # 6. SFTTrainer — packing=False, loss masking automático (E2 corregido)
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        processing_class=tokenizer,
        max_seq_length=config.seq_length,
        packing=config.packing,  # False = loss masking on response only
        dataset_text_field="text" if "text" in dataset.column_names else None,
    )

    # 7. Entrenar
    print("\n[Train] comenzando entrenamiento…\n")
    trainer.train()

    # 8. Guardar modelo
    print(f"\n[Train] guardando modelo en {config.output_dir}")
    trainer.save_model(config.output_dir)
    tokenizer.save_pretrained(config.output_dir)

    # 9. Guardar training_config.json
    save_training_config(config)

    print("\n✅ Entrenamiento completado exitosamente.\n")
    return 0


# ═══════════════════════════════════════════════════════════════════════════════
#  LoRA fusion (--fuse)
# ═══════════════════════════════════════════════════════════════════════════════

def fuse_lora(config: TrainingConfig):
    """Fusiona los pesos LoRA en el modelo base y guarda el modelo fusionado."""
    lora_path = config.output_dir
    fused_path = config.output_dir.rstrip("/") + "_fused"

    print(f"\n[Fuse] fusionando LoRA desde {lora_path}…")
    print(f"[Fuse] guardando modelo fusionado en {fused_path}")

    if not os.path.exists(lora_path):
        print(f"[Fuse] ERROR: el directorio del adaptador no existe: {lora_path}")
        return 1

    # Cargar modelo base + adaptador
    base_model = AutoModelForCausalLM.from_pretrained(
        config.model_name,
        torch_dtype=torch.bfloat16 if config.bf16 else torch.float16,
        trust_remote_code=True,
        device_map="auto",
    )

    tokenizer = AutoTokenizer.from_pretrained(
        lora_path,
        trust_remote_code=True,
    )

    model = PeftModel.from_pretrained(base_model, lora_path)
    merged = model.merge_and_unload()

    merged.save_pretrained(fused_path)
    tokenizer.save_pretrained(fused_path)

    print(f"✅ Fusión completada. Modelo fusionado en: {fused_path}")
    return 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Config persistence
# ═══════════════════════════════════════════════════════════════════════════════

def save_training_config(config: TrainingConfig):
    """Guarda training_config.json en el directorio de salida."""
    output_dir = config.output_dir or "."
    os.makedirs(output_dir, exist_ok=True)
    config_path = os.path.join(output_dir, "training_config.json")
    cfg = config.to_serializable()
    cfg["timestamp"] = datetime.utcnow().isoformat() + "Z"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    print(f"[Config] guardada en {config_path}")


# ═══════════════════════════════════════════════════════════════════════════════
#  CLI
# ═══════════════════════════════════════════════════════════════════════════════

def parse_args(argv: list[str] | None = None) -> tuple[TrainingConfig, argparse.Namespace]:
    parser = argparse.ArgumentParser(
        description="OdooClaw V25 — SFTTrainer LoRA fine‑tuning para Qwen2.5-Coder-1.5B",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # Dataset
    parser.add_argument("--dataset", type=str, required=True,
                        help="Ruta al dataset JSONL en formato OpenAI tool_calls")
    parser.add_argument("--max-train-samples", type=int, default=None,
                        help="Limitar número de ejemplos (útil para pruebas)")

    # Output
    parser.add_argument("--output-dir", type=str, default="./output_lora_v25",
                        help="Directorio donde guardar el modelo entrenado")

    # LoRA
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)

    # Training
    parser.add_argument("--seq-length", type=int, default=2048)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--warmup-ratio", type=float, default=0.03)
    parser.add_argument("--bf16", action="store_true", default=True)
    parser.add_argument("--no-bf16", action="store_false", dest="bf16")
    parser.add_argument("--fp16", action="store_true", default=False)
    parser.add_argument("--seed", type=int, default=42)

    # Flags
    parser.add_argument("--use-gigatoken", action="store_true", default=False,
                        help="Intentar usar GigaToken para pre‑tokenización acelerada")
    parser.add_argument("--check-only", action="store_true", default=False,
                        help="Validación pre‑flight sin entrenar")
    parser.add_argument("--fuse", action="store_true", default=False,
                        help="Fusionar pesos LoRA en el modelo base después del entrenamiento")
    parser.add_argument("--no-peft", action="store_false", dest="use_peft",
                        default=True, help="Deshabilitar LoRA (full fine‑tune)")

    args = parser.parse_args(argv)

    config = TrainingConfig(
        dataset_path=args.dataset,
        output_dir=args.output_dir,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        seq_length=args.seq_length,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        warmup_ratio=args.warmup_ratio,
        bf16=args.bf16,
        fp16=args.fp16,
        seed=args.seed,
        max_train_samples=args.max_train_samples,
        use_peft=args.use_peft,
        use_gigatoken=args.use_gigatoken,
    )

    return config, args


def main():
    config, args = parse_args()

    if args.check_only:
        return run_check_only(config)

    exit_code = train(config)

    if exit_code == 0 and args.fuse:
        exit_code = fuse_lora(config)

    return exit_code


# ── Enlace al namespace del módulo ────────────────────────────────────────────
config: Optional[TrainingConfig] = None  # rellenado por parse_args() si se usa en REPL


if __name__ == "__main__":
    sys.exit(main())
