# Cadencia check — +5d post bajada (3→2/día)

**Fecha**: 2026-05-27T12:07:40Z
**Verdict**: 🚨 CRITICAL

**Fuente de datos**: serie temporal de `data/pipeline-health.json` reconstruida
desde git (16 snapshots entre 2026-05-24T00:37Z y 2026-05-27T10:02Z) + git log
de commits CCR (rank/translate/publish markers). Igual que en el +2d check, no
hay credenciales Turso en el container Anthropic Cloud, así que no se ejecutan
queries directas — pero la serie de healthchecks cada 2-4h da resolución
suficiente para concluir tendencia.

## Comparativa baseline vs actual

| Métrica | Baseline (7d pre, 17–21 may) | Actual (5d post, 22–27 may) | Δ |
|---|---:|---:|---:|
| Published/día (avg, ventana 5d) | 5.0 | 6.83 (36/5.27d) | +37% (engañoso) |
| Published/día (últimos 3d: 24–27 may) | ~5.0 | **0.0** | **-100%** |
| Published/24h (snapshot actual) | ~5 | **0** (sostenido 4+ días) | **-100%** |
| Published/7d (snapshot actual) | 28 | **13** y bajando (era 36 hace 3d) | **-54%** |
| Backlog (drafts_pending) | 0 | **12** (counts_by_status: 23 draft) | **+12 a +23** |
| Ratio rank→publish | 9% | n/d (no DB) — pero `rejected_ratio_48h=1.0` | ⚠️ 100% rechazo |
| Rank runs/24h (objetivo nuevo: 2) | 3 | 0–1 en últimos 4 días | -50 a -100% vs target |
| Translate runs/24h (objetivo nuevo: 2) | 3 | **0 sostenido 3+ días** | -100% vs target |
| Oldest ranked aging | n/a | 0h | OK (cola vacía) |

### Serie temporal `published_7d` (cómo cae el burst del rolling window)

| Snapshot | published_24h | published_48h | published_7d | drafts | rank_24h | trans_24h |
|---|---:|---:|---:|---:|---:|---:|
| 2026-05-24T11:19Z (+2d) | 0 | 36 | 36 | 1 | 0 | 1 |
| 2026-05-25T10:18Z | 0 | 36 | 35 | 0 | 1 | 0 |
| 2026-05-25T23:11Z | 0 | 36 | 30 | 0 | 0 | 0 |
| 2026-05-26T03:59Z | 0 | 8 | 30 | 0 | 0 | 0 |
| 2026-05-26T15:50Z | 0 | 8 | 27 | 1 | 0 | 0 |
| 2026-05-26T18:31Z | 0 | 8 | 19 | 1 | 0 | 0 |
| 2026-05-27T04:13Z | 0 | 8 | 19 | 0 | 1 | 0 |
| 2026-05-27T10:02Z (now) | **0** | **0** | **13** | **12** | **1** | **0** |

`published_24h` lleva ≥96h en 0. `translate_runs_24h` lleva ≥72h en 0.
`published_7d` está cayendo en línea recta (36→13 en 3 días) porque los
36 publishes del burst inicial 22–23 may se están saliendo del rolling
window y nada nuevo los reemplaza. Extrapolando, llega a 0 el 30-may.

### Marker commits CCR (22-may → 27-may UTC)

```
2026-05-26 18:32  chore(rank): blog scored 1 candidate
```

**Eso es todo**. Un solo commit de ranking en 5 días que produjo 1 candidato
scored. Sin `chore(translate)` ni `chore(publish)` en todo el período post-bajada.
Los commits `chore(rank-prep)` y `chore(blog-ingest)` SÍ están (todos los días
en los slots correctos 06:25 / 18:25) → la prep de inputs sigue corriendo
puntual, pero las Routines B y C del CCR no están consumiendo / produciendo
output que llegue a la DB.

## Análisis

**La hipótesis del +2d check no se sostuvo.** A las 48h post-bajada el
throughput parecía estar +260% por encima del baseline (36 publishes vs
~10 esperados), pero ese número era un artefacto del **burst inicial**:
el cap rank=60 / translate=15 del nuevo régimen drenó todo el backlog
existente en las primeras 2 corridas y después el pipeline se quedó sin
material para producir. Desde el 24-may 00:00 UTC no hubo NI UN publish
adicional.

**Lo que está pasando, lectura más probable**:

1. **Routines B/C disparan pero rechazan el 100% de candidatos**. El
   snapshot actual reporta `rejected_ratio_48h=1.0` (21/21 rejected en
   48h) y `rejected_48h=21`. Eso significa que las corridas SÍ se están
   ejecutando — sólo que `hard_filters.py` o el threshold de scoring
   está descartando todo. El único `chore(rank)` commit (1 candidate
   scored, 26-may 18:32) confirma que la routine corrió pero apenas
   pasó 1.
2. **Sin ranked items que sobrevivan, no hay material para traducir**
   → `translate_runs_24h=0` sostenido (3+ días). Eso explica por qué
   las 12 drafts no avanzan.
