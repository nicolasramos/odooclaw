# OdooClaw — Resumen de características (13-08-2026)

Estado verificado: **PRODUCCIÓN** = desplegado y probado en el stack N100 (13-08).
Todas las cifras provienen de benchmarks internos documentados (NRA-*) o de
validaciones reales; ninguna se ha inventado.

## 1. Núcleo

| Característica | Detalle | Estado |
|---|---|---|
| Motor | Go, binario único autocontenido (fork de PicoClaw/Sipeed) | Producción |
| Huella | < 10 MB RAM, arranque < 1 s | Producción |
| Portabilidad | x86, ARM, RISC-V | Producción |
| Licencia | MIT | — |
| Odoo soportado | 16 / 17 / 18 (NUNCA 14 para el bot) | Producción |
| Comunicación | Webhooks asíncronos (fire-and-forget), no bloquea workers | Producción |
| Canal | Odoo Discuss: DM + menciones en canal (configurable) | Producción |
| Multi-DB | Routing determinista por DB (ODOOCLAW_CHANNELS_ODOO_TARGET_DB) | Producción |
| Identidad de contexto | sender_id/company del usuario propagados a odoo-mcp (incluye alias de servidor) | Producción |

## 2. Modelo de IA (OdooClaw Light 1.2B v8)

| Característica | Detalle | Estado |
|---|---|---|
| Base | Liquid AI LFM2.5-1.2B-Instruct | — |
| Fine-tune | 26.968 ejemplos (dataset v11): conversación real de empresa, typos, destructivos, fuera de scope | — |
| Gate calidad | **19/20** conversación real (umbral ≥17/20 = 85%) + **6/6** creación (bench_conversacion_real.py) | Verificado |
| Formato tool calls | **TEXTO** (`HERRAMIENTAS DISPONIBLES`) — independiente del runtime; inyectado con `prompt_tools_in_text: true` | 13-08 |
| Formatos | GGUF (Q4_K_M) + MLX 4-bit + Ollama Modelfile | Publicado HF |
| Inferencia | llama.cpp (Linux) / oMLX (Apple) | Producción |
| Rendimiento | ~23-72 tok/s según hardware (N100 → .24 620 tok/s CUDA) | Medido |
| Aceleración | n-gram speculativo n-max=16: **+49%** tok/s (NRA-541) | Verificado |
| Prompt de inferencia | EN INGLÉS (alineado con la distribución de entrenamiento) | 13-08 |

### Modelos evaluados y descartados (trazabilidad)

| Candidato | Resultado | Evidencia |
|---|---|---|
| **Cactus Needle v2** (router de tools) | **DESCARTADO** — fine-tune propio (schemas reales MCP, 3ep): **16,7%** (5/30) tool selection vs gate 85%; pre-entrenado 31,2% (10/32); RAM 44 GB vs ~28 MB anunciados | NRA-523 (spike + veredicto) |
| LFM2.5-230M | Descartable para agéntico real (τ² 5.26); solo extracción de datos pura | Análisis candidatos |
| LFM2.5-350M | Solo extracción pura; no aguanta historial conversacional | Análisis candidatos + LFM25-12B note |
| Qwen2.5-Coder-1.5B (V24/V25/V26) | Superado por LFM2.5-1.2B v8 (gate conversación real) | Datasheet V25, NRA-393 |
| LFM2.5-2.6B | Candidato PRO pero 17-52 s en N100 y 1.6 GB → 1.2B v8 es el punto dulce (4.9-10.5 s, 698 MB) | LFM25-12B note |
| MTP / Engram (aceleración) | DESCARTADOS — exclusivos de qwen3 / Cactus, no existen para lfm2 en llama.cpp | NRA-541 |

### Visión (OCR)

