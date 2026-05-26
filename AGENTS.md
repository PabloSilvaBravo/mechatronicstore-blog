# AGENTS.md — mechatronicstore-blog

Notas operativas para agentes Claude trabajando en este repo.

---

## REGLA AUTOMÁTICA: purgar cache de Cloudflare tras CADA push visible

**TL;DR**: después de cualquier `git push origin HEAD:main` que toque archivos del blog (`src/app/blog/**`, `src/app/components/**`, `src/app/globals.css`, `public/blog/**`, `next.config.*`, `tailwind.config.*`), correr **inmediatamente**:

```bash
./scripts/purge_cf_cache.sh
```

**Sin esto**, Cloudflare retiene el HTML cacheado 4+ horas (a pesar del `cache-control: max-age=3600`) y los cambios visuales del blog no se ven hasta varias horas después del deploy. Pablo NO debería tener que pedirlo cada vez — es tarea automática del agente que hace el push.

### IMPORTANTE — qué purga el script

El script (v2, 23-may-2026) ahora purga **HTML core + TODOS los chunks `_next/static/*` referenciados por el HTML actual** (típicamente ~25-30 URLs por batch). Esto es crítico porque:

- Los SVG inline (iconos cart/user, etc.), inline styles del JSX, todo el código React, vive en los **chunks JS** de Next.js (`_next/static/chunks/*.js`).
- Si solo purgás el HTML (versión v1 del script), el navegador recibe HTML fresh pero los chunks JS vienen del cache viejo → no se ven los cambios visuales.
- Pablo descubrió este bug el 23-may: tras un commit de iconos, el script v1 purgó solo el HTML, los iconos seguían viéndose viejos hasta que Pablo hizo "Purge Everything" desde el dashboard Cloudflare. v2 detecta automáticamente los chunks del HTML y los incluye.

### Flujo completo de un cambio visual al blog

```bash
# 1. aplicar cambios al código
# 2. typecheck
npx tsc --noEmit -p .
# 3. commit + push directo a main (regla del proyecto, no PR)
git add -u
git commit -m "fix(...): ..."
git push origin HEAD:main
# 4. PURGAR CACHE (auto, sin que Pablo lo pida)
./scripts/purge_cf_cache.sh
```

Después de eso, el cambio es inmediatamente visible al recargar `mechatronicstore.cl/blog`.

### Cuándo NO purgar

- Cambios solo a `data/**`, `docs/**`, `scripts/**`, archivos no servidos al public — no cambia el HTML/JS público, purga sería inútil.
- Cambios al pipeline de ranking/translation que NO emiten HTML al blog — idem.

### Requisitos del script

`scripts/purge_cf_cache.sh` lee `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ZONE_ID` de `.env.local` (gitignored). Si el script falla con `Authentication error`, el token actual probablemente expiró o tiene scope incorrecto — pedirle a Pablo que cree uno nuevo con `Zone:Cache Purge:Purge` para `mechatronicstore.cl`.

### Variantes del script

- `./scripts/purge_cf_cache.sh` → URLs core del blog (default)
- `./scripts/purge_cf_cache.sh URL1 URL2 ...` → URLs específicas
- `./scripts/purge_cf_cache.sh --everything` → purga TODO el sitio (cuidado, también afecta store)

Para cambios a tutoriales individuales (post-translate), agregar la URL del slug:
```bash
./scripts/purge_cf_cache.sh https://www.mechatronicstore.cl/blog/SLUG-DEL-TUTORIAL
```

---

## REGLA: post-translate R2 rehost después de cada Routine C

Routine C corre en CCR cloud que NO tiene env vars de R2 (Cloudflare
creds viven solo en `.env.local` y `.env` de la VPS Dashboard). Eso
significa que cuando la routine persiste un tutorial nuevo, las URLs
de imágenes inline en `body_es` markdown y `steps[].image_url`
quedan APUNTANDO a la source externa (i0.wp.com, geekfactory.mx,
soloelectronicos.com, etc.).

Esas URLs son vulnerables a hotlink protection — se rompen en cuanto
la source las bloquea por referrer. Para inmunizar:

```bash
# Detecta tutoriales modificados en últimas 24h con URLs externas,
# rehospede TODAS las imágenes a R2 (images.mechatronicstore.cl).
python3 scripts/post_translate_rehost.py --hours 24

# O por ID específico
python3 scripts/post_translate_rehost.py --ids 1ec722f7c21b ca35c83050a0
```

