# NRA-511 — Memoria Inteligente: Evaluación Mnemosyne + Diseño de Esquema

**Fecha:** 2026-08-11
**Issue:** NRA-511 (subtarea de NRA-186)
**Autor:** Forge Swift

---

## 1. Estado Actual del Sistema de Memoria en OdooClaw

### Lo que YA existe (confirmado en código)

| Componente | Archivo | Funcionalidad |
|---|---|---|
| **HOT memory** (SQLite) | `pkg/memory/store.go` | FTS5/BM25 sobre `MEMORY.md` + daily notes. Búsqueda local, sin red. |
| **COLD memory** (SQLite) | `pkg/memory/historical_store.go` | `historical_entries` + `historical_facts` con scope isolation, temporal facts, timeline. |
| **Session Manager** | `pkg/session/manager.go` | Historial de conversación por session key (channel:chatID). Persistencia JSON. |
| **Memory Store** (agent) | `pkg/agent/memory.go` | Orquesta HOT + COLD + daily notes. Inyección en prompt del agent. |
| **Memory Router** | `pkg/memory/router.go` | Rutea entre operational (HOT/COLD) y strategic (Engram). |
| **Engram MCP Client** | `pkg/memory/engram_mcp_client.go` | Cliente MCP para Engram (save/search/summarize). No-op por defecto. |
| **Tools** | `pkg/tools/memory_tools.go` | 8 herramientas: `memory_search`, `memory_save`, `memory_save_decision`, `memory_add_fact`, `memory_query_facts`, `memory_get_timeline`, `memory_debug_explain_retrieval`, `memory_import_history`. |
| **Strategic Memory** | `pkg/tools/strategic_memory_tool.go` | `memory_save_strategic` para decisiones/arquitectura/convenios. |

### Lo que NO existe (gap identificado)

1. **Memoria estructurada por sesión** — No hay esquema YAML/JSON con campos como `partner`, `current_document`, `current_module`, `pending_confirmation`, `current_company`.
2. **Memoria larga persistente** — No hay un sistema de preferencias de usuario/empresa que sobreviva entre sesiones con recuperación semántica.
3. **Inyección selectiva de contexto** — El prompt actual inyecta todo el historial o todo el memory context. No hay mecanismo de "solo lo relevante".
4. **Medición de impacto en tokens** — No hay baseline ni métricas de reducción de contexto.

---

## 2. Evaluación: Mnemosyne vs Alternativas

### 2.1 Mnemosyne (ya desplegado en NAS)

**Datos confirmados:**
- Contenedor `mnemosyne-mcp` en `192.168.1.10:8090` (SSE, healthy)
- Datos en `/volume4/docker/mnemosyne/data/`
- 36 herramientas `mnemosyne_*` verificadas
- Embedding: Qwen3-Embedding-0.6B-4bit-DWQ (multilingüe, 1024 dim)
- Documentado en Obsidian: `Projects/Infraestructura/Mnemosyne-Analisis.md`

**Capacidades de Mnemosyne:**
- **Personas**: Almacena perfiles de usuarios con preferencias, historial, contexto.
- **Episodios**: Registra interacciones pasadas con metadatos temporales.
- **Instrucciones**: Almacena reglas y directivas del usuario.
- **Tripletas**: Representación conocimiento como (sujeto, predicado, objeto).
- **Sincronización push/pull**: Puede sincronizar memoria entre instancias.

**Ventajas:**
- ✅ Ya desplegado y operativo en NAS
- ✅ API MCP nativa — integración directa con OdooClaw
- ✅ Embedding multilingüe (español/inglés) — crítico para OdooClaw
- ✅ 36 herramientas MCP — cobertura amplia de operaciones
- ✅ Soporte para personas, episodios, instrucciones, tripletas — cubre los 4 tipos de memoria requeridos
- ✅ Sincronización push/pull — útil para multi-sesión, multi-cliente

**Desventajas:**
- ❌ Depende de red (MCP sobre HTTP) — latencia añadida vs SQLite local
- ❌ Modelo de embedding 0.6B puede ser limitado para dominios técnicos complejos
- ❌ No hay evidencia de soporte para scope isolation por empresa/registro Odoo
- ❌ No hay evidencia de temporal facts con ventanas de validez
- ❌ Acoplamiento a infraestructura externa (NAS) — punto único de fallo