| Modelo | Uso | Estado |
|---|---|---|
| `odooclaw-vision` (GLM-OCR) | Visión por defecto del pipeline (GGUF Q5_K_M + mmproj) | Producción |
| `odooclaw-vision-mlx` | Conversión MLX publicada 12-08 (NRA-542 DONE, verificado load+generate 0.21s) | Publicado HF |
| PaddleOCR-VL | Alternativa intercambiable (7/31 vs GLM-OCR 15/31 — decisión por datos) | Alternativa |

## 3. Herramientas MCP (134 tools, 5 servidores)

| Servidor | Tools | Descripción |
|---|---|---|
| odoo-mcp | 124 | ORM granular: search/read/create/write + operaciones de negocio |
| ocr-invoice | 4 | Facturas/expensas: extract + create vendor bill/employee expense/mileage |
| whisper-stt | 2 | Transcripción de notas de voz |
| edge-tts | 2 | Síntesis de voz |
| rlm-utils | 2 | Compresión/consulta de contexto (Map-Reduce) |

### Selección de herramientas (retrieval)
- Inyección de **top-3-5 tools** (~245 tokens) en vez de las 134 completas
  (~14.000 tokens; ~3.800 medidos ya para 63 tools — NRA-513).
- Routing por intención: conteo → `odoo_search`; búsqueda por nombre →
  `find_partner`; saldo/deuda → `ar_ap_aging`; creación → `odoo_create_*`;
  soporte → helpdesk; documentos → ocr-invoice.
- **Defensa anti-alucinación**: tool calls fuera del set ofrecido se rechazan y se
  realimentan al modelo para reintento; normalización `_`/`-` de nombres.
