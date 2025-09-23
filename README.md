# HTTP Long Polling POC

A simple HTTP long polling server built with Bun and TypeScript, with optional Hono framework variant.

## Features

- Long polling endpoint at `/poll` with configurable timeout
- Health check endpoints at `/` and `/health`
- Two variants: plain Bun or Hono framework
- Dockerized for easy deployment
- !!! only `arm64` published images

## Building

```bash
# Build all services
docker-compose build

# Or build specific
docker-compose build backend
docker-compose build client
```

## Running

### Default (Plain Bun)

```bash
docker-compose up backend
```

### Hono Variant

```bash
FRAMEWORK=hono docker-compose up backend
```

### With Client

```bash
docker-compose up
```

## Testing

### Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Long Polling

```bash
# Default 10s timeout
curl -v http://localhost:3000/poll

# Custom timeout (5s)
curl -v "http://localhost:3000/poll?timeout=5000"
```

### Local Development

```bash
# Install dependencies
pnpm install

# Run plain variant
bun run server.ts

# Run Hono variant
FRAMEWORK=hono bun run server.ts

# Or directly
bun run server-hono.ts
```
