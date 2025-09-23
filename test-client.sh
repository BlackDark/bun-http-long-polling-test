#!/bin/bash

# Test long polling client using curl
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}
TIMEOUT=${TIMEOUT:-5000}

echo "Testing long polling with timeout: $TIMEOUT ms"
curl -v "$BACKEND_URL/poll?timeout=$TIMEOUT"