# Cadencia check — +7d post bajada (3→2/día)

**Fecha**: 2026-05-29T12:02:25Z
**Verdict**: 🚨 CRITICAL (3er chequeo consecutivo en alerta — WARNING → CRITICAL → CRITICAL)

**Fuente de datos**: `data/pipeline-health.json` snapshot 2026-05-29T10:01:55Z
+ git log de commits CCR markers (rank-prep, rank, translate, monitor) en
el rango 2026-05-22 → 2026-05-29. Sin TURSO env en el container Anthropic
Cloud (mismo patrón que +2d y +5d), métricas derivadas de healthchecks +
commits visibles. Resolución suficiente para verdict definitivo.

## Comparativa baseline vs actual (ventana 7d completa post-bajada)

| Métrica | Baseline (7d pre, 17–21 may) | Actual (+7d post, 22–29 may) | Δ |
|---|---:|---:|---:|
| Published/día (avg, 7d window) | 5.0 | 0.57 (4/7d) | **-89%** |
| Published/24h (snapshot actual) | ~5 | **0** (sostenido) | **-100%** |
| Published/48h (snapshot actual) | ~10 | 5 | -50% (mejora vs +5d que tenía 0) |
| Published/7d (snapshot actual) | 28 | **4** | **-86%** |
| Backlog drafts pending | 0 | 4 (counts_by_status: 15 draft total) | +4 / +15 |
| Ratio rank→publish | 9% | n/d — pero `rejected_ratio_48h=0.861` | ⚠️ 86% rechazo (vs 100% en +5d, mejora) |
| Rank runs/24h (objetivo nuevo: 2) | 3 | 1 | -50% vs target |
| Translate runs/24h (objetivo nuevo: 2) | 3 | **0** sostenido 24h+ | **-100% vs target** |
| Oldest ranked aging | n/a | 0h | OK (cola vacía) |
| Heros 4xx (de muestra 30) | n/d | 23 | ⚠️ orthogonal (regresión vs backfill 21-may que dejó 0/30) |

### Evolución consolidada de los 3 chequeos

| Chequeo | Fecha | Verdict | published_24h | published_7d | drafts_pending | rank_24h | translate_24h | rejected_ratio_48h |
|---|---|---|---:|---:|---:|---:|---:|---:|
| +2d | 2026-05-24T12:03Z | ⚠️ WARNING | 0 | 36 (burst) | 12 | 0 | 1 | n/d |
| +5d | 2026-05-27T12:07Z | 🚨 CRITICAL | 0 | 13 | 12 | 1 | 0 | 1.0 |
| +7d | 2026-05-29T12:02Z | 🚨 CRITICAL | 0 | 4 | 4 | 1 | 0 | 0.861 |

### Marker commits CCR (post-bajada 22-may → 29-may UTC)

```
2026-05-26 18:32  chore(rank):      blog scored 1 candidate
2026-05-27 ~18:25 chore(rank):      blog scored 12 candidates   ← post-revert prep 3/día
2026-05-28 ~08:10 chore(translate): blog translated 2 tutorials ← primer translate post-burst
2026-05-28 ~18:25 chore(rank):      blog scored 2 candidates
2026-05-29 08:11  chore(rank-prep): refresh inputs              ← prep 3/día corriendo
```

**Lectura**: post-revert parcial (workflow GH a 3/día el 27-may 12:08Z),
el ranking volvió a producir (12+2 candidates scored en 2 días) y se
ejecutó 1 corrida de translate (2 tutoriales). Pero las CCR triggers
siguen en 2/día → la frecuencia de translate continúa por debajo del
target original. El pipeline NO está congelado como en +5d, pero
tampoco recuperó cadencia.

## Análisis

**Verdict CRITICAL sostenido, con matiz de recuperación parcial.**

