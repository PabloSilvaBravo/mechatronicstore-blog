#!/usr/bin/env bash
# Purge Cloudflare cache para URLs del blog.
#
# Uso:
#   ./scripts/purge_cf_cache.sh                  # purga las URLs core del blog
#   ./scripts/purge_cf_cache.sh url1 url2 ...    # purga URLs específicas
#   ./scripts/purge_cf_cache.sh --everything     # purga TODO el sitio (cuidado)
#
# Requiere:
#   - .env.local con CLOUDFLARE_API_TOKEN (scope Zone:Cache Purge:Purge)
#                  y CLOUDFLARE_ZONE_ID
#
# Pablo 23-may-2026 — agregado tras descubrir que el cache de CF retiene
# HTML 4+ horas a pesar de cache-control max-age=3600. Sin purge explícito,
# los cambios al blog no se ven hasta varias horas después del deploy.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local no existe en $(pwd)" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env.local

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN o CLOUDFLARE_ZONE_ID no setteados en .env.local" >&2
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache"

if [[ "${1:-}" == "--everything" ]]; then
  echo "→ Purge EVERYTHING (todo el sitio mechatronicstore.cl)"
  PAYLOAD='{"purge_everything":true}'
elif [[ $# -gt 0 ]]; then
  echo "→ Purge URLs específicas:"
  printf '   %s\n' "$@"
  FILES_JSON=$(printf '%s\n' "$@" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")
  PAYLOAD="{\"files\":$FILES_JSON}"
else
  # Default: URLs core del blog
  echo "→ Purge URLs core del blog (default)"
  PAYLOAD='{"files":[
    "https://www.mechatronicstore.cl/blog",
    "https://www.mechatronicstore.cl/blog/",
    "https://www.mechatronicstore.cl/blog/tutoriales",
    "https://www.mechatronicstore.cl/blog/feed.xml",
    "https://www.mechatronicstore.cl/blog/sitemap.xml"
  ]}'
fi

RESPONSE=$(curl -s -X POST "$API_BASE" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD")

SUCCESS=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('success'))")

if [[ "$SUCCESS" == "True" ]]; then
  echo "✓ Cache purged successfully"
else
  echo "✗ Purge failed:"
  echo "$RESPONSE" | python3 -m json.tool >&2
  exit 1
fi
