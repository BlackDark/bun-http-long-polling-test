#!/bin/bash

# Test server-sent events client using curl
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}
TIMEOUT=${TIMEOUT:-5000}
INTERVAL=${INTERVAL:-500}

echo "Testing SSE with timeout: $TIMEOUT ms, interval: $INTERVAL ms"
curl -N -v "$BACKEND_URL/poll?timeout=$TIMEOUT&interval=$INTERVAL"