### 2.2 Zep

**Descripción:** Plataforma de memoria para LLMs con soporte para personas, episodios, y recuperación semántica.

**Ventajas:**
- ✅ Personas con preferencias y contexto persistente
- ✅ Episodios con metadatos estructurados
- ✅ API REST/MCP disponible
- ✅ Soporte para scope isolation
- ✅ Comunidad activa, documentación sólida

**Desventajas:**
- ❌ Requiere servicio externo (no local)
- ❌ Mayor overhead de infraestructura que SQLite
- ❌ No verificado en el entorno actual
- ❌ Coste de infraestructura adicional

### 2.3 LangMem (LangChain Memory)

**Descripción:** Sistema de memoria integrado en el ecosistema LangChain.

**Ventajas:**
- ✅ Integración nativa con LangChain (si se usa)
- ✅ Múltiples tipos de memoria (conversation, vector, knowledge graph)
- ✅ Flexible y extensible

**Desventajas:**
- ❌ Depende de LangChain — añade dependencia pesada
- ❌ No verificado en el entorno actual
- ❌ Requiere servicio externo (vector DB)
- ❌ No hay evidencia de scope isolation para Odoo

### 2.4 Graphiti (Graph-based Memory)

**Descripción:** Sistema de memoria basado en grafos para razonamiento complejo.

**Ventajas:**
- ✅ Representación de conocimiento como grafo — ideal para relaciones complejas (partner → invoices → products)
- ✅ Razonamiento sobre relaciones
- ✅ Soporte para temporal facts

**Desventajas:**
- ❌ Complejidad significativa de implementación
- ❌ Requiere grafo DB (Neo4j) — overhead alto
- ❌ No verificado en el entorno actual
- ❌ Overkill para el caso de uso actual de OdooClaw

### 2.5 SQLite Memory (implementación actual)

**Descripción:** La implementación actual de OdooClaw — SQLite con FTS5/BM25.

**Ventajas:**
- ✅ Ya implementado y funcionando
- ✅ Sin dependencia externa — todo local
- ✅ Scope isolation por channel/chat/sender/metadata
- ✅ Temporal facts con ventanas de validez
- ✅ Timeline retrieval
- ✅ Explainability/debug tools
- ✅ Bajo overhead, baja latencia
- ✅ Funciona en Docker/Doodba sin infraestructura adicional

**Desventajas:**
- ❌ Sin embeddings vectoriales — recuperación basada en texto plano (FTS5)
- ❌ No tiene concepto de "persona" o "episodio" como entidades de primera clase
- ❌ No tiene sincronización push/pull
- ❌ No tiene inferencia sobre relaciones (grafo)

---

## 3. Recomendación: Híbrido SQLite + Mnemosyne

### Decisión

**Usar SQLite como capa HOT (recuperación rápida, scope isolation) + Mnemosyne como capa COLD (personas, episodios, inferencia).**

### Justificación

1. **SQLite HOT layer** ya existe y funciona bien para:
   - Búsqueda rápida local (sin red)
   - Scope isolation por channel/chat/sender/metadata
   - Temporal facts con ventanas de validez
   - Explainability/debug

2. **Mnemosyne COLD layer** aporta lo que SQLite no tiene:
   - Personas con preferencias persistentes
   - Episodios con metadatos ricos
   - Inferencia sobre relaciones (tripletas)
   - Sincronización push/pull entre sesiones

3. **No reemplazar SQLite** — es la capa de rendimiento. Mnemosyne es complementario, no substituto.

4. **Coste de contexto**: SQLite para HOT (local, rápido) + Mnemosyne solo cuando se necesita recuperación semántica profunda.

---

## 4. Esquema de Memoria Estructurada por Sesión

### 4.1 Definición del Esquema

