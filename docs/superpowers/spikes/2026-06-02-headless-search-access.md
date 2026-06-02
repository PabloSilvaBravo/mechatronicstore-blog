# Spike: acceso headless a la búsqueda semántica de la tienda

**Fecha:** 2026-06-02
**Pregunta:** ¿puede el pipeline del blog (Routine C en CCR / GitHub Actions, sin MCP interactivo) hacer búsqueda semántica de productos?

## Conclusión: SÍ — Camino A confirmado

Existe un **endpoint HTTP público** detrás del MCP que cualquier script puede llamar con `requests`. MechaNoticias ya lo usa headless en `scripts/match_products.py` (repo `newsletter`/`mechanews`).

### Endpoint y forma de la llamada (verificado en newsletter/scripts/match_products.py)

```python
url = os.environ.get("MECHA_CATALOG_URL", "https://mcp.mechatronicstore.cl/api/catalog/search")
token = os.environ.get("MECHA_CATALOG_TOKEN", "")
resp = requests.post(
    url,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": query, "limit": 3, "only_in_stock": True},
    timeout=20,
)
data = resp.json()
products = data.get("products") or []
# cada product: sku, product_id, name, url, image_url, price_clp, stock, ranking_score
```

Es la misma búsqueda semántica híbrida (BM25 + vectores 3072d de Meilisearch) que expone el MCP `buscar_productos`, pero por HTTP.

### Lo único que falta

El secret **`MECHA_CATALOG_TOKEN`** NO está hoy en el `.env.local` del blog (confirmado en la discovery). Para que el pipeline del blog use Camino A hay que:
1. Agregar `MECHA_CATALOG_TOKEN` (y opcional `MECHA_CATALOG_URL`) al `.env.local` del blog (local).
2. Agregarlo como GitHub Actions secret + al env de la routine CCR (Routine C).

El token ya existe (lo usa MechaNoticias); es copiarlo, no crearlo.

## Implicancia para el plan

- El plan siguiente ("Búsqueda semántica en el pipeline") puede crear `scripts/match_products.py` en el blog como **near-copy** del de MechaNoticias, adaptado a:
  - query por material/tema (no solo título de artículo),
  - devolver candidatos con tipo/categoría + stock para el matcher por tipo,
  - escribir `matched_material` + `relevance` en `linked_products`.
- NO hace falta el fallback de scrape (Camino B) para el pipeline headless. El scrape queda solo como contingencia si el endpoint cae.
- Las corridas agénticas (backfill, enjambre) pueden usar el MCP directo o el mismo endpoint, indistinto.

## Nota

La fundación (mapeo explícito en frontend + gate determinista, Tareas 1-2 del plan) NO depende de esto: ya matan los bugs reales sin tocar la búsqueda. Camino A es para el upside (que los tutoriales nuevos DESCUBRAN automáticamente los productos correctos que existen, como HuskyLens 2 / Grove Vision que el wearable no encontró).
