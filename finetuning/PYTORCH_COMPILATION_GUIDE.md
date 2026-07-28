# PyTorch ROCm Compilation Guide — Bosgame (Strix Halo, gfx1151)

## Contexto

Los wheels pre-compilados de PyTorch (TheRock, oficiales, nightlies) tienen code objects inválidos para gfx1151.
`hipcc` nativo SÍ produce kernels funcionales. Solución: compilar PyTorch desde fuente.

## Requisitos

- Docker: `kyuz0/amd-strix-halo-toolboxes:rocm-7.2.4` (ya verificado, ROCm 7.2.4 toolchain)
- Python 3.12+ dentro del Docker
- 128GB RAM, 16 núcleos → MAX_JOBS=12 para evitar OOM en linking

## Paso a paso

### 1. Iniciar Docker con GPU

```bash
docker run -it --rm \
  --device=/dev/kfd \
  --device=/dev/dri \
  --group-add=video \
  --ipc=host \
  --cap-add=SYS_PTRACE \
  --security-opt seccomp=unconfined \
  -v /home/nramos/odooclaw-finetuning:/workspace \
  kyuz0/amd-strix-halo-toolboxes:rocm-7.2.4 \
  bash
```

### 2. Verificar GPU

```bash
rocminfo | grep gfx1151  # Debe aparecer
hipconfig --full          # HIP SDK correcto
```

### 3. Clonar PyTorch (release estable, no main)

```bash
cd /workspace
git clone --recursive https://github.com/pytorch/pytorch -b v2.9.1
cd pytorch
# Actualizar submodules
git submodule sync
git submodule update --init --recursive
```

Usamos **v2.9.1** (release estable, no nightly). Las nightlies tienen el bug de code objects.

### 4. Hipificar

```bash
python3 tools/amd_build/build_amd.py
```

### 5. Compilar

```bash
export ROCM_PATH=/opt/rocm
export PYTORCH_ROCM_ARCH=gfx1151
export USE_ROCM=1
export MAX_JOBS=12
export CMAKE_PREFIX_PATH=${CONDA_PREFIX:-"$(dirname $(which python))/.."}

# Configuración CMake
python3 setup.py develop --cmake-only

# Compilar solo torch_cuda (más rápido)
cmake --build build --target torch_cuda -j$MAX_JOBS 2>&1 | tee /workspace/build_torch_cuda.log

# Si torch_cuda compila bien, instalar todo
python3 setup.py develop 2>&1 | tee /workspace/build_full.log
```

### 6. Sanity check

```python
# test_gpu.py
import torch
print(f"PyTorch: {torch.__version__}")
print(f"ROCm: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    x = torch.ones(3, 3, device="cuda")
    print(f"Tensor en GPU: {x}")
    print(f"Suma: {x.sum()}")
    # Test operación real (matmul)
    a = torch.randn(100, 100, device="cuda")
    b = torch.randn(100, 100, device="cuda")
    c = torch.matmul(a, b)
    print(f"Matmul GPU: {c.shape}")
    print("✅ GPU FUNCIONA")
```

### 7. Instalar dependencias de training

```bash
pip install transformers>=4.57.1 accelerate peft trl datasets safetensors sentencepiece
```

### 8. Probar training

```bash
cd /workspace/odooclaw/finetuning/
python3 train_lora_v25.py --check-only
```

### 9. Training completo

```bash
python3 train_lora_v25.py \
  --train-file /workspace/datasets/v25/train.jsonl \
  --val-file /workspace/datasets/v25/val.jsonl \
  --output-dir /models/odooclaw-v25 \
  --seq-length 2048 \
  --batch-size 2 \
  --grad-accum 4 \
  --lr 1e-4 \
  --num-epochs 1 \
  --verbose
```

## Si la compilación falla

**Error de hipificación**: `python3 tools/amd_build/build_amd.py` puede fallar si falta algún tool.
Solución: `pip install pyyaml typing_extensions`

**Error de CMake**: Verificar que `ROCM_PATH` apunta a `/opt/rocm` (donde está instalado el SDK en el Docker).

**Error de linking (OOM)**: Reducir `MAX_JOBS=8` o `MAX_JOBS=4`.

**Error en test de GPU**: Si `torch.ones(1, device="cuda")` falla, los code objects se compilaron mal.
Verificar `PYTORCH_ROCM_ARCH=gfx1151` (no gfx1150). Hacer `make clean && python3 setup.py clean` y recompilar.

## Referencias

- https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md
- https://rocm.docs.amd.com/projects/radeon-ryzen
- https://github.com/ROCm/ROCm/discussions/5152