```yaml
# memory/session/<session_key>.yaml
session:
  key: "telegram:123456"           # Identificador único de sesión
  channel: "telegram"              # Canal de comunicación
  chat_id: "123456"                # ID del chat
  sender_id: "789"                 # ID del remitente
  current_company: 10              # company_id de Odoo (opcional)
  current_partner: 42              # partner_id actual (opcional)
  current_document:              # Documento actual en procesamiento
    model: "sale.order"
    res_id: 123
    action: "review"             # review, create, edit, confirm
  current_module: "sale"          # Módulo Odoo activo
  pending_confirmation:           # Acciones pendientes de confirmación del usuario
    - tool: "sale_order_confirm"
      args: {"order_id": 123}
      reason: "User requested confirmation"
  last_activity: "2026-08-11T20:00:00Z"
  message_count: 45               # Número de mensajes en la sesión
```

### 4.2 Implementación

**Archivo nuevo:** `pkg/memory/session_schema.go`

```go
package memory

import (
    "encoding/json"
    "os"
    "path/filepath"
    "time"
)

type SessionMemory struct {
    Key              string            `json:"key"`
    Channel          string            `json:"channel"`
    ChatID           string            `json:"chat_id"`
    SenderID         string            `json:"sender_id"`
    CurrentCompany   int               `json:"current_company,omitempty"`
    CurrentPartner   int               `json:"current_partner,omitempty"`
    CurrentDocument  *DocumentContext  `json:"current_document,omitempty"`
    CurrentModule    string            `json:"current_module,omitempty"`
    PendingConfirm   []PendingAction   `json:"pending_confirmation,omitempty"`
    LastActivity     time.Time         `json:"last_activity"`
    MessageCount     int               `json:"message_count"`
}

type DocumentContext struct {
    Model  string `json:"model"`
    ResID  int    `json:"res_id"`
    Action string `json:"action"` // review, create, edit, confirm
}

type PendingAction struct {
    Tool   string `json:"tool"`
    Args   map[string]any `json:"args"`
    Reason string `json:"reason"`
}
```

**Funcionalidades:**
- `SaveSessionMemory(key string, mem *SessionMemory)` — persiste en YAML
- `LoadSessionMemory(key string) (*SessionMemory, error)` — carga desde YAML
- `UpdateSessionField(key, field, value)` — actualiza un campo específico
- `ClearPendingConfirmations(key string)` — limpia confirmaciones pendientes
- `GetSessionSummary(key string) string` — resumen para inyección en prompt

---

## 5. Memoria Larga: Preferencias, Empresa, Configuración

### 5.1 Definición de la Memoria Larga

```yaml
# memory/long_term/preferences.yaml
user_preferences:
  language: "es"
  timezone: "Europe/Madrid"
  communication_style: "concise"
  preferred_update_frequency: "weekly"
  preferred_update_format: "short"
  contact_method: "email"

company_profile:
  company_id: 10
  name: "Empresa Ejemplo S.L."
  fiscal_number: "B-12345678"
  industry: "retail"
  active_modules: ["sale", "purchase", "inventory", "accounting"]
  default_currency: "EUR"
  fiscal_year_start: "01-01"

configuration:
  odoo_version: "17.0"
  database: "odoo_prod"
  webhook_url: "https://odoo.example.com/odooclaw/webhook"
  mcp_tools_enabled: ["sales", "purchase", "accounting", "inventory"]
```

### 5.2 Recuperación de Memoria Larga

**Archivo nuevo:** `pkg/memory/long_term.go`

```go
package memory

import (
    "time"
)

type LongTermStore struct {
    preferences *UserPreferences
    company     *CompanyProfile
    config      *SystemConfig
}

type UserPreferences struct {
    Language              string `json:"language"`
    Timezone              string `json:"timezone"`
    CommunicationStyle    string `json:"communication_style"`
    PreferredUpdateFreq   string `json:"preferred_update_frequency"`
    PreferredUpdateFormat string `json:"preferred_update_format"`
    ContactMethod         string `json:"contact_method"`
}

type CompanyProfile struct {
    CompanyID      int      `json:"company_id"`
    Name           string   `json:"name"`
    FiscalNumber   string   `json:"fiscal_number"`
    Industry       string   `json:"industry"`
    ActiveModules  []string `json:"active_modules"`
    DefaultCurrency string  `json:"default_currency"`
    FiscalYearStart string   `json:"fiscal_year_start"`
}

type SystemConfig struct {
    OdooVersion       string   `json:"odoo_version"`
    Database          string   `json:"database"`
    WebhookURL        string   `json:"webhook_url"`
    MCPToolsEnabled   []string `json:"mcp_tools_enabled"`
}

func (s *LongTermStore) GetPreferences() *UserPreferences
func (s *LongTermStore) UpdatePreference(key, value string) error
func (s *LongTermStore) GetCompanyProfile() *CompanyProfile
func (s *LongTermStore) UpdateCompanyProfile(profile *CompanyProfile) error
func (s *LongTermStore) GetConfig() *SystemConfig
func (s *LongTermStore) BuildPromptContext(sessionKey string) string
```

