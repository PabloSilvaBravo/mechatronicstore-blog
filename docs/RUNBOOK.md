# MechatronicStore Blog — Operational Runbook

**Versión:** v0.7.0 — 17-may-2026
**Owner:** Pablo Silva Bravo
**Stack:** Next.js 16 + Turso + Vercel + Cloudflare Worker proxy-blog + CCR routines (opus-4-7)

---

## 1. Pipeline diario automático

| Hora UTC | Routine | Trigger ID | Propósito |
|----------|---------|-----------|-----------|
| 04:00 | A — Ingest | (GH Actions workflow) | Scrape RSS sources → `status=draft` |
| 06:30 | B — Ranking | (en `docs/routines/blog-ranking-prompt.md`) | Score con 7 dimensiones, threshold cs ≥ 0.78 → `ranked` |
| 12:00 | C — Translation | (en `docs/routines/blog-translation-prompt.md`) | Reescritura ES-CL + MCP product detection → `published` |
| Lun 11:30 | F — Weekly Digest | `trig_016Sdy532XtZq8d3khNY9SKi` | Email Pablo con publicados + métricas semana |

Trigger IDs reales viven en `docs/routines/*.md`. Si necesitas actualizar
un prompt: editar el `.md`, luego `RemoteTrigger action=update` (Anthropic
Cloud API).

---

## 2. Healthchecks

### Endpoint público

```
GET https://www.mechatronicstore.cl/api/blog/health
```

Respuesta esperada:
```json
{
  "ok": true,
  "service": "mecha-blog",
  "db": { "connected": true, "tutorials_count": 47 },
  "latency_ms": 120,
  "timestamp": "2026-05-17T..."
}
```

Si retorna 5xx:
1. Verificar `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` en Vercel env
2. `vercel logs` (production) para stack trace
3. Probar Turso shell directo: `turso db shell mechatronicstore-blog-db "SELECT COUNT(*) FROM tutorials"`

### CF Worker

```
GET https://www.mechatronicstore.cl/blog
```

Si retorna 403 o WP page (no el Next.js blog): el worker no está rebooting
o la route fue removida. Verificar:
```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_BLOG" \
  "https://api.cloudflare.com/client/v4/zones/4790b16d56036e02ea68d43c29851201/workers/routes" \
  | python3 -c "import sys, json; [print(r['pattern']) for r in json.load(sys.stdin)['result'] if r['script']=='proxy-blog']"
```

Esperado: 8 routes (`/blog*`, `/api/blog*`, `/admin/blog*`, `/_next/*` x 2 cada uno).

---

## 3. Publicar manualmente un tutorial (skip pipeline)

1. Ir a `https://www.mechatronicstore.cl/admin/blog/queue` (CF Access OTP)
2. Identificar el draft deseado
3. Click "Force Publish"
4. Verificar que aparece en `https://www.mechatronicstore.cl/blog/{slug}` en <2 minutos

Si "Force Publish" falla:
- Verificar que el tutorial tiene `title_es`, `body_es`, `materials_list_json` y `linked_products_json` no nulos
- Si falta traducción: el botón llama `UPDATE tutorials SET status='published', published_at=datetime('now')` directamente

---

## 4. Sources RSS — activar/desactivar

### Via admin UI

`/admin/blog/sources` → toggle "Activa" (server action `toggleSourceActive`).

### Via SQL directo

```bash
turso db shell mechatronicstore-blog-db <<SQL
UPDATE sources SET is_active = 0 WHERE id = 'instructables';
SELECT id, name, is_active FROM sources ORDER BY id;
SQL
```

---

## 5. Bajar threshold cs para que pasen más tutoriales

Si la queue queda vacía durante varios días, bajar el threshold:

1. Editar `docs/routines/blog-ranking-prompt.md` línea con `cs >= 0.78`
2. Cambiar a `cs >= 0.75` (o 0.72 si seguís sin notas)
3. `RemoteTrigger action=update trigger_id=<ranking_trigger>` con el prompt nuevo

Datos para ajustar:
- `/admin/blog/queue` muestra cuántos drafts hay esperando
- `/admin/blog/rejected` agrupa por razón de rechazo

---

## 6. CF Access — agregar admin user

1. dash.cloudflare.com → Zero Trust → Access controls → Applications
2. "MechatronicStore Blog Admin" → Policies tab → "Only Pablo"
3. En **Include rule**: agregar nuevo Email
4. Save

El nuevo user verá la pantalla OTP al ir a `/admin/blog`.

---

## 7. Investigar drop en conversión

1. `/admin/blog/conversion` — totales últimos 30 días
2. Si CTR cae bruscamente:
   - Verify Routine F sigue corriendo (último `data/last-blog-digest-meta.json` reciente)
   - SQL: `SELECT COUNT(*), source FROM tutorial_product_clicks WHERE clicked_at >= datetime('now', '-7 days') GROUP BY source`
   - Verificar que `MaterialsList` y `BuyAllButton` no tienen errores JS en consola del browser

3. Si `material_list` = 0 clicks pero `buy_all` > 0: probablemente fuzzy match de productos no encuentra coincidencias → revisar `linked_products_json` para los tutoriales recientes

---

## 8. Rotar `DIGEST_API_TOKEN`

```bash
# 1. Generar nuevo
NEW=$(openssl rand -hex 32)
echo "NEW: $NEW"

# 2. Reemplazar en Vercel
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
vercel env rm DIGEST_API_TOKEN production --yes
echo "$NEW" | vercel env add DIGEST_API_TOKEN production

# 3. Re-deploy (push trivial commit o vercel --prod)
git commit --allow-empty -m "chore: rotate digest token" && git push origin HEAD:main

# 4. Update CCR routine F (RemoteTrigger action=update) embebiendo el
#    nuevo token en el shell script del user prompt
```

---

## 9. Silent-failure alerts (TODO post-MVP)

Spec sec 7.2: si Routine C (translate) no escribe en >48h, debería disparar
email CRIT. **Implementación pendiente** — escribir healthcheck cron en
GH Actions que consulte:

```sql
SELECT MAX(translated_at) FROM tutorials WHERE status = 'published'
```

Si diff vs `now()` > 48h, enviar email vía Resend a Pablo.

---

## 10. Comandos útiles

```bash
# Ver últimos tutoriales publicados
turso db shell mechatronicstore-blog-db <<SQL
SELECT slug, published_at, combined_score FROM tutorials
WHERE status = 'published' ORDER BY published_at DESC LIMIT 10;
SQL

# Ver últimos clicks
turso db shell mechatronicstore-blog-db <<SQL
SELECT tutorial_slug, source, product_name, clicked_at
FROM tutorial_product_clicks ORDER BY clicked_at DESC LIMIT 20;
SQL

# Build local
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && npm run build

# Tests
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && npm test

# Re-deploy worker
curl -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_BLOG" \
  -F 'metadata={"main_module":"index.js","compatibility_date":"2026-03-01"};type=application/json' \
  -F "index.js=@src/workers/proxy-blog.js;type=application/javascript+module" \
  "https://api.cloudflare.com/client/v4/accounts/d28aa0b4615df08260acd468c0ede343/workers/scripts/proxy-blog"

# Forzar re-deploy Vercel
git commit --allow-empty -m "chore: redeploy" && git push origin HEAD:main
```
