# Routine F — Blog Weekly Digest

**Trigger ID**: (a generar en Task 13 vía RemoteTrigger)
**Cron**: `30 11 * * 1` (lunes 11:30 UTC = 08:30 CL típicamente)
**Modelo**: claude-opus-4-7
**Environment**: `env_01KH9dE3iry9ZaZhbrW59Gxm` (mechanoticias-prod-v4)
**Repo source**: `https://github.com/PabloSilvaBravo/mechatronicstore-blog`

## Propósito

Llamar el endpoint `POST /api/blog/digest/send` para gatillar el envío del
email digest semanal a Pablo. El endpoint hace TODO el trabajo (queries,
render React Email, Resend). La routine solo orquesta + verifica + commitea
log al repo.

## System prompt

```
Sos un agente CCR de Mecha Blog. Tu único trabajo es disparar el endpoint
de digest semanal y verificar que Resend lo aceptó. NO escribís código,
NO modificás contenido editorial. Sí escribís un log al repo con la
respuesta del endpoint.

Regla absoluta del ecosistema (lección 10-may-2026 propagada desde mechanews):
- Push DIRECTO a main, NO PR. Usá `git push origin HEAD:main` literal.
- NO crear branches claude/*, NO usar gh pr create.
- Si fallás esta regla, Vercel detecta el branch y envía email error +
  preview deploy roto.
```

## User prompt (template embebido en RemoteTrigger create)

```
Tarea: gatillar Routine F (Blog Weekly Digest).

Hoy es lunes UTC. Vas a llamar este endpoint en producción:

  POST https://www.mechatronicstore.cl/api/blog/digest/send
  Authorization: Bearer $DIGEST_API_TOKEN

El endpoint hace por sí solo:
  - Query tutoriales publicados últimos 7 días naturales
  - Query clicks tracking (tutorial_product_clicks) última semana
  - Renderiza React Email + envía vía Resend a pablo.silva.bravo.92@gmail.com

Pasos:

1. Set var de entorno con el token (hardcoded en el prompt del trigger):
   export DIGEST_API_TOKEN="<TOKEN_REAL_VA_AQUI_AL_CREAR_EL_TRIGGER>"

2. Llamá el endpoint con retry simple:

   curl -sS -w "\n%{http_code}\n" \
     -X POST "https://www.mechatronicstore.cl/api/blog/digest/send" \
     -H "Authorization: Bearer $DIGEST_API_TOKEN" \
     -H "content-type: application/json" \
     -d '{}' > /tmp/digest_response.txt
   STATUS=$(tail -1 /tmp/digest_response.txt)

   if [ "$STATUS" != "200" ]; then
     sleep 30
     curl -sS -w "\n%{http_code}\n" \
       -X POST "https://www.mechatronicstore.cl/api/blog/digest/send" \
       -H "Authorization: Bearer $DIGEST_API_TOKEN" \
       -H "content-type: application/json" \
       -d '{}' > /tmp/digest_response.txt
     STATUS=$(tail -1 /tmp/digest_response.txt)
   fi

   if [ "$STATUS" != "200" ]; then
     echo "FAILED status=$STATUS body=$(head -n -1 /tmp/digest_response.txt)"
     exit 1
   fi

3. Persistí log al repo:

   mkdir -p data
   head -n -1 /tmp/digest_response.txt > data/last-blog-digest.json
   echo "{\"sent_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"status\":$STATUS,\"response\":$(cat data/last-blog-digest.json)}" > data/last-blog-digest-meta.json

   git checkout main 2>/dev/null || true
   git pull --rebase origin main
   git add data/last-blog-digest.json data/last-blog-digest-meta.json
   git commit -m "chore(digest): blog weekly digest sent $STATUS"
   git push origin HEAD:main

4. Reportá en stdout: status code, resend_id, published, total_clicks_week.
```

## Output esperado del endpoint

```json
{
  "ok": true,
  "resend_id": "re_abc123def456",
  "published": 1,
  "total_clicks_week": 4,
  "window": {
    "from": "2026-05-10 00:00:00",
    "to": "2026-05-17 00:00:00"
  }
}
```

## Manejo de errores

| Status | Causa | Acción de la routine |
|--------|-------|----------------------|
| 401 | DIGEST_API_TOKEN rotado / mal pasado | Falla, exit 1 (Pablo debe revisar token) |
| 500 send_failed | Resend caído / SMTP issue | Reintento +30s, si vuelve a fallar abort + commit error |
| 500 server_misconfigured | env vars perdidas en Vercel | Falla, exit 1 |
| 200 ok | Email enviado | Commit log + reporte stdout |

## Notas operativas

- El endpoint asume cron @lunes 11:30 UTC. Si cambiás el cron, la ventana
  semanal (calculada en `weekRange()` en `src/app/api/blog/digest/send/route.ts`)
  NO se ajusta — siempre toma `[hoy_00UTC - 7d, hoy_00UTC)`. Si querés
  digest diario o bisemanal, ajustar ambos (cron + función).
- `DIGEST_TO_EMAIL` hardcoded a Pablo. Si querés expandir a subscribers,
  refactor a array y loop. Spec sec 8.0 sugiere lista de suscriptores como
  evolución post-MVP.
- `DIGEST_FROM_EMAIL` es `blog@mechatronicstore.cl`. Verificar que el dominio
  esté verificado en Resend (DNS records SPF + DKIM) o usar el
  `onboarding@resend.dev` como fallback inicial.
- El token `DIGEST_API_TOKEN` está hardcoded en el system prompt del trigger
  CCR (al crearlo). Para rotar: actualizar env var en Vercel + recrear el
  trigger con `RemoteTrigger action=update`.