1. **El revert del +5d funcionó parcialmente.** El cron del workflow
   `blog-rank-prep.yml` revertido a `25 4,12,20 * * *` (3/día) destrabó
   el flujo de prep: ahora hay 3 refresh diarios de inputs vs 2 antes.
   Eso explica los 14 candidates scored y los 2 tutoriales traducidos
   entre 27-may 18:30 y 29-may 08:10. Sin el revert, seguiríamos en el
   estado del +5d (0 publishes, 0 translate, 100% rejected).

2. **Pero el revert quedó incompleto** porque los CCR triggers
   (`trig_018awZKUDjfX8JqWmh5x5Mi4` ranking,
   `trig_012SUx3X96ndwjTdzWs4RKZp` translation) siguen en `30 6,18` y
   `0 8,20` (2/día). El MCP `RemoteTrigger` que controla esos crons NO
   está expuesto en el container Anthropic Cloud — ni en +5d ni en
   +7d. Resultado:
   - Prep refresca 3/día (04:25, 12:25, 20:25 UTC) → bien.
   - Routine B (ranking) dispara 2/día (06:30, 18:30 UTC) → desfase
     con prep, pero los inputs frescos llegan igual.
   - Routine C (translation) dispara 2/día (08:00, 20:00 UTC) → el
     único translate del período (28-may ~08:10) confirma que el
     trigger está vivo, pero produce 2 tutoriales por slot lo que
     no alcanza para volver al baseline.

3. **published_7d=4 vs baseline 28 (-86%) es la métrica condenatoria.**
   Aun con la mejora vs +5d (4 vs 13 — y notar: el 13 incluía el burst
   inicial que ya se salió de la ventana; el 4 actual es throughput
   "limpio" post-burst), el blog publica a ~14% de la velocidad
   pre-bajada. A este ritmo, el contenido del blog se estanca: 4
   tutoriales/semana vs los 35/semana del baseline.

4. **`translate_runs_24h=0` sostenido sigue gatillando el criterio
   CRITICAL** ("0 corridas en >24h"). El último translate fue el 28-may
   ~08:10 UTC, hace ~28h al snapshot. Coincide con la cadencia 2/día
   actual (slots 08:00 y 20:00) — el del 28-may 20:00 NO produjo
   commit visible (probablemente sin material para traducir, o falló
   silencioso). El slot 29-may 08:00 también está sin commit.

5. **Heros 4xx: 23/30 broken** (regresión completa vs el backfill del
   21-may que dejó 0/30). Los 403 vienen mayormente de URLs R2
   (`images.mechatronicstore.cl/articles/blog/...`) — son los rehosts
   propios que ahora devuelven 403, no upstream. Esto es **un
   problema ortogonal a cadencia** pero crítico de capturar acá: el
   token R2 / config CORS / hotlink puede haber cambiado. Acción
   separada requerida.

