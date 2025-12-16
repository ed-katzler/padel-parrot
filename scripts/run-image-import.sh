#!/bin/bash

# Run the racket image import script
# Usage: ./run-image-import.sh <service_role_key>

if [ -z "$1" ]; then
  echo "Usage: ./run-image-import.sh <service_role_key>"
  echo ""
  echo "Get the service_role key from:"
  echo "  Supabase Dashboard > PadelParrot V2 > Settings > API > service_role"
  exit 1
fi

export SUPABASE_SERVICE_ROLE_KEY="$1"

cd "$(dirname "$0")/.."
npx ts-node scripts/import-racket-images-local.ts