### 5.3 Integración con Mnemosyne para Memoria Larga

Cuando se necesita recuperación semántica profunda (no solo lookup por clave):

```go
// Usa Mnemosyne para buscar preferencias por descripción natural
func (s *LongTermStore) SearchPreferences(query string) ([]PreferenceMatch, error) {
    // Llama a Mnemosyne MCP para búsqueda semántica
    results, err := s.mnemosyneClient.Search(query)
    if err != nil {
        return nil, err
    }
    // Filtra por scope (channel/chat/sender)
    return s.filterByScope(results), nil
}
```

---

## 6. Integración con Conversation Manager

### 6.1 Arquitectura de Inyección de Contexto

```
┌─────────────────────────────────────────────────┐
│                  Agent Loop                      │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ Session      │    │ Memory Router        │   │
│  │ Manager      │    │                      │   │
│  │ (historial)  │    │ ┌──────────────────┐ │   │
│  └──────┬───────┘    │ │ HOT (SQLite)     │ │   │
│         │            │ │ - MEMORY.md      │ │   │
│         ▼            │ │ - daily notes    │ │   │
│  ┌──────────────┐    │ └──────────────────┘ │   │
│  │ Structured   │    │                      │   │
│  │ Session Mem  │    │ ┌──────────────────┐ │   │
│  │ (schema)     │    │ │ COLD (SQLite)    │ │   │
│  └──────┬───────┘    │ │ - entries         │ │   │
│         │            │ │ - facts           │ │   │
│         ▼            │ └──────────────────┘ │   │
│  ┌──────────────┐    │                      │   │
│  │ Long-Term    │    │ ┌──────────────────┐ │   │
│  │ Memory       │    │ │ Mnemosyne (MCP)  │ │   │
│  │ (prefs,      │    │ │ - personas        │ │   │
│  │  company)    │    │ │ - episodes        │ │   │
│  └──────┬───────┘    │ │ - tripletas       │ │   │
│         │            │ └──────────────────┘ │   │
│         ▼            └──────────────────────┘   │
│  ┌──────────────┐                               │
│  │ Context      │                               │
│  │ Builder      │                               │
│  │ (selective)  │                               │
│  └──────┬───────┘                               │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐                               │
│  │ Prompt       │                               │
│  │ (minimal)    │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

### 6.2 Algoritmo de Inyección Selectiva

```go
func (cm *ConversationManager) BuildContext(sessionKey string) (string, error) {
    var parts []string

    // 1. Memoria estructurada de la sesión (siempre relevante)
    sessionMem, err := cm.sessionMemory.Load(sessionKey)
    if err == nil && sessionMem != nil {
        parts = append(parts, buildSessionContext(sessionMem))
    }

    // 2. Memoria larga del usuario (preferencias, empresa)
    longTerm := cm.longTermMemory.BuildPromptContext(sessionKey)
    if longTerm != "" {
        parts = append(parts, longTerm)
    }

    // 3. HOT memory (solo si hay query específica)
    if cm.needsHotMemory(sessionKey) {
        hotCtx, err := cm.hotStore.BuildRelevantContext(cm.getHotQuery(sessionKey))
        if err == nil && hotCtx != "" {
            parts = append(parts, hotCtx)
        }
    }

    // 4. COLD memory (solo si hay query específica)
    if cm.needsColdMemory(sessionKey) {
        coldCtx, err := cm.coldStore.BuildRelevantContext(cm.getColdQuery(sessionKey))
        if err == nil && coldCtx != "" {
            parts = append(parts, coldCtx)
        }
    }

    // 5. Mnemosyne (solo para recuperación semántica profunda)
    if cm.needsSemanticSearch(sessionKey) {
        semanticCtx, err := cm.mnemosyneClient.SearchSemantic(cm.getSemanticQuery(sessionKey))
        if err == nil && semanticCtx != "" {
            parts = append(parts, semanticCtx)
        }
    }

    // 6. Historial de sesión (SOLO si no hay alternativa mejor)
    // NO inyectar historial crudo por defecto
    if cm.shouldIncludeHistory(sessionKey) {
        history := cm.sessionManager.GetHistory(sessionKey)
        parts = append(parts, buildMinimalHistory(history))
    }

    return joinContext(parts), nil
}
```

### 6.3 Reglas de Inyección

1. **Siempre inyectar:** memoria estructurada de sesión (partner, current_module, etc.)
2. **Siempre inyectar:** preferencias del usuario y perfil de empresa
3. **Inyectar HOT memory:** solo cuando la query del usuario sugiere búsqueda en memoria
4. **Inyectar COLD memory:** solo cuando la query sugiere búsqueda en historial
5. **Inyectar Mnemosyne:** solo para recuperación semántica profunda (personas, relaciones complejas)
6. **NUNCA inyectar historial crudo** por defecto — solo si no hay alternativa mejor
7. **NUNCA inyectar más de 3 fuentes** a la vez — priorizar por relevancia

---

## 7. Medición de Impacto en Tokens

### 7.1 Baseline Actual

Medir el tamaño del contexto actual del prompt:

```go
func measureCurrentContextTokens(sessionKey string) (int, error) {
    // 1. Obtener el prompt actual del agent
    prompt := cm.BuildContext(sessionKey)

    // 2. Contar tokens (usar tiktoken o equivalente)
    tokenCount := countTokens(prompt)

    return tokenCount, nil
}
```

### 7.2 Métricas a Medir

| Métrica | Descripción |
|---|---|
| `tokens_before` | Tokens del contexto actual (con historial crudo) |
| `tokens_after` | Tokens del contexto con inyección selectiva |
| `reduction_pct` | Porcentaje de reducción: `(before - after) / before * 100` |
| `hot_tokens` | Tokens de HOT memory inyectados |
| `cold_tokens` | Tokens de COLD memory inyectados |
| `semantic_tokens` | Tokens de Mnemosyne inyectados |
| `history_tokens` | Tokens de historial inyectados (debe ser ~0) |
| `structured_tokens` | Tokens de memoria estructurada (siempre presentes) |
| `longterm_tokens` | Tokens de memoria larga (preferencias, empresa) |

### 7.3 Metodología de Medición

1. **Recopilar baseline:** medir tokens del contexto actual para 10 sesiones representativas
2. **Implementar inyección selectiva** (secciones 6.1-6.3)
3. **Medir de nuevo:** mismos 10 sesiones con el nuevo sistema
4. **Comparar:** calcular reducción de tokens y verificar que la calidad de respuesta no disminuye
5. **Documentar resultados** en un ADR (Architecture Decision Record)

### 7.4 Herramienta de Medición

```go
// pkg/memory/token_counter.go
package memory