Cuándo correrlo:
- Después de cada `RemoteTrigger run` de Routine C manual
- Cuando aparece nuevo commit `chore(translate): blog translated N tutoriales`
  en git (autor "Claude") — ese es el marker visible en `git log`

Pendiente automatizar via GH Actions workflow que escuche commits
de translate y dispare el script. Por ahora MANUAL pero documentado.

## Setup R2 actual (NO MIGRAR a bucket nuevo)

Pablo 24-may-2026 (cierre de Discovery falso alert): la infraestructura
de Cloudflare R2 para imágenes del blog YA EXISTE y funciona. NO crear
buckets nuevos, NO refactor a S3/boto3, NO duplicar tokens.

**Setup operacional**:
- **Bucket**: `mechanoticias-images` (compartido con MechaNoticias bajo
  prefix `articles/blog/<tutorial_id>/<hash>.<ext>`)
- **Domain público**: `https://images.mechatronicstore.cl`
- **Protocolo**: Cloudflare API directa (`requests` → `/r2/buckets/...`),
  NO S3
- **Cliente Python**: `scripts/r2_uploader.py` (`rehost_hero()` y helpers)
- **Env vars en GH Secrets**:
  - `CLOUDFLARE_API_TOKEN_R2` (o fallback `CLOUDFLARE_API_TOKEN`)
  - `CLOUDFLARE_ACCOUNT_ID`
  - `R2_REHOST_ENABLED=1`

**Hooks ya activos**:
- `blog-ingest.yml` rehospede heros nuevos a R2 automáticamente
  (env `R2_REHOST_ENABLED`)
- `scripts/post_translate_rehost.py` rehospede inline images del body
  post-Routine C (ver sección "REGLA post-translate R2 rehost" arriba)

**Estado del backfill** (al 24-may-2026):
- 22/36 tutoriales published con hero en R2 (61%)
- 14/36 con hero upstream (components101, electroniclinic, pimylifeup, etc.)
- Backfill ejecutado 21-may, commit `843acbe`
- `heros_broken` del monitor: 23/30 → 0/30 después del backfill

**Si en el futuro recibís un alert `heros_broken`**:
1. PRIMERO chequeá si es alert viejo (`gh run list --workflow=blog-monitor.yml`
   te muestra el timestamp real)
2. Si el alert es reciente, correr `python3 scripts/monitor_pipeline.py`
   local para confirmar — puede ser stale
3. Si efectivamente hay heros nuevos rotos, correr
   `python3 scripts/backfill_heros_to_r2.py --apply`
4. NO crear bucket nuevo, NO refactor a S3, NO migrar a `cdn-blog.*`

Los 14 heros upstream restantes NO son críticos (sirven OK desde sus
sources al momento del check) — no se tocan por defensa preventiva
hasta que efectivamente fallen.

## Otras reglas del proyecto

### Push directo a `main`, NO PRs

Regla absoluta del ecosistema MechatronicStore. NO crear branches `claude/*`. NO abrir PRs. Push directo a `main` con `git push origin HEAD:main` (destino explícito, evita que CCR routines abran branches automáticas).

### Vercel ignoreCommand y shallow clone

`vercel.json` original tenía un `ignoreCommand` que rompía con shallow clones (Vercel hace `depth=1`, `HEAD^` no resuelve, `git diff` falla). Si volvés a agregar un ignoreCommand, **chequear primero `git rev-parse HEAD^` y si falla, asumir "deploy"** (exit 1). Ver commit `c075c4f` para el patrón correcto.

### Cuando deploys quedan en Error sin tiempo

Si en el dashboard Vercel ves todos los deploys del blog en "Error —" sin tiempo, casi siempre es un `ignoreCommand` malformado que falla pre-build. Bisección: comentá el `ignoreCommand` entero, push, ver si vuelve a deployar. Si sí, el problema era el ignoreCommand.

### Skills y slash commands

Pablo mantiene skills SIEMPRE en `~/.claude/skills/<nombre>.md` (global), nunca en `.claude/skills/` del proyecto. Si una skill se acumula info específica del blog, va igual en global, con descripción que aclare cuándo aplica.
