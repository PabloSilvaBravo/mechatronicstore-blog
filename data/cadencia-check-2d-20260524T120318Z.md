# Cadencia check — +2d post bajada (3→2/día)

**Fecha**: 2026-05-24T12:03:18Z
**Verdict**: ⚠️ WARNING

**Fuente de datos**: `data/pipeline-health.json` (snapshot 2026-05-24T11:19:36Z).
Esta corrida en Anthropic Cloud no tiene credenciales Turso disponibles
en env, así que reutilizo el último healthcheck (40 min de antigüedad)
en vez de bloquear el reporte. La sección "Limitaciones" detalla qué no
pude derivar directo.

## Comparativa baseline vs actual

| Métrica | Baseline (7d pre, 17–21 may) | Actual (+2d post, 22–24 may) | Δ |
|---|---:|---:|---:|
| Published/día (avg, ventana 48h) | 5.0 | 18.0 (36/2d) | +260% |
| Published/24h (última ventana) | ~5 | 0 | -100% |
| Backlog (drafts+ranked) | 0 | 12 (12 drafts + 0 ranked) | +12 |
| Ratio rank→publish (aproximado) | 9% | n/d (sin acceso DB) | — |
| Rank runs/día (objetivo nuevo) | 3 | 0 en últimas 24h (esperado 2) | -2 vs target |
| Translate runs/día (objetivo nuevo) | 3 | 1 en últimas 24h (esperado 2) | -1 vs target |
| Oldest ranked aging | n/d | 0h | OK |
| Heros 4xx (de muestra 30) | n/d | 23 | ⚠️ orthogonal |

## Análisis

**Throughput agregado: muy por encima del baseline.** En las primeras
48h post-bajada el pipeline publicó 36 tutoriales vs ~10 que se hubiera
esperado al ritmo previo (5/día × 2). Eso confirma la hipótesis con la
que se justificó la baja de cadencia: duplicar caps (rank 30→60,
translate 10→15) y consolidar el trabajo en 2 corridas grandes en vez
de 3 chicas aumenta el throughput porque hay más material acumulado
para rankear/traducir por slot. Backlog actual = 12 drafts (vs target
0), todos sin scorear todavía — es flujo normal post-ingest, no cola
atascada.

**Anomalía: últimas 24h tienen 0 publishes y 0 rank-runs detectadas.**
Las 36 publicaciones del período están todas concentradas en la ventana
24-48h atrás (entre ~11:19 UTC del 22-may y ~11:19 UTC del 23-may), y
la última corrida de las últimas 24h sólo muestra translate=1, rank=0.
Lectura más probable: las dos corridas de ranking del nuevo cron
(`30 6,18 * * *` UTC) **sí dispararon** los días 23 y 24 pero
encontraron pocas/cero entries nuevas para procesar (drafts_pending
actual = 1) y por eso `rank_runs_24h` (que cuenta `DISTINCT hour(ranked_at)`
en filas, no invocaciones del cron) reporta 0. Si el cron estuviera
realmente caído deberíamos ver el backlog de drafts crecer más rápido,
y vemos sólo 12 — consistente con un ingest moderado de los últimos 2 días.

**Por qué WARNING y no OK**: aun aceptando la lectura optimista, hay
señales que no puedo confirmar sin la DB: (a) el monitor reporta
`published_24h=0` como CRITICAL en sus propios alerts, (b) el ratio
exacto rank→publish no es derivable de las métricas snap, (c) la
distribución de slots (00–24h) tampoco. La regla de la routine dice
que en caso de métrica sospechosa marcar WARNING para que el chequeo
+5d revise con DB en mano. Aplica.

**No alcanza umbral CRITICAL**: la regla pide caída >50% (no aplica —
hay aumento), backlog >50 (12, OK), o 0 corridas en >24h (translate
corrió 1× hace pocas horas → al menos un trigger está vivo).

## Acción

**Ninguna automática.** No se revierte el cron. Recomendación:

1. **+5d check (programado 2026-05-27)**: re-correr con credenciales
   Turso (idealmente desde la VPS o agregarlas al secret store de
   Anthropic Cloud) y confirmar/desmentir si `rank_runs_24h=0` es
   artifact de "sin drafts" o cron muerto. Si para el +5d hay >24h
   con 0 publishes Y backlog drafts >30, ahí sí escalar a CRITICAL.
2. **Independiente de cadencia**: 23/30 heros con 4xx — pedir corrida
   manual de `python3 scripts/post_translate_rehost.py --hours 48` y
   `scripts/backfill_heros_to_r2.py`. Es problema separado pero
   relevante para Pablo.
3. **Mejora del prompt**: el prompt actual asume acceso DB en cloud;
   sumar al runbook un fallback "si no hay TURSO env, usar el último
   pipeline-health.json y marcar WARNING por defecto" para que la
   próxima corrida no quede ambigua.

## Limitaciones de esta corrida

- Sin TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el env del container.
- Métricas derivadas del snapshot de `pipeline-health.json` (no live).
- No pude recomputar `ratio_rank_to_publish`, `slot_distribution`,
  `oldest_ranked_aging` directamente.
