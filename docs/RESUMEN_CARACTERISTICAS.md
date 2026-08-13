# OdooClaw — Resumen de características (13-08-2026)

Estado verificado: **PRODUCCIÓN** = desplegado y probado en el stack N100 (13-08).
Todas las cifras provienen de benchmarks internos documentados (NRA-*).

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

## 2. Modelo de IA (OdooClaw Light 1.2B v8)

| Característica | Detalle | Estado |
|---|---|---|
| Base | Liquid AI LFM2.5-1.2B-Instruct | — |
| Fine-tune | 26.968 ejemplos (dataset v11): conversación real de empresa, typos, destructivos, fuera de scope | — |
| Gate calidad | 19/20 conversación real + 6/6 creación (bench_conversacion_real.py) | Verificado |
| Formatos | GGUF (Q4_K_M) + MLX 4-bit + Ollama Modelfile | Publicado HF |
| Inferencia | llama.cpp (Linux) / oMLX (Apple) | Producción |
| Rendimiento | ~23-72 tok/s según hardware (N100 → .24 620 tok/s CUDA) | Medido |
| Aceleración | n-gram speculativo n-max=16: **+49%** tok/s (NRA-541) | Verificado |
| Prompt de inferencia | EN INGLÉS (alineado con la distribución de entrenamiento) | 13-08 |

## 3. Herramientas MCP (134 tools, 5 servidores)

| Servidor | Tools | Descripción |
|---|---|---|
| odoo-mcp | 124 | ORM granular: search/read/create/write + operaciones de negocio |
| ocr-invoice | 4 | Facturas/expensas: extract + create vendor bill/employee expense/mileage |
| whisper-stt | 2 | Transcripción de notas de voz |
| edge-tts | 2 | Síntesis de voz |
| rlm-utils | 2 | Compresión/consulta de contexto (Map-Reduce) |

### Selección de herramientas (retrieval)
- Inyección de **top-3-5 tools** (~245 tokens) en vez de las 134 completas (~3.800).
- Routing por intención: conteo → `odoo_search`; búsqueda por nombre →
  `find_partner`; saldo/deuda → `ar_ap_aging`; creación → `odoo_create_*`;
  soporte → helpdesk; documentos → ocr-invoice.
- **Defensa anti-alucinación**: tool calls fuera del set ofrecido se rechazan y se
  realimentan al modelo para reintento; normalización `_`/`-` de nombres.
- **Sanitización de domains** malformados en `odoo_search` (fallback a `[]`).

## 4. OCR de facturas (pipeline 4 capas)

| Capa | Función | Modelo |
|---|---|---|
| 1. Visión | Extracción de texto/estructura del PDF/imagen | GLM-OCR (default) / PaddleOCR-VL (alternativa) |
| 2. Fiscal | Bloque fiscal determinista (Base/Tipo/IGIC/IVA, reverse charge/exento válido) | Sin modelo (reglas) |
| 3. Cabecera | Datos de proveedor/fecha/ref | LFM2.5-1.2B (oMLX .23:8000) |
| 4. Validación | Aritmética + find_or_create_partner | Reglas |

- Validación real: **15/31 facturas** de clientes (12 fallos = suministros sin
  amount_tax, posible exento; 2 aritmética; 2 a revisión). Los fallos se declaran,
  nunca se inventan.
- E2E verificado 13-08: attachment → JSON estructurado (`INV/2018/0057`, total 541,10 €).

## 5. Memoria y conocimiento

| Sistema | Detalle | Estado |
|---|---|---|
| HOT + COLD | Memoria de sesión + histórica con recall temporal | Producción |
| Estructurada (NRA-511) | Estado de negocio por sesión (partner/empresa/documento/confirmaciones) + perfil largo plazo | Producción |
| Knowledge Base (NRA-515) | SQLite FTS5 con dominio Odoo + retrieval | Producción |
| Recipes | query→tool+args guardados como few-shot (limpiables) | Producción |
| Mnemosyne | Candidato memoria NextGen (NAS :8090) | Evaluación |

## 6. Seguridad

| Mecanismo | Detalle |
|---|---|
| Herencia de permisos | El agente asume los permisos del usuario (Security Rights + Record Rules) |
| ToolGuard | Validación de esquema + gating de operaciones destructivas + allowlist dinámica desde ir.model |
| Reply tokens | Token single-use TTL 300s para respuestas solicitadas |
| Authorize | IP allowlist + token compartido (default-deny) en endpoints internos |
| Routing privado | Replies 1:1 en canales compartidos (sin fuga entre usuarios) |
| Contexto segregado | Memoria independiente por canal/usuario |

## 7. Instalación y despliegue

| Vía | Detalle |
|---|---|
| Instalador one-shot | `scripts/setup-local.sh`: llama.cpp (Linux) / oMLX (Apple) + descarga HF + config gateway |
| Docker (doodba) | Stack completo: Odoo + gateway + postgres + redis + MCP servers |
| Hardware mínimo | Cualquier VPS 1 vCPU; referencia N100 14 W (Odoo 18 + gateway + modelos juntos) |
| MCP source | Montado desde NAS (cambios sin rebuild de imagen) |

## 8. Verificación 13-08 (stack N100 desde cero)

- Odoo 18 + **91 módulos** (sale_management, account, purchase, stock, project, crm).
- Gateway :18790 (134 tools, 5 MCP), Odoo :18069, LLM v8 :8084, visión :8093.
- E2E: "¿cuántos clientes?" → `odoo_search(domain=[], res.partner)` → número REAL de BD.
- "saldo" → `ar_ap_aging`; "busca Acme" → `find_partner` (honesto si no existe).
- OCR E2E: factura → JSON estructurado. Gate conversación: 17/20 (85%).

## 9. Repos y recursos

- github.com/nicolasramos/odooclaw — código del gateway
- github.com/nicolasramos/odooclaw-doodba — stack de despliegue
- github.com/nicolasramos/odoo-addons — módulos Odoo (account_dynamic_rules, mail_bot_odooclaw)
- HF: nicolasramos/odooclaw-light-1.2b-ft (GGUF) y -mlx
- Browser Copilot: Firefox Add-ons + Chrome Web Store
- Web: nramos.dev · Contacto: hola@nicolasramos.es