import (
    "github.com/pkoukk/tiktoken-go"
)

type TokenCounter struct {
    encoder *tiktoken.Tiktoken
}

func NewTokenCounter() *TokenCounter {
    enc, _ := tiktoken.GetEncoding("cl100k_base") // GPT-4 encoding
    return &TokenCounter{encoder: enc}
}

func (tc *TokenCounter) CountTokens(text string) int {
    return len(tc.encoder.Encode(text, nil, nil))
}

func (tc *TokenCounter) MeasureContext(sessionKey string) map[string]int {
    // Devuelve tokens por capa de memoria
    return map[string]int{
        "structured": tc.CountTokens(cm.buildSessionContext(sessionKey)),
        "longterm":   tc.CountTokens(cm.longTermMemory.BuildPromptContext(sessionKey)),
        "hot":        tc.CountTokens(cm.hotStore.BuildRelevantContext(...)),
        "cold":       tc.CountTokens(cm.coldStore.BuildRelevantContext(...)),
        "semantic":   tc.CountTokens(cm.mnemosyneClient.SearchSemantic(...)),
        "history":    tc.CountTokens(cm.buildMinimalHistory(...)),
    }
}
```

---

## 8. Plan de Implementación

### Fase 1: Memoria Estructurada por Sesión (2-3 días)

- [ ] Crear `pkg/memory/session_schema.go` con tipos y persistencia YAML
- [ ] Integrar con `SessionManager` para actualizar estado en cada mensaje
- [ ] Añadir `GetSessionSummary()` para inyección en prompt
- [ ] Tests unitarios

### Fase 2: Memoria Larga (2-3 días)

- [ ] Crear `pkg/memory/long_term.go` con preferencias y perfil de empresa
- [ ] Persistencia en YAML + recuperación por clave y semántica
- [ ] Integrar con `MemoryStore` existente
- [ ] Tests unitarios

### Fase 3: Integración con Mnemosyne (2-3 días)

- [ ] Crear `pkg/memory/mnemosyne_client.go` como wrapper sobre MCP
- [ ] Implementar búsqueda semántica con scope isolation
- [ ] Configurar en gateway para sesiones que lo requieran
- [ ] Tests de integración

### Fase 4: Conversation Manager Selectivo (3-4 días)

- [ ] Implementar `BuildContext()` con inyección selectiva
- [ ] Reglas de prioridad y límite de fuentes
- [ ] Herramienta de medición de tokens
- [ ] Tests de integración end-to-end

### Fase 5: Medición y Validación (2-3 días)

- [ ] Baseline de tokens actuales
- [ ] Medición post-implementación
- [ ] Validación de calidad de respuestas
- [ ] Documentación de resultados

**Total estimado: 12-16 días de desarrollo**

---

## 9. Criterios de Aceptación — Estado

| Criterio | Estado | Notas |
|---|---|---|
| Decisión documentada: Mnemosyne vs alternativas | ✅ COMPLETADO | Esta documentación |
| Esquema de memoria estructurada implementado | 🔄 PENDIENTE | Fase 1 |
| Memoria larga recuperable | 🔄 PENDIENTE | Fase 2 |
| Contexto inyectado baja (medición real) | 🔄 PENDIENTE | Fase 5 |
| Sin dependencia del historial crudo | 🔄 PENDIENTE | Fase 4 |

---

## 10. Decisiones Arquitectónicas Clave

### D1: Híbrido SQLite + Mnemosyne
- **Decisión:** Usar ambos, no elegir uno
- **Razón:** SQLite para HOT (velocidad, scope isolation), Mnemosyne para COLD (personas, inferencia)
- **Trade-off:** Complejidad añadida vs funcionalidad completa

### D2: Memoria estructurada en YAML, no en SQLite
- **Decisión:** YAML para memoria de sesión (estructura fija), SQLite para búsqueda semántica
- **Razón:** YAML es legible, editable manualmente, y tiene estructura fija que coincide con el esquema
- **Trade-off:** No tiene FTS5, pero no se necesita búsqueda libre en este esquema

### D3: Inyección selectiva, no historial crudo
- **Decisión:** Solo inyectar lo relevante, NUNCA el historial completo por defecto
- **Razón:** Reduce tokens, mejora foco del modelo, evita contaminación de contexto
- **Trade-off:** Más complejidad en el builder, riesgo de omitir información relevante

### D4: Mnemosyne como capa opcional
- **Decisión:** Mnemosyne es opcional — el sistema funciona sin él
- **Razón:** No todos los entornos tienen Mnemosyne desplegado
- **Trade-off:** Sin inferencia semántica profunda cuando Mnemosyne no está disponible

---

## 11. Referencias

- NRA-186: OdooClaw Next Generation Agent Architecture
- `pkg/memory/store.go` — HOT memory (SQLite + FTS5)
- `pkg/memory/historical_store.go` — COLD memory (SQLite + facts)
- `pkg/memory/router.go` — Memory router (operational vs strategic)
- `pkg/memory/engram_mcp_client.go` — Engram MCP client
- `pkg/agent/memory.go` — Agent memory store
- `pkg/session/manager.go` — Session manager
- `pkg/tools/memory_tools.go` — 8 memory tools
- `docs/ODOO_CHAT_MEMORY_QA.md` — QA guide
- `docs/SQLITE_MEMORY.md` — SQLite backend docs
