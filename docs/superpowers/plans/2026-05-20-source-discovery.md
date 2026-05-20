# Source Discovery Plan — Tutoriales Electronics/Maker

**Goal:** Identificar **30-50 sources nuevas confiables** que produzcan tutoriales de electrónica / maker / DIY para enriquecer el pipeline del blog MechatronicStore. Actualmente solo 3 sources productivas (Random-Nerd, Adafruit-Learn, Makezine), 5 desactivadas por feeds rotos. Quiero llegar a 15-20 sources productivas activas y descubrir miles de candidatos potenciales.

**Approach:** 4 subagentes en paralelo, cada uno con scope geográfico/temático complementario.

## Criterios uniformes (cada source debe cumplir)

1. ✅ Tiene RSS/Atom feed FUNCIONAL (200 status + entries parseables)
2. ✅ Publica ≥1 tutorial/semana sostenido (preguntar entries recientes)
3. ✅ Contenido es tutorial paso-a-paso con código + esquemas + materiales (no solo news/reviews/eventos)
4. ✅ Audiencia hobbyist/maker/educator
5. ✅ NO bloquea con Cloudflare 403 (test rápido con UA browser)
6. ✅ Idioma preferido: inglés (Routine C traduce) o español (menos rework)

## Output format por subagente

Cada subagente escribe `data/source-discovery/<scope>.json` con shape:

```json
{
  "scope": "<scope name>",
  "discovered_at": "2026-05-20T...",
  "sources_evaluated": <total>,
  "sources_qualified": <int>,
  "sources": [
    {
      "name": "...",
      "homepage": "...",
      "feed_url": "...",
      "language": "en|es|de|...",
      "country": "US|UK|DE|...",
      "verified_rss_status": 200,
      "verified_rss_entries": 10,
      "publication_frequency": "daily|weekly|biweekly|monthly|sparse",
      "content_type": "tutorials|news|mixed",
      "sample_titles_recent": ["...", "..."],
      "quality_assessment": "high|medium|low",
      "qualifies": true,
      "notes": "..."
    }
  ]
}
```

## Scopes asignados

1. **Anglosajón + agregadores major** (US/UK/CA/AU + Hackster + Hackaday.io)
2. **Europa continental** (DE/FR/IT/NL/BE/AT/CH/Nordics + UK independientes)
3. **Hispanoparlantes + Asia/otros** (ES/MX/AR/CL + Asia tech)
4. **YouTube channels con companion blog + nichos verticales** (Arduino-only, ESP32-only, RPi-only)

## Self-review
- ¿Spec coverage? Sí, 4 scopes cubren globo completo + meta-fuentes
- ¿Placeholder scan? Sí, criterios concretos
- ¿Type consistency? Output JSON shape único repetido

## Output esperado
~40-60 sources verificadas, después yo consolido en `data/source-discovery/CONSOLIDATED.json` y selecciono top 20-30 con criterios de fit (productos en stock MechatronicStore, complejidad tutorial promedio, etc.).
