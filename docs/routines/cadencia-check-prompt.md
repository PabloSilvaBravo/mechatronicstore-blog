# Cadencia Check Routine — Prompt

Routine programada que evalúa si la bajada de cadencia 3→2/día del
22-may-2026 dañó el throughput del blog. Corre 3 veces (+2d, +5d, +7d
después del cambio) en Anthropic Cloud.

## Modelo

`claude-opus-4-7` (necesita razonar sobre tendencias, no solo SQL)

## Inputs

- `data/cadencia-baseline.json` — snapshot pre-bajada con métricas 7d
- DB Turso (`tutorials` table) via libsql Python
- `AGENTS.md` (sección MechaBlog routines) para contexto del cambio

## Pasos

1. **`git pull --rebase origin main`** — sincronizar
2. **Leer baseline**: `data/cadencia-baseline.json`
3. **Query DB**: replicar métricas baseline pero sobre la ventana post-bajada
   (días desde 22-may UTC hasta hoy):
   - `published_per_day_utc` (últimos N días)
   - `rank_runs_per_day`, `translate_runs_per_day` (distinct hour-groups)
   - `backlog`: drafts + ranked actuales
   - `oldest_ranked_aging_hours`
   - `ratio_rank_to_publish` (rankings_periodo vs published_periodo)
4. **Comparar contra baseline**:
   - Δ published/día (avg)
   - Δ backlog (debe seguir ≈0)
   - Δ ratio rank→publish (debe seguir ~9%)
   - Slot distribution (las 2 corridas funcionan parejas?)
5. **Verdict**:
   - `OK`: throughput estable o mejor, backlog 0
   - `WARNING`: caída <30% en publish/día, o backlog >20
   - `CRITICAL`: caída >50%, o backlog >50, o 0 corridas en >24h
6. **Si CRITICAL** (acción automática):
   - Revertir crons via RemoteTrigger:
     - `trig_018awZKUDjfX8JqWmh5x5Mi4`: cron `30 4,12,20 * * *`
     - `trig_012SUx3X96ndwjTdzWs4RKZp`: cron `0 6,14,22 * * *`
   - Documentar revert en `data/cadencia-revert-log.md`
7. **Escribir reporte**: `data/cadencia-check-{N}d-{ts}.md` con:
   - Tabla baseline vs actual
   - Verdict + razón
   - Acción tomada (si CRITICAL)
   - Recomendación (mantener / monitorear / revertir / ajustar)
8. **Commit + push DIRECTO a main**:
   ```
   git add data/cadencia-check-*.md
   git commit -m "chore(cadencia-check): {N}d post-bajada — {verdict}"
   git push origin HEAD:main
   ```

## Reglas absolutas

- Push DIRECTO a main, NO PR (regla AGENTS.md absoluta)
- Si revertís cron, también actualizar `AGENTS.md` con la nueva sección
  "MechaBlog cadencia revertida en YYYY-MM-DD por motivo X"
- Si VERDICT=OK pero hay alguna métrica sospechosa, marcar como WARNING
  en vez de OK (mejor falso positivo que false negative)

## Schema reporte markdown

```markdown
# Cadencia check — +{N}d post bajada (3→2/día)

**Fecha**: {ISO}
**Verdict**: ✅ OK / ⚠️ WARNING / 🚨 CRITICAL

## Comparativa baseline vs actual

| Métrica | Baseline (7d pre) | Actual ({N}d post) | Δ |
|---|---:|---:|---:|
| Published/día (avg) | 5.0 | X.X | -Y% |
| Backlog (drafts+ranked) | 0 | N | +N |
| Ratio rank→publish | 9% | X% | ±N pp |
| Rank runs/día | 3 | 2 | -1 |
| Translate runs/día | 3 | 2 | -1 |
| Oldest ranked aging | N/A | Xh | — |

## Análisis

{narrativa libre Opus: qué cambió, por qué, qué significa}

## Acción

{ninguna / monitor cerca / revertir cron / ajustar caps}
```
