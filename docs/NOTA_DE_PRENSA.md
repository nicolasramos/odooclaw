# NOTA DE PRENSA — OdooClaw

**Para publicación inmediata** · 13 de agosto de 2026

---

## OdooClaw: un asistente de IA nativo para Odoo que corre en menos de 10 MB de RAM

*El proyecto open source de Nicolás Ramos lleva la IA conversacional al ERP con un
modelo propio fine-tuneado, pipeline OCR de facturas, memoria estructurada y un
despliegue que cabe en cualquier servidor — incluso en hardware de 10 dólares.*

**Santa Cruz de Tenerife, 13 de agosto de 2026.** — OdooClaw, el asistente de
inteligencia artificial integrado nativamente en Odoo ERP, alcanza su configuración
de producción más completa: un agente que responde en Odoo Discuss, ejecuta
operaciones del ERP con los permisos reales de cada usuario y lo hace con un
consumo de **menos de 10 MB de RAM** y arranque en **menos de 1 segundo**.

OdooClaw nace como un fork profundamente modificado de PicoClaw (Sipeed), escrito
en Go. Su arquitectura de webhooks asíncronos ("fire and forget") libera los
workers de Odoo al instante y su huella mínima permite ejecutarlo en el mismo
servidor del ERP sin impacto en el rendimiento.

### Un modelo propio, entrenado para el negocio real

El corazón del asistente es **OdooClaw Light 1.2B v8**, un modelo de lenguaje
fine-tuneado sobre la base Liquid AI LFM2.5 con **26.968 ejemplos de conversación
real de empresa en español** (saludos, typos, ambigüedades, peticiones
destructivas, fuera de alcance). El modelo supera el gate de calidad interno de
**19/20 casos en conversación real** (umbral mínimo: 17/20, 85%) y **6/6 en
creación de registros**, y se distribuye en formato GGUF y MLX con cuantización
4-bit. Las llamadas a herramientas se entrenan y emiten en formato de texto
(`HERRAMIENTAS DISPONIBLES`), lo que lo hace independiente del runtime de
inferencia.

### Características principales

- **Integración nativa con Odoo 16/17/18** — conversación directa en Odoo Discuss
  (mensajes privados y menciones en canales).
- **134 herramientas MCP granulares** (5 servidores) con herencia de permisos
  nativa: el agente asume los permisos del usuario que pregunta, sin saltarse
  Security Rights ni Record Rules.
- **Retrieval inteligente de herramientas**: en lugar de inyectar las 134 tools
  completas (~14.000 tokens), selecciona las 3-5 relevantes por intención
  (~245 tokens).
- **Pipeline OCR de facturas en 4 capas** (visión → fiscal → cabecera →
  validación), agnóstico al modelo y con capa fiscal 100% determinista sin LLM,
  validado sobre **15/31 facturas reales de clientes**; los fallos se declaran
  para revisión, nunca se inventan.
- **Memoria dual HOT/COLD** + memoria estructurada de sesión (estado de negocio,
  confirmaciones pendientes) + base de conocimiento con dominio Odoo; Mnemosyne
  evaluado como capa de memoria semántica a largo plazo.
- **ToolGuard**: validación de llamadas a herramientas con esquema estricto,
  allowlist dinámica desde `ir.model` y bloqueo de operaciones destructivas.
- **Notas de voz bidireccionales** (transcripción Whisper + síntesis Edge-TTS).
- **Aceleración n-gram speculativa**: +49% de tokens/segundo en generación larga
  (benchmark interno NRA-541, N100).
- **Instalador one-shot** para llama.cpp (Linux) y oMLX (Apple Silicon) con
  descarga automática de modelos desde Hugging Face.
- **Multi-database routing**, contexto segregado por usuario/canal y replies
  privados en canales compartidos.
- **Mejora continua verificable**: pipeline reproducible de datasets desde el
  código fuente, rechazo de tool calls alucinadas y gates de calidad por batería
  de conversación real (≥85%).

### Decisiones de investigación con evidencia pública

El proyecto documenta también lo que **no** se adoptó, con datos:
el router de herramientas Cactus Needle fue descartado tras fine-tune propio
(16,7% de acierto vs el 85% exigido y 44 GB de RAM, inviable en hardware de bajo
consumo), y los candidatos de menor tamaño (LFM2.5 230M/350M) quedaron relegados
a extracción de datos pura. Esta trazabilidad es parte del método del proyecto:
cada cifra publicada proviene de un benchmark o una validación real.

### Despliegue de referencia

La configuración de producción actual corre sobre un **N100 (14 W)** con Odoo 18
(91 módulos), el gateway OdooClaw, el modelo fine-tuneado en llama.cpp y el
pipeline de visión, todo en el mismo equipo. El stack completo se despliega con
Docker (doodba) y el código vive en GitHub bajo licencia MIT.

### Disponibilidad

- Repositorio: github.com/nicolasramos/odooclaw
- Stack de despliegue: github.com/nicolasramos/odooclaw-doodba
- Modelos: Hugging Face (nicolasramos/odooclaw-light-1.2b-ft — GGUF, MLX y
  Ollama; nicolasramos/odooclaw-vision y -vision-mlx para OCR)
- Módulos Odoo: github.com/nicolasramos/odoo-addons (account_dynamic_rules,
  mail_bot_odooclaw)
- Extensiones de navegador (Browser Copilot): Firefox Add-ons y Chrome Web Store

### Sobre el autor

Nicolás Ramos es desarrollador senior y arquitecto de soluciones Odoo con base en
Santa Cruz de Tenerife (España). Especializado en la integración de agentes de IA
con ERP, combina infraestructura local (modelos en Apple Silicon, PC con GPU y
servidores de bajo consumo) con un enfoque de código abierto y verificable.

**Contacto de prensa:** hola@nicolasramos.es · https://nramos.dev

---

*OdooClaw es un proyecto independiente y no está afiliado a Odoo S.A. ni a Liquid AI.
Todos los nombres de productos y marcas mencionados pertenecen a sus respectivos
propietarios.*
