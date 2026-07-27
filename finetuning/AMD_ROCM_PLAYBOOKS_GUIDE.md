# AMD ROCm Playbooks — Guía de Fine-Tuning para OdooClaw V25

**Fuente**: [AMD AI Playbooks](https://developer.amd.com/playbooks/?category=reference&device=halo)
**Repo oficial**: [github.com/amd/playbooks](https://github.com/amd/playbooks)
**Hardware**: Bosgame Strix Halo (Ryzen AI Max+ 395, Radeon 8060S, gfx1151)
**RAM**: 128GB unificada (~96GB para GPU)

## Playbooks relevantes

| Playbook | Ruta en repo | Dificultad | Uso en OdooClaw |
|----------|-------------|------------|-----------------|
| Fine-Tuning LLMs with PyTorch and AMD ROCm | `supplemental/pytorch-finetuning/` | Intermedia | 🥇 Principal (SFTTrainer + TRL) |
| Optimized Fine-tuning with Unsloth | `supplemental/unsloth-llms-finetuning/` | Intermedia | 🥈 Alternativa (si PyTorch no funciona) |
| Fine-tuning LLMs with LLaMA-Factory | `supplemental/llama-factory-finetuning/` | Intermedia | 🥉 Back up |

## ⚠️ Hallazgo CRÍTICO: gfx1151 vs gfx1150

La Radeon 8060S del Strix Halo es **gfx1151**, NO gfx1150. Esto es importante porque:

- **gfx1150** (Radeon 890M en APUs menores) — **no soportado** en ningún wheel
- **gfx1151** (Radeon 8060S en Strix Halo) — **soportado** vía TheRock/ROCm nightlies

Heridia MiMo probó con gfx1150 y por eso falló. La arquitectura correcta es gfx1151.

## Solución: TheRock ROCm Nightlies

TheRock (github.com/ROCm/TheRock) proporciona wheels multi-arquitectura pre-compilados con soporte gfx1151.

### Instalación (NO requiere compilar PyTorz desde fuente)

```bash
# 1. Asegurar kernel reciente (6.15+)
uname -r
# Si es menor, instalar: sudo apt install linux-oem-24.04c

# 2. Crear venv
python3 -m venv odooclaw-train --system-site-packages
source odooclaw-train/bin/activate

# 3. Instalar ROCm SDK con soporte gfx1151
pip install --index-url https://rocm.nightlies.amd.com/whl-multi-arch/ "rocm[device-gfx1151]"

# 4. Instalar PyTorch + torchvision + torchaudio
pip install --index-url https://rocm.nightlies.amd.com/whl-multi-arch/ torch torchvision torchaudio pytorch-triton-rocm numpy

# 5. Verificar
python3 -c "import torch; print(f'ROCm: {torch.cuda.is_available()}, Device: {torch.cuda.get_device_name(0)}, VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB')"

# 6. Instalar dependencias de training
pip install transformers accelerate peft trl datasets safetensors sentencepiece
```

### Alternativa: Unsloth con AMD support

Si PyTorch directo no funciona (e.g. NaN losses conocidos en gfx1151 con Gemma3), probar Unsloth:

```bash
source odooclaw-train/bin/activate
pip install "unsloth[amd] @ git+https://github.com/unslothai/unsloth.git"
```

Referencia: [Unsloth issue #3385](https://github.com/unslothai/unsloth/issues/3385) — NaN losses con Gemma3 en gfx1151, pero Qwen2.5 no reporta ese problema.

### Alternativa: ROCm Docker image

```bash
docker pull rocm/pytorch:rocm6.4.4_ubuntu24.04_py3.12_pytorch_release_2.7.1
```

### Verificación post-instalación

```bash
# GPU detectado
rocm-smi --showmeminfo vram

# PyTorch ve la GPU
python3 -c "
import torch
print(f'PyTorch {torch.__version__}')
print(f'CUDA/ROCm available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'Device: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
"

# Training speed test (subset de validación)
python3 train_lora_v25.py --check-only
```

## Referencias útiles

- [ROCm/TheRock RELEASES.md](https://github.com/ROCm/TheRock/blob/main/RELEASES.md)
- [ROCm/TheRock discussion #655 (gfx1151 wheels)](https://github.com/ROCm/TheRock/discussions/655)
- [ROCm/ROCm discussion #5152 (Strix Halo VRAM)](https://github.com/ROCm/ROCm/discussions/5152)
- [Unsloth issue #3385 (NaN losses gfx1151)](https://github.com/unslothai/unsloth/issues/3385)
- [Strix Halo homelab docs](https://strixhalo-homelab.d7.wtf/AI/AI-Capabilities-Overview)
- [Framework Community PyTorch on Strix Halo](https://community.frame.work/t/pytorch-w-flash-attention-vllm-for-strix-halo/74736)
- [ROCm install guide for Ryzen](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installryz/native_linux/install-pytorch.html)

## Observaciones

### Ventana de memoria unificada
El Strix Halo tiene 128GB de RAM compartida CPU/GPU. PyTorch puede ver solo ~15.5GB inicialmente (limitación del HSA layer). Para training con modelos de 1.5B esto no es problema (cabe en 15.5GB), pero para modelos más grandes puede necesitar ajustes.

### CPU training como respaldo
Si GPU no funciona, el pipeline V25 corre en CPU. Para 28K ejemplos:
- batch=1, seq=512: ~377s/step → inviable
- batch=1, seq=2048: aún más lento
- Recomendado solo para subset de prueba (500 ejemplos)
