#!/usr/bin/env bash
# Purge Cloudflare cache para el blog Next.js (HTML + chunks JS/CSS).
#
# Uso:
#   ./scripts/purge_cf_cache.sh                  # purga HTML core + chunks Next.js detectados
#   ./scripts/purge_cf_cache.sh url1 url2 ...    # solo purga URLs específicas
#   ./scripts/purge_cf_cache.sh --everything     # purga TODO mechatronicstore.cl (también store WP — cuidado)
#
# Requiere:
#   - .env.local con CLOUDFLARE_API_TOKEN (scope Zone:Cache Purge:Purge)
#                  y CLOUDFLARE_ZONE_ID
#
# Pablo 23-may-2026 v2 — versión inicial solo purgaba HTML, pero los SVG
# inline (iconos cart/user, etc.) viven dentro de chunks JS de Next.js
# (_next/static/chunks/*.js). Sin purgar esos chunks, Cloudflare seguía
# sirviendo la versión vieja del JS aunque el HTML estuviera fresh.
# Esta v2 parsea el HTML actual del blog y extrae todos los chunks
# referenciados para purgarlos junto con el HTML.

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
BLOG_BASE="https://www.mechatronicstore.cl"

purge_files() {
  local payload="$1"
  local response
  response=$(curl -s -X POST "$API_BASE" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$payload")
  local success
  success=$(echo "$response" | python3 -c "import json,sys; print(json.load(sys.stdin).get('success'))")
  if [[ "$success" == "True" ]]; then
    return 0
  else
    echo "Purge response: $response" >&2
    return 1
  fi
}

if [[ "${1:-}" == "--everything" ]]; then
  echo "→ Purge EVERYTHING (todo el dominio mechatronicstore.cl)"
  if purge_files '{"purge_everything":true}'; then
    echo "✓ Cache purged successfully"
  else
    echo "✗ Purge failed" >&2; exit 1
  fi
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "→ Purge URLs específicas (solo HTML/static, sin auto-discover chunks):"
  printf '   %s\n' "$@"
  files_json=$(printf '%s\n' "$@" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")
  if purge_files "{\"files\":$files_json}"; then
    echo "✓ Cache purged successfully"
  else
    echo "✗ Purge failed" >&2; exit 1
  fi
  exit 0
fi

# Default: purgar HTML core del blog + todos los chunks Next.js
# referenciados por el HTML actual.
echo "→ Purgando HTML core + chunks Next.js auto-detectados"

# 1. URLs HTML core
CORE_URLS=(
  "$BLOG_BASE/blog"
  "$BLOG_BASE/blog/"
  "$BLOG_BASE/blog/tutoriales"
  "$BLOG_BASE/blog/feed.xml"
  "$BLOG_BASE/blog/sitemap.xml"
)

# 2. Auto-detectar chunks JS/CSS del HTML actual
echo "  Detectando chunks Next.js del HTML actual..."
HTML_CONTENT=$(curl -s "$BLOG_BASE/blog?cb=$(date +%s%N)" || true)

if [[ -z "$HTML_CONTENT" ]]; then
  echo "⚠ No pude obtener el HTML del blog. Purgando solo HTML core." >&2
  CHUNK_URLS=()
else
  # Extraer todos los _next/static/* (chunks + media)
  # Bash 3.x compat — usar while read en vez de mapfile.
  CHUNK_URLS=()
  while IFS= read -r path; do
    [[ -n "$path" ]] && CHUNK_URLS+=("$BLOG_BASE/$path")
  done < <(echo "$HTML_CONTENT" | grep -oE '_next/static/[^"'\''[:space:]]+' | sort -u)
  echo "  Detectados ${#CHUNK_URLS[@]} chunks/assets"
fi

ALL_URLS=("${CORE_URLS[@]}" "${CHUNK_URLS[@]}")

# 3. Cloudflare API limita a 30 URLs por request (free plan). Chunk en batches.
BATCH_SIZE=30
TOTAL=${#ALL_URLS[@]}
BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
echo "  Total URLs a purgar: $TOTAL en $BATCHES batch(es)"

PURGED=0
for ((i = 0; i < TOTAL; i += BATCH_SIZE)); do
  BATCH=("${ALL_URLS[@]:i:BATCH_SIZE}")
  files_json=$(printf '%s\n' "${BATCH[@]}" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")
  if purge_files "{\"files\":$files_json}"; then
    PURGED=$((PURGED + ${#BATCH[@]}))
    printf "  ✓ Batch %d/%d (%d URLs)\n" $((i / BATCH_SIZE + 1)) "$BATCHES" "${#BATCH[@]}"
  else
    echo "  ✗ Batch $((i / BATCH_SIZE + 1)) falló" >&2
    exit 1
  fi
done

echo "✓ Purge completo — $PURGED URLs invalidadas en Cloudflare"