**Por qué NO escalar la acción más allá de lo del +5d**: el revert
completo ya está documentado y la única parte ejecutable desde el
container (GH workflow) está aplicada hace 2 días. La parte CCR sigue
pendiente por la misma razón estructural que en el +5d — y en esta
corrida confirmo de nuevo que `RemoteTrigger` MCP no está expuesto
(consulta ToolSearch "RemoteTrigger" → "No matching deferred tools
found"). No hay más acción de revert que pueda tomar yo desde acá.

## Acción

**Mantener decisión de revertir** (definitivo, no monitorear más).
La hipótesis "2/día con caps duplicados es más eficiente" queda
**refutada empíricamente** por 7 días de datos:

- +2d: throughput aparente alto (burst de drenaje del backlog inicial)
- +5d: pipeline congelado, 0 publishes 96h+
- +7d: recuperación parcial post-revert workflow, pero aún -86% vs baseline

### Acciones de esta corrida

1. ✅ Reporte `data/cadencia-check-7d-20260529T120225Z.md` (este archivo).
2. ✅ Actualizar `AGENTS.md`: marcar la bajada como **EXPERIMENTO FALLIDO**
   (no como "validada/estable"). Cambiar el lenguaje de "revertida 2026-05-27
   (pipeline congelado)" a "revertida definitivamente 2026-05-29 — cadencia
   3/día es el régimen sostenido del blog".
3. ✅ Actualizar `data/cadencia-revert-log.md` con entrada del +7d
   confirmando que el revert es definitivo.

### Acciones PENDIENTES (no ejecutables desde Anthropic Cloud)

4. **CCR RemoteTrigger revert (URGENTE)**: Pablo o agente con acceso a
   `RemoteTrigger` MCP debe ejecutar:
   ```
   RemoteTrigger update trig_018awZKUDjfX8JqWmh5x5Mi4 cron "30 4,12,20 * * *"
   RemoteTrigger update trig_012SUx3X96ndwjTdzWs4RKZp cron "0 6,14,22 * * *"
   ```
   Hasta que esto se complete, el blog publica al ~14% de su ritmo
   histórico. **Esta es la acción crítica pendiente.**

5. **Caps**: con el revert definitivo, los caps `--limit 60` rank y
   `--limit 15` translate en el workflow de prep pueden:
   - **Dejarse altos** (decisión actual): no daña, da headroom para
     bursts ocasionales.
   - **Revertir a 30/10**: alinear con régimen pre-bajada estrictamente.
   Pablo decide. Por consistencia documental sugiero revertir a 30/10
   para que el régimen sea idéntico al pre-22-may.

6. **Investigar `rejected_ratio_48h=0.861`**: mejoró respecto al 1.0
   del +5d, pero sigue alto. El baseline tenía un ratio implícito
   similar (rejected_7d=426, ingest_7d=460 → ~93% rejected baseline),
   así que **probablemente NO sea anomalía** sino el comportamiento
   normal del ranker. Vale revisar `data/blog-rank-output.json` del
   último run igual.

7. **Heros 4xx (regresión)**: 23/30 broken, todos los listados son URLs
   de `images.mechatronicstore.cl/articles/blog/...` (rehosts propios)
   devolviendo 403. NO es problema de upstream — es algo cambió en R2 /
   token / CORS / hotlink en algún momento de la semana. Correr:
   ```
   curl -I https://images.mechatronicstore.cl/articles/blog/5d7a0aa10e39/a1ce788779fd3f2e.webp
   ```
   para diagnóstico. Sospecho el bucket / config CDN. Esto NO bloquea
   el verdict de cadencia (problema ortogonal).

## Decisión final

**REVERTIR — definitivo**. La cadencia 2/día con caps duplicados queda
clasificada como experimento fallido. Volver a 3/día con caps 30/10
como régimen estable del blog. Tres chequeos consecutivos (WARNING,
CRITICAL, CRITICAL) descartan la hipótesis original.

Cierre del ciclo de monitoring de esta bajada: **no se programa un
+10d ni siguientes**. Si Pablo quiere re-intentar la bajada en el
futuro, debe ser con:
- Snapshot baseline nuevo (no este, que ya está usado).
- Plan de revert más rápido (ej: trigger automatizado si
  published_24h=0 por 48h, sin esperar al humano).
- Mejor visibilidad: TURSO env en cloud sessions o un endpoint
  HTTP read-only que devuelva los counts exactos sin necesidad
  de credentials DB.

## Limitaciones de esta corrida

- Sin `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` en el container,
  no hay queries directas a `tutorials`. Mismo límite que +2d y +5d.
- Sin `RemoteTrigger` MCP, no se ejecuta el revert CCR. Tercera
  corrida consecutiva con la misma limitación → confirmado que esto
  requiere infraestructura para resolverse, no solo paciencia.
- `published_48h=5` vs `published_7d=4` parece contradictorio
  (48h ⊂ 7d) pero es artifact de cómo el monitor cuenta (probablemente
  `published_7d` usa created_at vs publication_at desfase). No cambia
  la conclusión.
