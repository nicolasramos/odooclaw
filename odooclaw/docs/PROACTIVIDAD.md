# Proactividad en OdooClaw

Cómo el asistente deja de esperar a que le pregunten: qué dispara una sugerencia,
qué sabe cuando la hace y por dónde la entrega.

## La conclusión corta

**Son tres problemas distintos, y el error caro sería meterlos los tres dentro del
prompt del modelo.**

| # | Problema | Pregunta real | Solución |
|---|----------|---------------|----------|
| 1 | **Disparador** | ¿Cuándo habla? | Determinista, contando en Odoo |
| 2 | **Conocimiento** | ¿Qué sabe de "cómo ayudar"? | Playbooks, recuperados **por área** |
| 3 | **Entrega** | ¿Por dónde y con permiso? | Chat privado + política anti-molestia |

**El LLM no decide cuándo hablar: redacta la frase.** Con modelos locales
pequeños, "decide tú cuándo interrumpir" produce un asistente que habla cuando no
debe y calla cuando debería hablar. Todo lo que decide si el usuario es
interrumpido es determinista y auditable.

## Por qué la proactividad no es un problema de RAG

La intuición razonable es "meto un RAG y ya". Medido sobre el código, no funciona:

```
Search("verifactu")                              -> 1 resultado
Search("¿cómo configuro el VeriFactu en Odoo?")  -> 0 resultados
Search("verifactu configuro")                    -> 0 resultados
```

`pkg/knowledge` pasa la consulta cruda a FTS5 `MATCH`, que une términos con AND
implícito y no quita palabras vacías. **Una pregunta en lenguaje natural no
encuentra nada.** Si el disparador hubiera dependido del fraseo, habría fallado
en silencio: el asistente no habla, nadie sabe por qué, y parece que "no funciona".

La consecuencia de diseño es que **el disparador no usa texto libre**. Recupera
**filtrando por área** (un campo estructurado) y el texto sólo ordena dentro del
área. Por eso existe `SearchByArea(area, query, limit)`.

### El arreglo que hizo falta en la KB

`Add()` guardaba la metadata (área, módulo, riesgo) en `knowledge_meta`, pero
`Search()` sólo devolvía título/contenido/tags/categoría: **la metadata se
escribía y no se podía leer**. Filtrar por área era imposible sin duplicar el
almacén. Se corrigió con una columna `knowledge_id` + `LEFT JOIN` por `rowid`
(esquema aditivo, compatible hacia atrás).

Dos detalles aprendidos por el camino, ambos silenciosos:

- **FTS5 no admite alias de tabla en `MATCH`**: `k MATCH ?` devuelve
  `SQL logic error: no such column: k`, la query cae al fallback `LIKE` y el
  fallback no lee la metadata. El síntoma es "el fix no funciona" sin ningún error.
- El `Search` debe nombrar la tabla completa (`knowledge MATCH ?`).

## La pieza que faltaba de verdad: el token de respuesta

Esta es la parte que hace que "que funcione" sea una frase con contenido.

`pkg/channels/odoo/odoo.go` **rechaza con 400 cualquier mensaje sin
`reply_token`**, y ese token lo genera Odoo cuando *un humano escribe al bot*,
es de un solo uso y caduca. El módulo Odoo lo valida en `/odooclaw/reply`.

Esa puerta es deliberada y correcta: es lo que hace seguro que el endpoint llame a
`sudo().message_post()`. Su consecuencia, **por construcción**, es que un mensaje
que nadie pidió es imposible: sin mensaje humano → sin token → sin respuesta.

```
Hoy:   humano escribe -> Odoo genera token -> gateway responde   ✔
       nadie escribe  -> no hay token     -> gateway se calla   ✗  ← proactividad
```

Proactividad necesita el flujo contrario, así que **no puede reutilizar ese
token**. La solución añade una credencial de servicio explícita (el mismo secreto
compartido `X-OdooClaw-Token` que ya usa el webhook) y una ruta dedicada que sólo
puede publicar en el chat privado del bot con un usuario — **nunca en el chatter de
un registro de negocio**. El token de un solo uso no se toca: el camino solicitado
no se debilita.

## Cómo queda montado

```
Vista de Odoo abierta
   │
   ├─ 1. Odoo resuelve el ÁREA         mail.odooclaw.area.resolve_area(model, view, action)
   │      y cuenta las señales          counters_for() -> {"unposted_invoices": 12}
   │
   ├─ 2. POST /odooclaw/signal  ──────► motor Go  (pkg/proactive)
   │                                      ├─ ¿opt-in?  ¿horario?  ¿tope diario?  ¿cooldown?
   │                                      ├─ playbook del área por encima del umbral
   │                                      └─ dedupe: la misma oferta no se repite NUNCA
   │                                    ◄──── {speak, reason, playbook, message}
   │
   └─ 3. Si speak              Odoo publica en el chat privado (como el bot)
```

El motor decide; Odoo entrega. Mantener la publicación dentro del request evita
la ventana en la que una sugerencia llega cuando el usuario ya se ha ido.

### Alternativa: entrega desde el gateway

Para disparadores que no vienen de una pantalla (un cron, otro agente, un evento
externo), existe la ruta inversa:

```
motor Go  ──POST /odooclaw/notify──►  Odoo publica en el chat privado
```

## Los tres componentes

### 1. Disparador — determinista

`mail.odooclaw.area` mapea un modelo/vista/acción a un **área funcional** y a sus
contadores. Las filas son datos: un administrador cambia un umbral o una
definición sin tocar código.

Un contador que falla **degrada a silencio, no a error**: una definición mal
escrita no puede romper la apertura de una vista.

Resolución determinista, de más específico a menos: **acción → vista → modelo**.
El mismo pantalla debe resolver siempre a la misma área, o el cooldown se vuelve
inconsistente.

