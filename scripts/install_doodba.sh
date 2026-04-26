#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# install_doodba.sh - OdooClaw installer for existing Doodba stacks
#
# Usage:
#   cd /path/to/your/doodba/project
#   bash <(curl -sL https://raw.githubusercontent.com/nicolasramos/odooclaw/main/scripts/install_doodba.sh)
#
# Or from a cloned repo:
#   bash scripts/install_doodba.sh
# ---------------------------------------------------------------------------
set -euo pipefail

# -- Constants ---------------------------------------------------------------
readonly SCRIPT_VERSION="1.0.0"
readonly ODOOCLAW_REPO="https://github.com/nicolasramos/odooclaw"
readonly TEMP_REPO="/tmp/odooclaw_install_$(date +%s)"
readonly SUPPORTED_VERSIONS=("16.0" "17.0" "18.0")

# -- Color helpers -----------------------------------------------------------
RED="" GREEN="" YELLOW="" BLUE="" BOLD="" RESET=""
if [ -t 1 ]; then
  RED="\033[0;31m"
  GREEN="\033[0;32m"
  YELLOW="\033[0;33m"
  BLUE="\033[0;34m"
  BOLD="\033[1m"
  RESET="\033[0m"
fi

log()  { printf "${BLUE}[INFO]${RESET}  %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
ok()   { printf "${GREEN}[OK]${RESET}    %s\n" "$*"; }
fail() { printf "${RED}[FAIL]${RESET}  %s\n" "$*" >&2; exit 1; }

separator() {
  printf "\n${BOLD}--- %s ---${RESET}\n\n" "$*"
}

# -- Cleanup -----------------------------------------------------------------
cleanup() {
  if [ -d "$TEMP_REPO" ]; then
    log "Cleaning up temp clone..."
    rm -rf "$TEMP_REPO"
  fi
}
trap cleanup EXIT

# -- Prompt helpers ----------------------------------------------------------
prompt_default() {
  local label="$1" default="$2"
  printf "  ${BOLD}%s${RESET} [${default}]: " "$label" >&2
  read -r answer
  echo "${answer:-$default}"
}

prompt_password() {
  local label="$1"
  printf "  ${BOLD}%s${RESET}: " "$label" >&2
  read -rs answer
  echo "" >&2
  echo "$answer"
}

prompt_yesno() {
  local label="$1" default="${2:-Y}"
  local options=""
  [ "$default" = "Y" ] && options="[Y/n]" || options="[y/N]"
  printf "  ${BOLD}%s${RESET} %s: " "$label" "$options" >&2
  read -r answer
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy] ]]
}

# -- Compose include helpers --------------------------------------------------
ensure_compose_include_entry() {
  local compose_target="$1"

  [ -f "$compose_target" ] || return 0

  if grep -Eq '^[[:space:]]*-[[:space:]]*odooclaw\.yaml([[:space:]]|$)' "$compose_target" ||
     grep -Eq '^[[:space:]]*include:[[:space:]]*\[[^]]*odooclaw\.yaml[^]]*\]' "$compose_target"; then
    ok "${compose_target} already includes odooclaw.yaml"
    return 0
  fi

  local backup_file="${compose_target}.bak.$(date +%s)"
  cp "$compose_target" "$backup_file"

  local tmp_file
  tmp_file="$(mktemp)"

  if grep -Eq '^[[:space:]]*include:[[:space:]]*$' "$compose_target"; then
    awk '
      BEGIN { inserted=0 }
      {
        print
        if ($0 ~ /^[[:space:]]*include:[[:space:]]*$/ && inserted == 0) {
          print "  - odooclaw.yaml"
          inserted=1
        }
      }
    ' "$compose_target" > "$tmp_file"
  else
    {
      printf 'include:\n'
      printf '  - odooclaw.yaml\n\n'
      cat "$compose_target"
    } > "$tmp_file"
  fi

  mv "$tmp_file" "$compose_target"
  ok "Updated ${compose_target} with include: odooclaw.yaml (backup: ${backup_file})"
}

integrate_odooclaw_include() {
  local found_compose=0

  for compose_target in devel.yaml prod.yaml; do
    if [ -f "$compose_target" ]; then
      found_compose=1
      ensure_compose_include_entry "$compose_target"
    fi
  done

  if [ "$found_compose" -eq 0 ]; then
    warn "No devel.yaml or prod.yaml found to auto-insert include."
    warn "You can still use: docker compose -f <stack>.yaml -f odooclaw.yaml up -d"
  fi
}

