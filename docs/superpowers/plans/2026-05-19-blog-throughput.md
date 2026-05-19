# Blog Throughput x3 — Implementation Plan (v2 corregido)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (modo AUTONOMO inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasar el pipeline `ingest → rank → translate → publish` de ~1-2 tutoriales/día a **2-4 sostenidos** con 4 cambios estructurales reversibles.

**Tech Stack:** Python 3.12 + libsql (Turso) + GitHub Actions cron + Anthropic Cloud Routines (CCR) modificadas via RemoteTrigger API.

---

## ⚠️ Cambio de hipótesis (post-investigación)

**v1 asumía** que los `steps_below_5` eran subdetección de regex → relajar filtros.

**v2 confirma** (sample real DB):
- Tutoriales Adafruit Learn tienen títulos `"Overview | <título>"` — solo scrapeamos la **página overview**, no las subpáginas con materials/code/steps. `body_en` queda con ~500-900 words sin code ni steps reales.
- Tutoriales Hackaday: el feed trae el primer párrafo (~300-500 words). Falta el resto.
- Tom's Hardware: 100% noticias (no tutoriales). Por eso ya está inactiva.
- Random-Nerd: ingest OK, pero algunos rejected por `cs=0.74 < 0.78` están **justo abajo** del threshold.

**Conclusión**: relajar filtros era **incorrecto** — habría abierto la compuerta a noticias sin rescatar los tutoriales reales. La raíz son **bodies truncados** + **threshold sin margen**.

---

## 4 cambios estructurales correctos

### Cambio 1 — Re-fetch rejected con HTML completo (`refetch_rejected.py`)

Ya existe `scripts/refetch_rejected.py` (tier-1: adafruit + hackaday + instructables + random-nerd + sparkfun). Re-fetchea el body_html completo de cada `source_url` y vuelve a `apply_all`. Si pasa filtros, promueve `rejected` → `draft`.

**Ejecutar AHORA** con `--limit 30` para rescatar los rejected del último ciclo. Esperar 5-15 promotes.

### Cambio 2 — Bajar `THRESHOLD` 0.78 → 0.72

Cuando los re-fetched + futuros ingests entren al rank, queremos que los borderline-OK (cs 0.72-0.78) pasen. 0.72 = 7.2/10 promedio en 7 dimensiones — sigue descartando basura.

### Cambio 3 — Cron Routines B + C 1×/día → 3×/día

Procesar más rápido el material rescatado + flujo continuo (no acumulación).

- Rank: `30 6 * * *` → `30 4,12,20 * * *` UTC (cada 8h)
- Translate: `0 12 * * *` → `0 6,14,22 * * *` UTC (2h después del rank)

### Cambio 4 — Workflow nuevo `blog-refetch-weekly.yml` (rescate sostenido)

Para que el rescate del Cambio 1 sea automático y no manual. Cron `0 5 * * 0` (domingo 05:00 UTC = sábado 01:00 CL). Ejecuta `refetch_rejected.py --limit 50`. Esto convierte el script existente en una pieza permanente del pipeline.

---

## Tasks

### Task 1: Ejecutar refetch_rejected.py (rescate inmediato)

- [ ] **1.1** `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 scripts/refetch_rejected.py --limit 30 --sleep 1 2>&1 | tail -40`
- [ ] **1.2** Verificar counts: `python3 -c "import sys; sys.path.insert(0,'scripts'); import db; print(dict(db.execute('SELECT status, COUNT(*) FROM tutorials GROUP BY status').fetchall()))"`. Expected: `draft` > 0.

### Task 2: Bajar THRESHOLD

- [ ] **2.1** Editar `scripts/persist_blog_rankings.py:15` → `THRESHOLD = 0.72`.
- [ ] **2.2** Editar `docs/routines/blog-ranking-prompt.md` → cambiar mención de `0.78` a `0.72`.
- [ ] **2.3** Commit: `git add scripts/persist_blog_rankings.py docs/routines/blog-ranking-prompt.md && git commit -m "feat(scoring): threshold 0.78 → 0.72 para borderline-OK"`.

### Task 3: Cron Routines B + C 1×/día → 3×/día

- [ ] **3.1** `RemoteTrigger(action=update, trigger_id=trig_018awZKUDjfX8JqWmh5x5Mi4, body={cron_expression: "30 4,12,20 * * *"})` — Rank
- [ ] **3.2** `RemoteTrigger(action=get, trigger_id=trig_018awZKUDjfX8JqWmh5x5Mi4)` — verificar
- [ ] **3.3** `RemoteTrigger(action=update, trigger_id=trig_012SUx3X96ndwjTdzWs4RKZp, body={cron_expression: "0 6,14,22 * * *"})` — Translate
- [ ] **3.4** `RemoteTrigger(action=get, trigger_id=trig_012SUx3X96ndwjTdzWs4RKZp)` — verificar
- [ ] **3.5** Actualizar docs/routines/*.md con los nuevos crones
- [ ] **3.6** Commit docs

### Task 4: Nuevo workflow `blog-refetch-weekly.yml`

- [ ] **4.1** Crear `.github/workflows/blog-refetch-weekly.yml` con cron `0 5 * * 0` que corre `python3 scripts/refetch_rejected.py --limit 50`
- [ ] **4.2** Commit

### Task 5: Verificación

- [ ] **5.1** Trigger run de Routine B (rank) ahora si Task 1 produjo drafts: `RemoteTrigger(action=run, trigger_id=trig_018awZKUDjfX8JqWmh5x5Mi4)`
- [ ] **5.2** Esperar 5-10 min + verificar commit rank en main
- [ ] **5.3** Merge `audit/deep-2026-05-19` → `main` + push

---

## Rollback

Si throughput baja o calidad cae:
1. `git revert` los commits 2, 3 (docs), 4
2. `RemoteTrigger update` con crones originales:
   - Rank `30 6 * * *`
   - Translate `0 12 * * *`
3. Los drafts rescatados (Task 1) NO se revierten — son ganancia genuina.
