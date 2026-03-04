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
# Stage 2: Minimal runtime image
# ============================================================
FROM alpine:3.23

RUN apk add --no-cache ca-certificates tzdata curl python3 py3-pip && \
  pip install pandas openpyxl xlrd requests --break-system-packages

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:18790/health || exit 1

# Copy binary
COPY --from=builder /src/build/odooclaw /usr/local/bin/odooclaw

# Copy Odoo MCP server script
COPY workspace/skills/odoo-manager/server.py /usr/local/bin/odoo-mcp.py
RUN chmod +x /usr/local/bin/odoo-mcp.py

# Create non-root user and group
RUN addgroup -g 1000 odooclaw && \
  adduser -D -u 1000 -G odooclaw odooclaw

# Switch to non-root user
USER odooclaw

# Run onboard to create initial directories and config
RUN /usr/local/bin/odooclaw onboard

ENTRYPOINT ["odooclaw"]
CMD ["gateway"]