# ============================================================================
# PHASE 1: Prerequisites
# ============================================================================
phase_prerequisites() {
  separator "Phase 1/7: Checking prerequisites"

  local missing=0

  for cmd in docker git openssl; do
    if command -v "$cmd" &>/dev/null; then
      ok "$cmd found ($(command -v "$cmd"))"
    else
      fail "$cmd is required but not found in PATH"
      missing=1
    fi
  done

  # Docker compose check (v2 plugin or standalone)
  if docker compose version &>/dev/null 2>&1; then
    ok "docker compose (plugin) found"
  elif command -v docker-compose &>/dev/null; then
    ok "docker-compose (standalone) found"
  else
    fail "docker compose (v2 plugin or standalone) is required"
    missing=1
  fi

  [ "$missing" -eq 0 ] || fail "Install missing dependencies and re-run."

  # Verify we are inside a Doodba project
  if [ ! -f "docker-compose.yml" ] && [ ! -f "devel.yaml" ] && [ ! -f "prod.yaml" ]; then
    warn "No docker-compose.yml, devel.yaml or prod.yaml found."
    warn "Make sure you are in the root of a Doodba project."
    if ! prompt_yesno "Continue anyway?" "N"; then
      fail "Aborted by user."
    fi
  fi
}

# ============================================================================
# PHASE 2: Detect Odoo version
# ============================================================================
phase_detect_version() {
  separator "Phase 2/7: Detecting Odoo version"

  local detected=""
  for ver in "${SUPPORTED_VERSIONS[@]}"; do
    if [ -d "odoo/custom/src/${ver}" ]; then
      detected="$ver"
      log "Found Odoo source directory: odoo/custom/src/${ver}"
    fi
  done

  if [ -n "$detected" ]; then
    log "Detected Odoo version(s): ${detected}"
    # If multiple versions, ask
    local count
    count=$(find odoo/custom/src -maxdepth 1 -mindepth 1 -type d -regex '.*/[0-9]+\.[0-9]+' | wc -l | tr -d ' ')
    if [ "$count" -gt 1 ]; then
      warn "Multiple Odoo versions detected."
      ODOO_VERSION=$(prompt_default "Which Odoo version to install the module for?" "$detected")
    else
      ODOO_VERSION="$detected"
    fi
  else
    warn "Could not auto-detect Odoo version from directory structure."
    log "Supported versions: ${SUPPORTED_VERSIONS[*]}"
    ODOO_VERSION=$(prompt_default "Enter Odoo version" "18.0")
  fi

  # Validate version
  local valid=0
  for v in "${SUPPORTED_VERSIONS[@]}"; do
    [ "$ODOO_VERSION" = "$v" ] && valid=1 && break
  done
  [ "$valid" -eq 1 ] || fail "Unsupported Odoo version: ${ODOO_VERSION}. Supported: ${SUPPORTED_VERSIONS[*]}"

  ok "Odoo version: ${ODOO_VERSION}"
}

# ============================================================================
# PHASE 3: Clone and copy files
# ============================================================================
phase_clone_and_copy() {
  separator "Phase 3/7: Downloading OdooClaw files"

  PRIVATE_ADDONS="odoo/custom/src/private"
  ODOOCLAW_DIR="odooclaw"

  # Clone (shallow)
  if [ ! -d "$TEMP_REPO/.git" ]; then
    log "Cloning OdooClaw repository (shallow)..."
    git clone --depth 1 "$ODOOCLAW_REPO" "$TEMP_REPO" 2>/dev/null || \
      fail "Failed to clone ${ODOOCLAW_REPO}"
    ok "Repository cloned."
  fi

  # Verify the module exists for the selected version
  local module_src="$TEMP_REPO/odoo/custom/src/${ODOO_VERSION}/mail_bot_odooclaw"
  if [ ! -d "$module_src" ]; then
    fail "Module mail_bot_odooclaw not found for Odoo ${ODOO_VERSION} in the repository."
  fi

  # Create directories
  log "Creating directories..."
  mkdir -p "$PRIVATE_ADDONS"
  mkdir -p "$ODOOCLAW_DIR"
  mkdir -p "$ODOOCLAW_DIR/config"

  # Copy Odoo module (idempotent)
  local module_dest="$PRIVATE_ADDONS/mail_bot_odooclaw"
  if [ -d "$module_dest" ]; then
    warn "Module already exists at ${module_dest}. Updating..."
    rm -rf "$module_dest"
  fi
  cp -r "$module_src" "$module_dest/"
  ok "Odoo module copied to ${module_dest}"

  # Copy gateway source (idempotent - only if not already present)
  if [ -f "$ODOOCLAW_DIR/go.mod" ]; then
    warn "Gateway source already exists at ${ODOOCLAW_DIR}/. Updating..."
    rsync -a --exclude='config/config.json' "$TEMP_REPO/odooclaw/" "$ODOOCLAW_DIR/" 2>/dev/null || {
      # Fallback if rsync not available
      cp -rn "$TEMP_REPO/odooclaw/"* "$ODOOCLAW_DIR/" 2>/dev/null || true
    }
  else
    cp -r "$TEMP_REPO/odooclaw/"* "$ODOOCLAW_DIR/"
  fi
  ok "Gateway source copied to ${ODOOCLAW_DIR}/"

  # Copy example files for reference
  mkdir -p "$ODOOCLAW_DIR/examples"
  cp -r "$TEMP_REPO/examples/doodba/"* "$ODOOCLAW_DIR/examples/" 2>/dev/null || true
  ok "Example files copied to ${ODOOCLAW_DIR}/examples/"
}