### 2. Conocimiento — playbooks, no documentación

Un playbook responde "qué hago cuando pasa esto": **una señal observable en un
área** + la oferta que se hace. Es **datos**: el texto se reescribe sin tocar Go.

Eso importa más de lo que parece. VeriFactu **ya cambió una vez**: el RDL 15/2025
(2-dic) modificó la DF 4ª del RD 1007/2023 y amplió los plazos a **1-ene-2027**
(sociedades) y **1-jul-2027** (resto). Los plazos de 2026 que circulan por webs de
terceros están obsoletos. Ese dato va en un playbook editable y **nunca en el
prompt del modelo**.

### 3. Entrega — con permiso

La política por defecto es deliberadamente conservadora:

| Regla | Valor |
|---|---|
| Opt-in | **obligatorio** |
| Cooldown por área | 24 h |
| Tope diario | 3 |
| Silencio horario | 21:00 – 08:00 |
| Dedupe | la misma oferta no se repite, nunca |
| Playbooks de riesgo alto | requieren autorización explícita aparte |

Un asistente que interrumpe sin permiso es lo que hace odiar a un asistente.

**Todas las negativas devuelven un motivo explicable**, así que se puede auditar
por qué **no** habló — que es la pregunta que más se hace en producción.

### Durabilidad: el estado va en SQLite

El estado de la política vive en SQLite (`pkg/proactive/store.go`), no en memoria.
Un mapa en memoria olvida sus cooldowns en cada reinicio, lo que convierte "como
mucho una vez por área y día" en "una vez por despliegue" — una promesa que el
producto no puede cumplir. Hay un test que lo fija.

El cooldown se apunta **sólo después de una entrega correcta**: si Odoo rechaza el
mensaje, el asistente no queda mudo 24 h por un fallo transitorio.

## Verificación

Lo que está medido, no supuesto:

- **`go build ./...` limpio, `go vet ./...` limpio.**
- **47/47 paquetes Go en verde**, 0 fallos.
- **17 tests** en `pkg/proactive` (motor, política, dedupe, durabilidad, entrega).
- **12 tests** en `mail_bot_odooclaw` sobre **Odoo 18 real en Docker**, 41 tests
  del módulo, **0 fallos**. El módulo instala limpio.
- **Verificación en las dos direcciones**: se mutó el código a propósito para
  comprobar que los tests detectan el fallo de verdad — sin el filtro por área el
  test se pone rojo nombrando el playbook equivocado; sin `sudo()` reproducen el
  `AccessError` real. Un test que nunca se pone rojo no prueba nada.

Los bugs reales que la verificación encontró y que no se habrían visto sin
ejecutar contra Odoo:

1. **`security.authorize()` lanza `HTTPException`** para cortocircuitar. Un
   `except Exception` genérico convertía **todo 401 en 500**. Hay que re-lanzarlo.
2. **`env.ref()` en ruta pública da `AccessError`** al leer `res.users` (usuario
   público id=4): la publicación proactiva necesita `sudo()`.

## Ficheros

**Repo `odooclaw`** (Go):

- `pkg/proactive/engine.go` — evaluación, umbrales, dedupe
- `pkg/proactive/policy.go` — opt-in, cooldown, tope, silencio horario
- `pkg/proactive/store.go` — estado durable en SQLite
- `pkg/proactive/playbooks.go` — los 8 playbooks por defecto
- `pkg/proactive/deliver.go` — entrega al endpoint de Odoo
- `pkg/proactive/service.go` — une los tres componentes
- `pkg/proactive/engine_test.go` — 17 tests
- `cmd/proactive-demo/` — recorrido end-to-end ejecutable
- `pkg/knowledge/knowledge.go` — `SearchByArea` + metadata legible

**Repo `odoo-addons`** (módulo `mail_bot_odooclaw`):

- `models/mail_odooclaw_area.py` — áreas, contadores, publicación
- `models/mail_message.py` — campos de procedencia (auditoría)
- `controllers/proactive.py` — `/odooclaw/signal` y `/odooclaw/notify`
- `tests/test_proactive.py` — 12 tests
- `security/ir.model.access.csv` — ACLs del modelo de áreas

## Cómo se pone en marcha

1. Instalar/actualizar `mail_bot_odooclaw`.
2. Configurar en Odoo: `odooclaw.reply_token` (secreto compartido, ya existe) y
   `odooclaw.proactive_url` (el motor); `odooclaw.allowed_ips` si se usa allowlist.
3. Cargar las áreas en `mail.odooclaw.area` (o dejarlas por defecto).
4. Arrancar el motor de proactividad.
5. Dar de alta a los usuarios que quieran sugerencias (opt-in).

## La métrica que decide si esto funciona

**Tasa de aceptación de la oferta.** Si el usuario cierra el chat sin responder
sistemáticamente, el playbook o el umbral están mal. Ese número manda sobre
cualquier opinión.

## Alternativas descartadas, con motivo

- **RAG vectorial / embeddings** — no ahora. Corpus pequeño, dominio cerrado y
  FTS5+BM25 ya está. Metería un modelo de embeddings y un vector store: justo lo
  contrario de "100% local, corre en 1 vCPU/2GB". Reevaluar si el corpus llega a
  miles de entradas.
- **Un SQLite nuevo** — `pkg/knowledge` ya lo es; duplicaría el retrieval.
- **Que el LLM decida cuándo hablar** — no determinista, no auditable, deriva.
- **Reutilizar el `reply_token` para proactividad** — imposible por diseño, y
  debilitaría la garantía del camino solicitado.
- **La extensión de navegador como canal principal** — sólo funciona en web y con
  la extensión puesta; dentro de Odoo el canal es Discuss. Complementaria.
