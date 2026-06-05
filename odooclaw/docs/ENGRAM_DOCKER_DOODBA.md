# Engram Internal Memory in Docker/Doodba

This guide explains how to make OdooClaw's optional Engram strategic-memory integration available inside a Docker or Doodba deployment.

The OdooClaw code already contains the integration, but it is intentionally **disabled by default**. Production deployments must opt in explicitly.

## What this enables

When enabled, OdooClaw can persist high-value strategic memories such as:

- architecture decisions,
- bug fixes,
- discoveries,
- configuration choices,
- stable conventions,
- stable user/project preferences.

OdooClaw does **not** expose raw Engram `mem_*` tools directly to the model. Engram runs as an internal MCP server and OdooClaw exposes only the controlled `memory_save_strategic` tool.

## Recommended deployment model

Use a pinned Engram binary release in the OdooClaw image.

Why:

- deterministic deployments,
- no Go toolchain needed in the runtime image,
- smaller image than building Engram from source,
- checksum verification is possible,
- works well with Doodba image builds.

## Dockerfile snippet

Add this to the runtime stage of `odooclaw/docker/Dockerfile`, after `curl` and `ca-certificates` are installed and before switching to the non-root `odooclaw` user.

```dockerfile
ARG ENGRAM_VERSION=1.15.15
ARG ENGRAM_ARCH=amd64
ARG ENGRAM_SHA256=2ae88c7e9e368c032899fa0d419298f2579b394ca9c50665cfdfa40de2f34d7d

RUN set -eux; \
    curl -fsSL \
      "https://github.com/Gentleman-Programming/engram/releases/download/v${ENGRAM_VERSION}/engram_${ENGRAM_VERSION}_linux_${ENGRAM_ARCH}.tar.gz" \
      -o /tmp/engram.tar.gz; \
    echo "${ENGRAM_SHA256}  /tmp/engram.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/engram.tar.gz -C /tmp; \
    install -m 0755 /tmp/engram /usr/local/bin/engram; \
    rm -f /tmp/engram.tar.gz /tmp/engram
```

For ARM64 images use:

```dockerfile
ARG ENGRAM_ARCH=arm64
ARG ENGRAM_SHA256=6da3f8fc47eb4cf13c33adbf3eb722d6db77472162ab97460f337bf4470b5923
```

The checksums above correspond to Engram `v1.15.15`:

- `engram_1.15.15_linux_amd64.tar.gz`
- `engram_1.15.15_linux_arm64.tar.gz`

Before updating the version, verify the new checksums from the official release:

```bash
curl -fsSL https://github.com/Gentleman-Programming/engram/releases/download/v1.15.15/checksums.txt
```

## Doodba environment variables

Enable the integration explicitly in the `odooclaw` service:

```yaml
odooclaw:
  environment:
    - ODOOCLAW_ENGRAM_ENABLED=true
    - ODOOCLAW_ENGRAM_MCP_SERVER=engram
```

Do not enable this until the `engram` binary is present inside the container and the MCP server is configured.

## OdooClaw config

In `config.json`:

```json
{
  "engram": {
    "enabled": true,
    "mcp_server": "engram"
  },
  "tools": {
    "mcp": {
      "enabled": true,
      "servers": {
        "engram": {
          "enabled": true,
          "command": "engram",
          "args": ["mcp"],
          "exclude_from_auto_register": true
        }
      }
    }
  }
}
```

The critical setting is:

```json
"exclude_from_auto_register": true
```

Without it, raw Engram MCP tools could be exposed to the model. Keep Engram internal and let OdooClaw expose only `memory_save_strategic`.

## Persistence

Keep OdooClaw's home directory persisted:

```yaml
volumes:
  - odooclaw_data:/home/odooclaw/.odooclaw
```

Engram stores local data under the runtime user's home/project context. If you later choose a custom Engram home/config path, mount it explicitly and document that path in your Doodba stack.

## Validation

After rebuilding and starting the service:

```bash
docker compose exec odooclaw engram --version
docker compose logs -f odooclaw
```

Expected behavior:

- OdooClaw loads the MCP server named `engram`.
- Logs show `Registered strategic memory tool`.
- Raw Engram `mem_*` tools are not globally registered for the model.
- The model only receives `memory_save_strategic` for strategic memory writes.

If Engram is enabled but not connected, OdooClaw logs:

```text
Engram is enabled but MCP server is not connected
```

In that case, verify:

1. `engram` exists in the container PATH.
2. `tools.mcp.enabled=true`.
3. `tools.mcp.servers.engram.enabled=true`.
4. `engram.mcp_server` matches the MCP server name.
5. `exclude_from_auto_register=true`.

## Keep disabled for minimal installs

For small or first-time deployments, keeping Engram disabled is valid:

```json
"engram": {
  "enabled": false,
  "mcp_server": "engram"
}
```

OdooClaw will continue to run normally without Engram.