# ============================================================================
# PHASE 4: Interactive configuration
# ============================================================================
phase_configure() {
  separator "Phase 4/7: Configuration"

  # --- Odoo connection ---
  log "Odoo connection settings:"
  CFG_ODOO_DB=$(prompt_default "  Database name" "prod")
  CFG_ODOO_USER=$(prompt_default "  Admin username" "admin")
  log "  Admin password (input hidden):"
  CFG_ODOO_PASS=$(prompt_password "  Password")

  # --- LLM Provider ---
  log ""
  log "LLM provider settings:"
  log "  Supported: openai, anthropic, openrouter, groq, ollama, gemini"
  CFG_LLM_PROVIDER=$(prompt_default "  Provider" "openai")

  local default_model="gpt-4o-mini"
  local default_base="https://api.openai.com/v1"
  case "$CFG_LLM_PROVIDER" in
    anthropic)   default_model="claude-sonnet-4-20250514"; default_base="https://api.anthropic.com" ;;
    openrouter)  default_model="openai/gpt-4o-mini"; default_base="https://openrouter.ai/api/v1" ;;
    groq)        default_model="llama-3.3-70b-versatile"; default_base="https://api.groq.com/openai/v1" ;;
    ollama)      default_model="llama3"; default_base="http://host.docker.internal:11434/v1" ;;
    gemini)      default_model="gemini-2.0-flash"; default_base="https://generativelanguage.googleapis.com/v1beta/openai" ;;
  esac

  CFG_LLM_MODEL=$(prompt_default "  Model" "$default_model")
  CFG_LLM_API_BASE=$(prompt_default "  API base URL" "$default_base")
  log "  API key (input hidden):"
  CFG_LLM_API_KEY=$(prompt_password "  API key")

  # --- Browser Copilot ---
  log ""
  log "Browser Copilot settings:"
  if prompt_yesno "Install Browser Copilot?" "Y"; then
    INSTALL_BROWSER_COPILOT=1
    local default_domains="${CFG_ODOO_DB}.com,localhost,127.0.0.1"
    CFG_BC_DOMAINS=$(prompt_default "  Allowed domains (comma-separated)" "$default_domains")
  else
    INSTALL_BROWSER_COPILOT=0
  fi

  # --- Generate tokens ---
  log ""
  log "Generating secure tokens..."
  BC_TOKEN=$(openssl rand -hex 16)
  ok "Browser Copilot token generated."
}

