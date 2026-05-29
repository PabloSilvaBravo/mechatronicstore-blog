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

---

## 2026-05-29T12:02:25Z — +7d check confirma revert DEFINITIVO

**Resumen**: el +7d check no encontró señales para volver a 2/día.
Verdict: CRITICAL sostenido (3er chequeo consecutivo en alerta).
Reporte: `data/cadencia-check-7d-20260529T120225Z.md`.

### Datos del +7d

- `published_24h=0`, `published_48h=5`, `published_7d=4` (baseline 28).
- `translate_runs_24h=0` sostenido (último translate visible: 28-may ~08:10Z).
- `rank_runs_24h=1` (el ranking sí dispara, pero produce poco).
- `rejected_ratio_48h=0.861` (vs 1.0 en +5d, mejora).
- `drafts_pending=4` (vs 12 en +5d, mejora).

### Lectura

- El revert parcial del +5d (workflow `blog-rank-prep.yml` a 3/día)
  destrabó algo: post-27-may aparecen commits `chore(rank): blog scored
  12 candidates` (27-may), `chore(translate): blog translated 2
  tutorials` (28-may), `chore(rank): blog scored 2 candidates`
  (28-may). El pipeline NO está congelado como en +5d.
- Pero published_7d=4 vs baseline 28 = -86%. Aun con el revert parcial
  funcionando, el blog publica al ~14% del baseline. CCR triggers
  todavía en 2/día son el bottleneck.

### Acciones de esta corrida

1. ✅ Reporte +7d escrito.
2. ✅ `AGENTS.md` actualizado: sección renombrada a "cadencia 3/día es
   el régimen definitivo (experimento 2/día FALLIDO)". Cierra el ciclo
   del experimento.
3. ✅ Este log actualizado.

### Acción pendiente (sigue siendo la misma del +5d)

Pablo o agente con `RemoteTrigger` MCP:

```
RemoteTrigger update trig_018awZKUDjfX8JqWmh5x5Mi4 cron "30 4,12,20 * * *"
RemoteTrigger update trig_012SUx3X96ndwjTdzWs4RKZp cron "0 6,14,22 * * *"
```

Hasta que esto pase, el blog publica al ~14% del ritmo histórico.

### Cierre del ciclo de monitoring

No se programa +10d ni siguientes. La hipótesis "2/día con caps
duplicados es más eficiente" queda **refutada empíricamente** por
3 chequeos consecutivos. Cadencia 3/día con caps 30/10 es el
régimen sostenido del blog.
