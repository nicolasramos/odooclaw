# Guia completa: OdooClaw + Doodba

Esta guia explica, de principio a fin, como levantar OdooClaw dentro de un proyecto Doodba, como configurarlo, como modificar `config.json` y como validar que funciona en Odoo Discuss.

## 1) Requisitos previos

Necesitas:

- Docker y Docker Compose funcionando
- proyecto Doodba operativo
- Odoo (17/18) levantando en ese proyecto
- acceso de administrador a Odoo
- una API key de modelo (OpenAI/OpenRouter/Anthropic, etc.) o endpoint local compatible OpenAI

## 2) Estructura recomendada del proyecto

Dentro de tu proyecto Doodba, la estructura minima esperada es:

```text
tu-proyecto-doodba/
  devel.yaml
  common.yaml
  odoo/
    custom/
      src/
        private/
          mail_bot_odooclaw/
  odooclaw/
    config/
    docs/
    docker/
    workspace/
```

## 3) Integrar el modulo de Odoo

El modulo es `mail_bot_odooclaw` y actua como puente entre Discuss y OdooClaw.

Ruta esperada en este proyecto:

```text
odoo/custom/src/private/mail_bot_odooclaw
```

Instalacion en Odoo:

1. Activa modo desarrollador.
2. Apps -> actualizar lista de aplicaciones.
3. Busca `OdooClaw` o `mail_bot_odooclaw`.
4. Instala el modulo.

Al instalarse, crea el usuario bot y el parametro de sistema base del webhook.

## 4) Configurar servicios en `devel.yaml`

Define (o revisa) estos servicios:

- `odoo`
- `db`
- `odooclaw`
- `redis` (recomendado para colas/background)

Ejemplo minimo para `odooclaw`:

```yaml
odooclaw:
  build:
    context: ./odooclaw
    dockerfile: docker/Dockerfile
  environment:
    - ODOO_URL=http://odoo:8069
    - ODOO_DB=devel
    - ODOO_USERNAME=admin
    - ODOO_PASSWORD=${ODOO_PASSWORD:-admin}
    - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
    - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt4
    - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
    - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
    - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
  ports:
    - "18790:18790"
  volumes:
    - odooclaw_data:/home/odooclaw/.odooclaw
    - ./odooclaw/config/config.json:/home/odooclaw/.odooclaw/config.json:ro
  depends_on:
    - odoo
```

Notas importantes:

- Usa prefijo en mayusculas `ODOOCLAW_...` para variables de entorno.
- No dejes API keys hardcodeadas en `devel.yaml`.
- En produccion, usa API key de Odoo en lugar de password de admin.

## 5) Variables en `.docker/odoo.env`

Gestiona secretos en `.docker/odoo.env` (o tu `.env` central):

```env
ODOO_PASSWORD=tu_api_key_de_odoo
OPENAI_API_KEY=sk-xxxx
OPENAI_API_BASE=https://api.openai.com/v1
TZ=Europe/Madrid
```

No subas este archivo con secretos al repositorio.

## 6) Preparar `config.json`

Primero crea tu config local:

```bash
cp odooclaw/config/config.example.json odooclaw/config/config.json
```

### 6.1 Configuracion base de agente

Seccion clave:

```json
"agents": {
  "defaults": {
    "workspace": "~/.odooclaw/workspace",
    "restrict_to_workspace": true,
    "model_name": "gpt4",
    "max_tokens": 8192,
    "temperature": 0.2,
    "max_tool_iterations": 20
  }
}
```

Recomendacion inicial:

- `temperature`: 0.1 - 0.3 para tareas transaccionales de Odoo
- `max_tool_iterations`: 20-40 segun complejidad de tool-calls

### 6.2 Definir modelos (`model_list`)

`model_name` debe coincidir con `agents.defaults.model_name`.

Ejemplo cloud (OpenAI):

```json
{
  "model_name": "gpt4",
  "model": "openai/gpt-5.2",
  "api_key": "sk-...",
  "api_base": "https://api.openai.com/v1"
}
```

Ejemplo local (OpenAI-compatible endpoint):

```json
{
  "model_name": "local-mlx",
  "model": "openai/tu-modelo-local",
  "api_base": "http://host.docker.internal:8000/v1",
  "api_key": "dummy"
}
```

### 6.3 Canal Odoo

Debe estar habilitado:

```json
"channels": {
  "odoo": {
    "enabled": true,
    "webhook_host": "0.0.0.0",
    "webhook_port": 18790,
    "webhook_path": "/webhook/odoo"
  }
}
```

### 6.4 Configurar tools

Revisa `tools` para MCP, web, cron, skills y exec.

Puntos practicos:

- activa MCP global y servidores MCP necesarios
- deja `exec.enable_deny_patterns=true` para evitar comandos peligrosos
- configura `tools.mcp.servers` en `config.json`, no via env en estructuras anidadas

## 7) Levantar stack

Desde la raiz del proyecto Doodba:

```bash
docker compose build odoo odooclaw
docker compose up -d
```

Ver logs:

```bash
docker compose logs -f odooclaw
docker compose logs -f odoo
```

## 8) Configurar webhook en Odoo

En Odoo:

1. Ajustes -> Tecnico -> Parametros del sistema.
2. Verifica (o crea) `odooclaw.webhook_url`.
3. Valor recomendado en la red docker interna:

```text
http://odooclaw:18790/webhook/odoo
```

## 9) Validacion funcional minima

En Discuss, abre chat con OdooClaw y prueba:

1. `hola`
2. `lee este excel` con adjunto CSV/XLSX
3. consulta de datos Odoo (facturas, pedidos, etc.)

Indicadores de salud:

- OdooClaw recibe webhook y responde en Discuss
- no hay errores de autenticacion de proveedor
- no hay errores de conexion Odoo <-> OdooClaw

## 10) Como modificar configuracion sin romper despliegue

Orden recomendado de cambios:

1. Cambia `config.json` (modelo, tools, canales).
2. Cambia variables de entorno en `.docker/odoo.env` si aplica.
3. Rebuild/restart de `odooclaw`.
4. Prueba en Discuss.

Comandos utiles:

```bash
docker compose up -d --build odooclaw
docker compose logs --since=5m odooclaw
```

## 11) Casos de uso recomendados para arrancar

- soporte en Discuss (Q&A operativo)
- lectura de adjuntos (Excel/CSV)
- OCR de facturas de proveedor
- consultas multi-modelo Odoo via `odoo-manager`

## 12) Errores comunes y solucion rapida

### No responde en Discuss

- valida `odooclaw.webhook_url`
- valida `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`
- revisa `docker compose logs odooclaw`

### Error de modelo/API

- valida `OPENAI_API_KEY` o clave del proveedor
- valida `OPENAI_API_BASE`/endpoint local
- valida que `model_name` exista en `model_list`

### Endpoint local funciona fuera de Docker pero no dentro

- usa `host.docker.internal` en lugar de `localhost`
- confirma puerto y path `/v1`

### Herramientas no se ejecutan correctamente

- sube `max_tool_iterations`
- baja `temperature`
- valida config MCP y skills cargadas

## 13) Recomendaciones para produccion

- usar API key de Odoo, no password admin
- no exponer secretos en YAML ni repo
- fijar modelos estables para tool-calling
- monitorizar logs y latencia de respuestas
- mantener un procedimiento de rollback de `config.json`

## 14) Referencias internas

- `odooclaw/docs/CONFIGURATION.md`
- `odooclaw/docs/tools_configuration.md`
- `odoo/custom/src/private/mail_bot_odooclaw/README.md`
- `odooclaw/config/config.example.json`