# ============================================================================
# PHASE 5: Generate config files
# ============================================================================
phase_generate_configs() {
  separator "Phase 5/7: Generating configuration files"

  local env_file=".docker/odoo.env"
  local config_file="odooclaw/config/config.json"

  # --- .docker/odoo.env ---
  # Backup existing
  if [ -f "$env_file" ]; then
    cp "$env_file" "${env_file}.bak.$(date +%s)"
    log "Existing ${env_file} backed up."

    # Remove old OdooClaw block if present (idempotent)
    if grep -q "# OdooClaw Settings" "$env_file"; then
      log "Removing old OdooClaw settings block from ${env_file}..."
      sed -i.bak '/# OdooClaw Settings/,/# End OdooClaw Settings/d' "$env_file" && rm -f "${env_file}.bak"
    fi
  else
    touch "$env_file"
  fi

  {
    echo ""
    echo "# OdooClaw Settings"
    echo "ODOO_DB=${CFG_ODOO_DB}"
    echo "ODOO_USERNAME=${CFG_ODOO_USER}"
    echo "ODOO_PASSWORD=${CFG_ODOO_PASS}"
    echo ""
    echo "# LLM Provider"
    echo "OPENAI_API_KEY=${CFG_LLM_API_KEY}"
    echo "OPENAI_API_BASE=${CFG_LLM_API_BASE}"
    echo ""
    echo "# STT (OpenAI-compatible)"
    echo "STT_PROVIDER=auto"
    echo "STT_API_BASE=\${OPENAI_API_BASE}"
    echo "STT_API_KEY="
    echo "STT_OPENAI_MODEL=whisper-1"
    echo ""
    echo "# OdooClaw Gateway"
    echo "ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=${CFG_LLM_PROVIDER}"
    echo "ODOOCLAW_AGENTS_DEFAULTS_MODEL=${CFG_LLM_MODEL}"
    echo "ODOOCLAW_PROVIDERS_OPENAI_API_KEY=\${OPENAI_API_KEY}"
    echo "ODOOCLAW_PROVIDERS_OPENAI_API_BASE=\${OPENAI_API_BASE}"
    echo "ODOOCLAW_CHANNELS_ODOO_ENABLED=true"
    echo "ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0"
    echo "ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790"
    echo "ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo"
    echo "ODOOCLAW_CHANNELS_ODOO_ALLOW_FROM="
    echo "ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=false"
    echo "ODOOCLAW_CHANNELS_ODOO_REASONING_CHANNEL_ID="
    echo "ODOOCLAW_REDIS_URL=redis://redis:6379/0"
    echo "ODOOCLAW_JOB_STORE=odoo"
    echo "ODOOCLAW_WORKSPACE_PATH=/home/odooclaw/.odooclaw/workspace"
    if [ "$INSTALL_BROWSER_COPILOT" -eq 1 ]; then
      echo ""
      echo "# Browser Copilot"
      echo "BROWSER_COPILOT_TOKEN=${BC_TOKEN}"
      echo "BROWSER_COPILOT_ALLOWED_DOMAINS=${CFG_BC_DOMAINS}"
      echo "BROWSER_COPILOT_READ_ONLY=true"
    fi
    echo "# End OdooClaw Settings"
  } >> "$env_file"

  ok "Environment written to ${env_file}"

  # --- config.json ---
  if [ -f "$config_file" ] && [ -s "$config_file" ]; then
    warn "Existing config.json found at ${config_file}. Keeping it."
    warn "Review it manually to ensure provider/channel settings are correct."
  else
    cat > "$config_file" <<CONFIGJSON
{
  "agents": {
    "defaults": {
      "provider": "${CFG_LLM_PROVIDER}",
      "model": "${CFG_LLM_MODEL}"
    }
  },
  "channels": {
    "odoo": {
      "enabled": true,
      "webhook_host": "0.0.0.0",
      "webhook_port": 18790,
      "webhook_path": "/webhook/odoo",
      "allow_group_mentions": false
    }
  },
  "providers": {
    "openai": {
      "api_base": "${CFG_LLM_API_BASE}",
      "api_key": "\${OPENAI_API_KEY}"
    }
  },
  "tools": {
    "mcp": {
      "enabled": true,
      "servers": {
        "odoo-mcp": {
          "enabled": true,
          "command": "python3",
          "args": ["-m", "odoo_mcp.server"],
          "env": {
            "PYTHONUNBUFFERED": "1"
          }
        },
        "whisper-stt": {
          "enabled": true,
          "command": "whisper-stt-mcp.py",
          "args": [],
          "env": {
            "PYTHONUNBUFFERED": "1",
            "OPENAI_API_KEY": "\${OPENAI_API_KEY}",
            "STT_PROVIDER": "\${STT_PROVIDER}",
            "STT_API_BASE": "\${STT_API_BASE}",
            "STT_API_KEY": "\${STT_API_KEY}",
            "STT_OPENAI_MODEL": "\${STT_OPENAI_MODEL}"
          }
        },
        "edge-tts": {
          "enabled": true,
          "command": "edge-tts-mcp.py",
          "args": [],
          "env": {
            "PYTHONUNBUFFERED": "1"
          }
        },
        "ocr-invoice": {
          "enabled": true,
          "command": "ocr-invoice-mcp.py",
          "args": [],
          "env": {
            "PYTHONUNBUFFERED": "1",
            "VISION_API_BASE": "\${OPENAI_API_BASE}",
            "VISION_MODEL": "gpt-4o-mini",
            "OPENAI_API_KEY": "\${OPENAI_API_KEY}",
            "OCR_TIMEOUT_SECONDS": "240",
            "OCR_MAX_PAGES": "4",
            "OCR_IMAGE_DPI": "170"
          }
        },
        "rlm-utils": {
          "enabled": true,
          "command": "rlm-utils-mcp.py",
          "args": [],
          "env": {
            "PYTHONUNBUFFERED": "1",
            "WORKSPACE_PATH": "\${ODOOCLAW_WORKSPACE_PATH}"
          }
        }
      }
    }
  }
}
CONFIGJSON
    ok "Config written to ${config_file}"
  fi
}