3. **El backlog está creciendo** (drafts_pending 0→12 entre 03:59 y
   10:02 del 27-may, +12 en 6h), pero ya no es el "flujo normal
   post-ingest" que vimos en +2d. Ahora es **drafts que el ranker
   descarta inmediatamente**, no drafts en cola esperando proceso.

**Por qué `published_per_day_avg=6.83` no salva el verdict**: ese
número promedia el burst inicial (36 en 48h) con los 4 días
posteriores en cero. La proyección honesta es que, si nada cambia,
la próxima ventana de 7 días tendrá **0** publishes (el burst ya está
saliendo del rolling window y no hay nada nuevo entrando).

**Múltiples criterios CRITICAL gatillados en paralelo**:
- ✅ Caída >50% en publish/día (los últimos 3d: -100% vs baseline)
- ✅ 0 corridas de translate en >24h (lleva 72h+)
- ✅ 0 publishes en >24h sostenido (lleva 96h+, threshold de alert
  `published_24h_min=1` violado continuamente)
- ⚠ Backlog 12–23 (por debajo del threshold CRITICAL de 50, pero
  creciendo monotónicamente)

No es claro que la causa raíz sea la cadencia 2/día per se — el
síntoma 100% rejected sugiere un problema ortogonal con filtros o
con la calidad del ingest reciente. **Pero la regla de la routine
es clara**: con estos números, revertir y diagnosticar después con
el pipeline operando en modo conocido.

## Acción

**Revertir cadencia a 3/día con caps originales** — siguiendo el step 6
del prompt cuando verdict=CRITICAL.

### Pasos ejecutados en esta corrida

1. **`.github/workflows/blog-rank-prep.yml`**: cron revertido de
   `25 6,18 * * *` (2/día) a `25 4,12,20 * * *` (3/día, 5 min antes
   de los slots originales de Routine B 04:30/12:30/20:30 UTC).
2. **`AGENTS.md`**: agregada sección "MechaBlog cadencia revertida
   2026-05-27" documentando motivo + estado pendiente.
3. **`data/cadencia-revert-log.md`**: log con timestamps y delta.

### Pendiente (NO ejecutable desde Anthropic Cloud)

4. **CCR RemoteTrigger revert**: los triggers
   `trig_018awZKUDjfX8JqWmh5x5Mi4` (Routine B / ranking) y
   `trig_012SUx3X96ndwjTdzWs4RKZp` (Routine C / translation) viven
   en CCR cloud y se modifican vía `RemoteTrigger` MCP, que **no está
   expuesto en el container Anthropic Cloud de esta routine**. Sin
   esto, el cron de GitHub prep correrá 3×/día pero las routines en
   CCR seguirán disparando 2×/día → desfase. Pablo (o un agente con
   acceso a `RemoteTrigger`) tiene que ejecutar manualmente:

   ```
   RemoteTrigger update trig_018awZKUDjfX8JqWmh5x5Mi4 cron "30 4,12,20 * * *"
   RemoteTrigger update trig_012SUx3X96ndwjTdzWs4RKZp cron "0 6,14,22 * * *"
   ```

5. **Caps**: además del cron, el cap `--limit 60` en
   `dump_blog_rank_input.py` y `--limit 15` en
   `dump_blog_translate_input.py` (workflow line 49 y 55) deberían
   volver a 30 y 10 respectivamente para coincidir con el régimen
   original. **No los toco en esta corrida** porque caps más altos no
   hacen daño con 3 corridas/día (sólo cap el techo, no piso); Pablo
   puede decidir si vale revertir o dejar el headroom.

6. **Investigar `rejected_ratio_48h=1.0`**: independiente de la
   cadencia, el ranker está descartando el 100% de candidatos
   procesados. Posibles causas: thresholds de scoring muy altos, hard
   filters demasiado estrictos, o fuentes que están sirviendo
   contenido fuera de scope. Sugerencia: `python3
   scripts/show_blog_queue.py` + revisar `data/blog-rank-output.json`
   del último run para ver qué scores devolvió.

## Limitaciones de esta corrida

- Sin TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el env del container,
  no se pudieron correr las queries de `published_per_day_utc`,
  `rank_runs_per_day`, `translate_runs_per_day`, ni recomputar
  `ratio_rank_to_publish` ni `slot_distribution_7d`.
- Sin `RemoteTrigger` MCP server expuesto, el revert del cron CCR
  quedó documentado pero no ejecutado.
- Las métricas se derivaron de 16 snapshots de
  `pipeline-health.json` (uno cada 2-4h durante el período) lo cual
  da resolución temporal suficiente para la tendencia pero menos
  precisión que SQL directo.

## Recomendación

**Revertir AHORA** (parcialmente hecho desde aquí, completar manual).
Cuando el pipeline esté operando en cadencia conocida (3/día) y se
confirme que vuelven los publishes, recién ahí diagnosticar el
problema de `rejected_ratio=1.0`. Mezclar dos cambios (cadencia + un
problema de filtros) en un debug simultáneo es la receta para no
saber qué causó qué.

Próximo cadencia-check (+7d) **debería postergarse** si el revert
completo aún no ocurrió a las 24h de este reporte — no tiene sentido
medir la cadencia 2/día si parte del régimen ya volvió a 3/día. Si
para el 29-may el revert sigue parcial, escalar a Pablo directo.
