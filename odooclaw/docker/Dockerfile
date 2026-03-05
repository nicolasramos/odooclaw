# ============================================================
# Stage 1: Build the odooclaw binary
# ============================================================
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git make

WORKDIR /src

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN make build

# ============================================================
# Stage 2: Runtime image (Debian-based for AI compatibility)
# ============================================================
# We use python:3.11-slim instead of Alpine because AI libraries 
# (whisper, numpy, etc.) have pre-built wheels for Debian/glibc.
# Compiling them on Alpine (musl) is slow, error-prone and fragile.
FROM python:3.11-slim

# Install system dependencies
# ffmpeg: required for audio processing
# curl: for healthcheck
# ca-certificates: for HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# openai-whisper: local STT (includes CLI and torch)
# edge-tts: text-to-speech
# pandas/openpyxl: for excel processing
RUN pip install --no-cache-dir \
    pandas \
    openpyxl \
    xlrd \
    requests \
    edge-tts \
    aiohttp \
    openai-whisper

# Pre-download whisper model small (so it doesn't download on first use)
RUN python3 -c "import whisper; whisper.load_model('small')" || echo "Model pre-download skipped"

# Create non-root user and group
RUN groupadd -r odooclaw && useradd -r -g odooclaw -u 1000 -m odooclaw

# Copy binary from builder
COPY --from=builder /src/build/odooclaw /usr/local/bin/odooclaw

# Copy Odoo MCP server script
COPY workspace/skills/odoo-manager/server.py /usr/local/bin/odoo-mcp.py
RUN chmod +x /usr/local/bin/odoo-mcp.py

# Copy Edge TTS MCP server script
COPY workspace/skills/edge-tts/server.py /usr/local/bin/edge-tts-mcp.py
RUN chmod +x /usr/local/bin/edge-tts-mcp.py

# Copy Whisper STT MCP server script
COPY workspace/skills/whisper-stt/server.py /usr/local/bin/whisper-stt-mcp.py
RUN chmod +x /usr/local/bin/whisper-stt-mcp.py

# Create cache directory for whisper models
RUN mkdir -p /home/odooclaw/.cache && \
    chown -R odooclaw:odooclaw /home/odooclaw

# Switch to non-root user
USER odooclaw
WORKDIR /home/odooclaw

# Run onboard to create initial directories and config
RUN /usr/local/bin/odooclaw onboard

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:18790/health || exit 1

ENTRYPOINT ["odooclaw"]
CMD ["gateway"]