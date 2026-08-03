#!/usr/bin/env python3
"""
train_unsloth_v25d.py — Training V25d con Unsloth + Qwen2.5-Coder-0.5B-Instruct.

Uso:
  python3 train_unsloth_v25d.py --dataset datasets/v25c_train.jsonl --output-dir /home/nramos/models/odooclaw-v25d
"""
import argparse
import json
import os
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from trl import SFTConfig, SFTTrainer
from unsloth import FastLanguageModel, is_bfloat16_supported
from unsloth.chat_templates import train_on_responses_only


def parse_args():
    parser = argparse.ArgumentParser(description="V25d — Unsloth LoRA fine-tuning")
    parser.add_argument("--dataset", required=True, help="Dataset JSONL path")
    parser.add_argument("--output-dir", default="./output_v25d", help="Output directory")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-Coder-0.5B-Instruct")
    parser.add_argument("--seq-length", type=int, default=2048)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accum", type=int, default=2)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--wandb", action="store_true", default=False, help="Enable wandb logging")
    parser.add_argument("--fuse", action="store_true", default=True, help="Fuse LoRA after training")
    return parser.parse_args()


def main():
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    # ── Wandb ──────────────────────────────────────────────────────────────
    if args.wandb:
        import wandb
        run_name = f"odooclaw-v25d-{args.base_model.split('/')[-1]}"
        wandb.init(project="odooclaw", name=run_name, config=vars(args))
        print(f"[WandB] Run: {run_name} — https://wandb.ai/nramos/odooclaw")

    # ── Modelo ────────────────────────────────────────────────────────────
    print(f"[Model] Cargando {args.base_model}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model,
        max_seq_length=args.seq_length,
        dtype=None,  # auto-detect
        load_in_4bit=False,
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_r * 2,
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    model.print_trainable_parameters()

    # ── Chat template ─────────────────────────────────────────────────────
    # Dataset ya tiene el template aplicado (text field), no necesitamos get_chat_template
    if tokenizer.pad_token is None or tokenizer.pad_token == "<|PAD_TOKEN|>":
        tokenizer.pad_token = "<|im_end|>"
    # Fijar eos_token ANTES de SFTTrainer (TRL 1.9.x valida que exista en vocab)
    tokenizer.eos_token = "<|im_end|>"
    tokenizer.eos_token_id = 151645

    # ── Dataset ───────────────────────────────────────────────────────────
    dataset = load_dataset("json", data_files=args.dataset, split="train")
    print(f"[Dataset] {len(dataset)} ejemplos")

    # ── Training ──────────────────────────────────────────────────────────
    training_args = SFTConfig(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        bf16=is_bfloat16_supported(),
        fp16=not is_bfloat16_supported(),
        logging_steps=10,
        save_strategy="epoch",
        report_to="wandb" if args.wandb else "none",
        run_name=f"v25d-{args.base_model.split('/')[-1]}" if args.wandb else None,
        max_length=args.seq_length,
        packing=False,
        dataset_text_field="text",
        remove_unused_columns=False,
        gradient_checkpointing=True,
        optim="adamw_8bit",
        seed=42,
    )

    trainer = SFTTrainer(
        model=model,
        processing_class=tokenizer,
        args=training_args,
        train_dataset=dataset,
    )
    # Unsloth's train_on_responses_only expects trainer.tokenizer
    trainer.tokenizer = tokenizer

    # ── Loss masking en respuestas (CLAVE) ────────────────────────────────
    trainer = train_on_responses_only(
        trainer,
        instruction_part="<|im_start|>user",
        response_part="<|im_start|>assistant",
        tokenizer=tokenizer,
    )

    # train_on_responses_only cambia eos_token a <EOS_TOKEN> que no existe en Qwen2.5
    # Lo restauramos al token correcto
    tokenizer.eos_token = "<|im_end|>"
    tokenizer.eos_token_id = 151645
    trainer.processing_class.eos_token = "<|im_end|>"
    trainer.processing_class.eos_token_id = 151645

    # ── Entrenar ──────────────────────────────────────────────────────────
    print("\n[Train] Comenzando entrenamiento...\n")
    trainer.train()

    # ── Guardar ───────────────────────────────────────────────────────────
    print(f"\n[Save] Guardando modelo en {args.output_dir}")
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    # ── Fusión ────────────────────────────────────────────────────────────
    if args.fuse:
        fused_dir = args.output_dir.rstrip("/") + "_fused"
        print(f"[Fuse] Fusionando LoRA en {fused_dir}...")
        model.save_pretrained_merged(fused_dir, tokenizer, save_method="16bit")
        print(f"✅ Modelo fusionado en: {fused_dir}")

    print("\n✅ Entrenamiento completado exitosamente.")


if __name__ == "__main__":
    main()