# ============================================================================
# PHASE 6: Docker Compose setup
# ============================================================================
phase_docker_compose() {
  separator "Phase 6/7: Docker Compose setup"

  local compose_file="odooclaw.yaml"
  local has_yaml_include=0

  # Check if any existing compose file uses include: directive
  for f in devel.yaml prod.yaml docker-compose.yml; do
    if [ -f "$f" ] && grep -q "^include:" "$f" 2>/dev/null; then
      has_yaml_include=1
      break
    fi
  done

  # Generate the odooclaw.yaml compose file
  log "Generating ${compose_file}..."

  cat > "$compose_file" <<'COMPOSE_HEADER'
# OdooClaw services for Doodba stack
# Include this file in your docker-compose:
#   Option A (include directive): add "include: [odooclaw.yaml]" at the top of devel.yaml/prod.yaml
#   Option B (CLI flag): docker compose -f prod.yaml -f odooclaw.yaml up -d
COMPOSE_HEADER

  # odooclaw service
  cat >> "$compose_file" <<'ODOOCLAW_SVC'
services:
  odooclaw:
    build:
      context: ./odooclaw
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    env_file:
      - .docker/odoo.env
    environment:
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${ODOO_DB:-prod}
      - ODOO_USERNAME=${ODOO_USERNAME:-admin}
      - ODOO_PASSWORD=${ODOO_PASSWORD}
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=${ODOOCLAW_AGENTS_DEFAULTS_PROVIDER:-openai}
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=${ODOOCLAW_AGENTS_DEFAULTS_MODEL:-gpt-4o-mini}
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
      - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
      - ODOOCLAW_CHANNELS_ODOO_ALLOW_FROM=${ODOOCLAW_CHANNELS_ODOO_ALLOW_FROM:-}
      - ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=${ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS:-false}
      - ODOOCLAW_CHANNELS_ODOO_REASONING_CHANNEL_ID=${ODOOCLAW_CHANNELS_ODOO_REASONING_CHANNEL_ID:-}
      - ODOOCLAW_REDIS_URL=redis://redis:6379/0
      - ODOOCLAW_JOB_STORE=odoo
    ports:
      - "18790:18790"
    volumes:
      - odooclaw_data:/home/odooclaw/.odooclaw
      - ./odooclaw/config/config.json:/home/odooclaw/.odooclaw/config.json:ro
    depends_on:
      - odoo
      - redis
    networks:
      - default
ODOOCLAW_SVC

  # browser-copilot service (optional)
  if [ "$INSTALL_BROWSER_COPILOT" -eq 1 ]; then
    cat >> "$compose_file" <<'BC_SVC'

  browser-copilot:
    image: python:3.11-slim
    container_name: browser-copilot
    working_dir: /workspace
    restart: unless-stopped
    env_file:
      - .docker/odoo.env
    environment:
      - BROWSER_COPILOT_ALLOWED_DOMAINS=${BROWSER_COPILOT_ALLOWED_DOMAINS}
      - BROWSER_COPILOT_TOKEN=${BROWSER_COPILOT_TOKEN}
      - BROWSER_COPILOT_READ_ONLY=${BROWSER_COPILOT_READ_ONLY:-true}
    ports:
      - "127.0.0.1:8765:8765"
    volumes:
      - ./odooclaw:/workspace/odooclaw:ro
    command: >
      sh -lc "
      pip install --no-cache-dir -r /workspace/odooclaw/odooclaw/browser_copilot/requirements.txt &&
      uvicorn browser_copilot.app:app --host 0.0.0.0 --port 8765 --app-dir /workspace/odooclaw/odooclaw
      "
    depends_on:
      - odooclaw
    networks:
      - default
BC_SVC
  fi

  # redis service
  cat >> "$compose_file" <<'REDIS_SVC'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    restart: unless-stopped
    networks:
      - default
REDIS_SVC

  # volumes
  cat >> "$compose_file" <<'VOLUMES'

volumes:
  odooclaw_data:
VOLUMES

  ok "${compose_file} generated."

  # Auto-integrate include in common Doodba compose files
  integrate_odooclaw_include

  # --- Instructions for integration ---
  log "To integrate with your existing Doodba stack:"
  echo ""
  if [ "$has_yaml_include" -eq 1 ]; then
    printf "  ${GREEN}Option A (recommended):${RESET} The include directive is already in use.\n"
    printf "  Add this line at the top of your compose file:\n"
    printf "    ${BOLD}include:\n      - odooclaw.yaml${RESET}\n\n"
  else
    printf "  ${GREEN}Option A:${RESET} Add at the top of your prod.yaml or devel.yaml:\n"
    printf "    ${BOLD}include:\n      - odooclaw.yaml${RESET}\n\n"
  fi
  printf "  ${GREEN}Option B:${RESET} Use the -f flag when starting:\n"
  printf "    ${BOLD}docker compose -f prod.yaml -f odooclaw.yaml up -d${RESET}\n\n"
}