- **Sanitización de domains** malformados en `odoo_search` (fallback a `[]`).
- Validación de campos en `odoo_read`/`odoo_search_read` contra `ir.model.fields`
  antes de la llamada RPC (NRA-496, GH #57).

## 4. OCR de facturas (pipeline 4 capas)

| Capa | Función | Modelo |
|---|---|---|
| 1. Visión | Extracción de texto/estructura del PDF/imagen | GLM-OCR (default) / PaddleOCR-VL (alternativa) |
| 2. Fiscal | Bloque fiscal determinista (Base/Tipo/IGIC/IVA, reverse charge/exento válido) | **Sin modelo** (reglas) |
| 3. Cabecera | Datos de proveedor/fecha/ref | LFM2.5-1.2B (oMLX .23:8000) |
| 4. Validación | Aritmética + find_or_create_partner | Reglas |

- Validación real: **15/31 facturas** de clientes (12 fallos = suministros sin
  amount_tax, posible exento; 2 aritmética; 2 a revisión). Los fallos se declaran,
  nunca se inventan.
- E2E verificado 13-08: attachment → JSON estructurado (`INV/2018/0057`, total 541,10 €).
- Validación producción 6/6 (NRA-442) con texto-capa-primero.

## 5. Memoria y conocimiento

| Sistema | Detalle | Estado |
|---|---|---|
| HOT + COLD | Memoria de sesión + histórica con recall temporal | Producción |
| Estructurada (NRA-511) | Estado de negocio por sesión (partner/empresa/documento/confirmaciones) + perfil largo plazo (preferencias, empresa) | Producción |
| Knowledge Base (NRA-515) | SQLite FTS5 con dominio Odoo + retrieval + aliases | Producción |
| Recipes | query→tool+args guardados como few-shot (limpiables) | Producción |
| Mnemosyne (NAS :8090) | Evaluado como capa COLD semántica — recomendación: híbrido SQLite (HOT) + Mnemosyne (COLD) | Evaluación (NRA-511) |

## 6. Mejora continua del agente

| Mecanismo | Detalle | Estado |
|---|---|---|
| Dataset builder reproducible (NRA-512) | repo → parser → tool metadata → JSONL + validador + orquestador; cambiar una tool → regenerar dataset | Producción |
| Contexto tools < 1K tokens (NRA-513) | Retrieval top-3-5 (~245 tokens) medido; compresión/truncado de schemas | Producción (parcial) |
| Retrieval por intención | count/find/balance/helpdesk/ocr → herramientas específicas | Producción |
| Rechazo de alucinaciones | Tool calls no ofrecidos → rechazo + realimentación al modelo | Producción |
| Loops QA→dev→judge | Autopilots Multica: QA dictamina, dev corrige, judge valida (veredictos documentados) | Proceso |
| Gates de calidad | bench_conversacion_real.py ≥17/20 en cada iteración de prompt/modelo | Proceso |

## 7. Seguridad

| Mecanismo | Detalle |
|---|---|
| Herencia de permisos | El agente asume los permisos del usuario (Security Rights + Record Rules) |
| ToolGuard | Validación de esquema + gating de operaciones destructivas + allowlist dinámica desde ir.model + denied models + escape hatch |
| Reply tokens | Token single-use TTL 300s para respuestas solicitadas |
| Authorize | IP allowlist + token compartido (default-deny) en endpoints internos |
| Routing privado | Replies 1:1 en canales compartidos (sin fuga entre usuarios) |
| Contexto segregado | Memoria independiente por canal/usuario |

## 8. account_dynamic_rules (módulo Odoo)

| Característica | Detalle | Estado |
|---|---|---|
| Reglas dinámicas | Match partner/producto/modo pago/descripción → acciones cuenta/analítica/producto/pago | Producción |
| **tax_ids** (NRA-499) | Many2many a account.tax — impuestos a forzar en la línea | **PR #9 MERGED** |
| **fiscal_position_id** (NRA-499) | Many2one a account.fiscal.position — posición fiscal a aplicar | **PR #9 MERGED** |
| Integración OCR | El JSON del pipeline (tax_percentage) alimenta la regla → Odoo decide el impuesto | Producción |
| Cero hardcode | Sin impuestos concretos en código; solo mecanismo configurable + tests genéricos | Verificado |
| Migraciones | Subtareas NRA-501/502 para Odoo 17 y 16 | Pendiente |

## 9. Instalación y despliegue

| Vía | Detalle |
|---|---|
| Instalador one-shot | `scripts/setup-local.sh`: llama.cpp (Linux) / oMLX (Apple, SIEMPRE MLX) + descarga HF (light + vision, GGUF o MLX según plataforma) + config gateway |
| Docker (doodba) | Stack completo: Odoo + gateway + postgres + redis + MCP servers; `OCR_MODE=pipeline` en imagen |
| Hardware mínimo | Cualquier VPS 1 vCPU; referencia N100 14 W (Odoo 18 + gateway + modelos juntos) |
| MCP source | Montado desde NAS (cambios sin rebuild de imagen) |

## 10. Verificación 13-08 (stack N100 desde cero)

- Odoo 18 + **91 módulos** (sale_management, account, purchase, stock, project, crm).
- Gateway :18790 (134 tools, 5 MCP), Odoo :18069, LLM v8 :8084, visión :8093.
- E2E: "¿cuántos clientes?" → `odoo_search(domain=[], res.partner)` → número REAL de BD.
- "saldo" → `ar_ap_aging`; "busca Acme" → `find_partner` (honesto si no existe).
- OCR E2E: factura → JSON estructurado. Gate conversación: 17/20 (85%) en
  verificación N100; el gate oficial v8 es 19/20 (≥85%).

## 11. Repos y recursos

- github.com/nicolasramos/odooclaw — código del gateway
- github.com/nicolasramos/odooclaw-doodba — stack de despliegue
- github.com/nicolasramos/odooclaw-mcp — servidores MCP empaquetados (2.2.0)
- github.com/nicolasramos/odooclaw-finetuning — pipeline de datasets/entrenamiento
- github.com/nicolasramos/odoo-addons — módulos Odoo (account_dynamic_rules, mail_bot_odooclaw)
- HF: nicolasramos/odooclaw-light-1.2b-ft (GGUF + MLX + Modelfile) y odooclaw-vision(-mlx)
- Browser Copilot: Firefox Add-ons + Chrome Web Store
- Web: nramos.dev · Contacto: hola@nicolasramos.es
