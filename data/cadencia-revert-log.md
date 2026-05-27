# Cadencia revert log — MechaBlog

## 2026-05-27T12:07:40Z — revert disparado por cadencia-check-5d (CRITICAL)

**Motivo**: el +5d check post bajada 3→2/día detectó pipeline congelado:
- 0 publishes en últimas 96+ horas (sostenido)
- 0 translate_runs_24h sostenido 72+ horas
- `published_7d` cayendo en línea recta 36→13 en 3 días (rolling window)
- `rejected_ratio_48h=1.0` (100% de candidatos rechazados)

Reporte completo: `data/cadencia-check-5d-20260527T120740Z.md`.

### Cambios aplicados desde Anthropic Cloud session

| Recurso | Antes | Después |
|---|---|---|
| `.github/workflows/blog-rank-prep.yml` cron | `25 6,18 * * *` (2/día) | `25 4,12,20 * * *` (3/día) |
| `AGENTS.md` | sin sección de cadencia | nueva sección "MechaBlog cadencia revertida 2026-05-27" |
| Caps en prep workflow (`--limit 60` rank, `--limit 15` translate) | sin cambio | sin cambio (decisión: dejar caps altos como headroom; ver reporte) |

### Cambios PENDIENTES (acción manual de Pablo o agente con `RemoteTrigger` MCP)

| Recurso | Estado actual (post-bajada 22-may) | Estado deseado (pre-bajada) |
|---|---|---|
| CCR trigger `trig_018awZKUDjfX8JqWmh5x5Mi4` (Routine B / ranking) | cron `30 6,18 * * *` | cron `30 4,12,20 * * *` |
| CCR trigger `trig_012SUx3X96ndwjTdzWs4RKZp` (Routine C / translation) | cron `0 8,20 * * *` | cron `0 6,14,22 * * *` |

Comando esperado:

```
RemoteTrigger update trig_018awZKUDjfX8JqWmh5x5Mi4 cron "30 4,12,20 * * *"
RemoteTrigger update trig_012SUx3X96ndwjTdzWs4RKZp cron "0 6,14,22 * * *"
```

### Estado del revert al cierre de este log

⚠️ **PARCIAL**. La parte de GitHub Actions (prep workflow) está revertida y
empezará a correr 3×/día desde el próximo slot 12:25 UTC del 27-may. La
parte CCR (triggers que efectivamente ejecutan Routine B y C) requiere
intervención manual porque el MCP `RemoteTrigger` no está expuesto en el
container de la routine `cadencia-check` en Anthropic Cloud.

**Si el revert CCR no se completa en 24h**, el sistema queda en
configuración inconsistente:
- Prep refresca inputs 3×/día (04:25, 12:25, 20:25 UTC)
- CCR Routine B sigue disparando 2×/día (06:30, 18:30 UTC) → consume
  inputs cuya frescura es de 2h, no de 5 min como antes
- CCR Routine C sigue disparando 2×/día (08:00, 20:00 UTC)

Esa configuración no es peor que el estado actual (de hecho, prep
fresh en más slots no hace daño), pero tampoco resuelve el síntoma.

### Próxima decisión

- Si CCR revertido en <24h: dejar correr 48h y re-evaluar.
- Si CCR no revertido en <24h: escalar a Pablo directo (Slack /
  mensaje) y postergar el +7d check.