# ============================================================================
# PHASE 7: Post-install instructions
# ============================================================================
phase_post_install() {
  separator "Phase 7/7: Post-install steps"

  echo ""
  printf "${BOLD}${GREEN}Installation complete!${RESET}\n\n"
  printf "${BOLD}Follow these steps to finish setup:${RESET}\n\n"

  printf "  ${BOLD}1. Build and start the services:${RESET}\n"
  printf "     docker compose -f prod.yaml -f odooclaw.yaml build\n"
  printf "     docker compose -f prod.yaml -f odooclaw.yaml up -d\n\n"

  printf "  ${BOLD}2. In Odoo, install the module:${RESET}\n"
  printf "     Go to Apps -> search 'OdooClaw' -> Install\n\n"

  printf "  ${BOLD}3. Configure the webhook in Odoo:${RESET}\n"
  printf "     Go to Settings -> Technical -> Parameters -> System Parameters\n"
  printf "     Create: ${BOLD}odooclaw.webhook_url${RESET} = ${BOLD}http://odooclaw:18790/webhook/odoo${RESET}\n\n"

  printf "  ${BOLD}4. Test in Odoo Discuss:${RESET}\n"
  printf "     Open a conversation and type ${BOLD}@OdooClaw hello${RESET}\n\n"

  if [ "$INSTALL_BROWSER_COPILOT" -eq 1 ]; then
    printf "  ${BOLD}5. Browser Extension (optional):${RESET}\n"
    printf "     Load the extension from: ${BOLD}odooclaw/browser_extension/${RESET}\n"
    printf "     Open extension settings and set:\n"
    printf "       URL:   ${BOLD}http://127.0.0.1:8765${RESET}\n"
    printf "       Token: ${BOLD}${BC_TOKEN}${RESET}\n\n"
    printf "     If the Browser Copilot is behind a reverse proxy,\n"
    printf "     use your public URL instead (e.g. https://your-vps.com:8765).\n\n"
  fi

  printf "  ${BOLD}Files created:${RESET}\n"
  printf "     odooclaw/                    - Gateway source (build context)\n"
  printf "     odooclaw/config/config.json   - Agent configuration\n"
  printf "     odooclaw.yaml                 - Docker Compose services\n"
  printf "     .docker/odoo.env              - Environment variables (secrets)\n"
  if [ "$INSTALL_BROWSER_COPILOT" -eq 1 ]; then
    printf "     odoo/custom/src/private/mail_bot_odooclaw/ - Odoo module\n\n"
  else
    printf "\n"
  fi

  printf "  ${BOLD}Documentation:${RESET}\n"
  printf "     https://github.com/nicolasramos/odooclaw/tree/main/odooclaw/docs\n\n"

  printf "${YELLOW}WARNING: .docker/odoo.env contains secrets. Do NOT commit it to git.${RESET}\n"
}

# ============================================================================
# Main
# ============================================================================
main() {
  printf "\n${BOLD}OdooClaw Doodba Installer v${SCRIPT_VERSION}${RESET}\n"
  printf "${BOLD}https://github.com/nicolasramos/odooclaw${RESET}\n\n"

  phase_prerequisites
  phase_detect_version
  phase_clone_and_copy
  phase_configure
  phase_generate_configs
  phase_docker_compose
  phase_post_install
}

main "$@"
