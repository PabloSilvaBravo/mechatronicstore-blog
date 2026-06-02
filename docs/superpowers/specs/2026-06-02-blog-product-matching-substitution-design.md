# Matching y sustitución inteligente de productos en el blog — Diseño

**Fecha:** 2026-06-02
**Estado:** aprobado por Pablo (pendiente revisión final del spec escrito)
**Origen:** auditoría del PDF de mejoras de Esteban (3 páginas), verificada con lupa contra la DB Turso, el código del matcher (`MaterialsList.tsx`) y el catálogo real de la tienda (MCP `buscar_productos`). No se asumió que Esteban tuviera razón.

> **Para workers agénticos:** la implementación se ejecuta con `superpowers:writing-plans` → `superpowers:executing-plans`. Este documento es el spec aprobado; el plan de implementación se deriva de aquí.

---

## 1. Contexto y motivación (qué se verificó, no qué se asumió)

Esteban reportó 4 problemas. La auditoría contra el sistema real arrojó:

| Afirmación de Esteban | Realidad verificada | Veredicto |
|---|---|---|
| A. Materiales repetidos / match equivocado (Pi y microSD a $22.689, misma foto) | El caso puntual **ya está corregido** (el tutorial fue re-autorado; hoy linkea OLED/TFT). Pero el motor de match sigue siendo frágil (tokens, sin tipo). Manifestación **viva y peor**: el tutorial wearable `16d08ade217e` linkea "Cable macho-hembra" y "Protoboard", que **no están en su lista de materiales** (relleno basura). | Parcial: ejemplo viejo, causa raíz real, manifestación nueva viva |
| B. Confunde e-paper con pantallas normales; pide blocklist de e-paper | Confirmado que la tienda **no vende ningún e-paper** (búsqueda: solo OLED/TFT/LCD/Nextion). Pero el sistema **no los confunde**: ofrece "Pantalla OLED (alternativa al eInk)". El problema real es que un OLED es **mal reemplazo** de un e-ink (tecnologías opuestas), no la falta de blocklist. | Hecho correcto, mecanismo equivocado |
| C. Imágenes que no van con el título (soldadora, resistencias, LEDs) | Las 3 heros **hoy son correctas** (el enchufe Aubess real, la placa ESP32 real, un infográfico custom de particiones OTA). Las capturas de Esteban son viejas; el enjambre ya las arregló. | Era real, ya resuelto |
| D. Tutoriales con componentes que no vendemos, sin buscar alternativa | El wearable RDK X5 ofrece cero valor de tienda + productos basura. Pero "no tenemos cámara" es **falso**: hay ESP32-CAM, HuskyLens 2, OV7670, IMX219, IMX477. Y los reemplazos que Esteban sugiere **sí están en stock** (Grove Vision AI V2 $34.900, ESP32-P4 AI Kit $22.810, XIAO ESP32-S3). Su swap "1 a 1" es técnicamente ingenuo (un ESP32 no replica una SBC con NPU). | Síntoma correcto, diagnóstico a medias |

**Conclusión de la auditoría:** los 4 reportes colapsan en **un solo problema con tres caras** más una ausencia:

1. El matcher **rellena con productos irrelevantes** cuando no encuentra buenos (en vez de dejar vacío).
2. El matcher **no descubre los productos correctos que sí existen** (el wearable es la prueba: la tienda tiene HuskyLens 2 / Grove Vision AI ideales y no los encontró).
3. La **sustitución no tiene criterio** (a veces ausente → basura, a veces forzada → OLED por e-ink).
4. **No hay gate de coherencia** que valide imagen↔título y producto↔tema antes de publicar (las imágenes se arreglaron a mano, nada evita la regresión).

Vive principalmente en el pipeline estándar (Routine C / `persist_blog_translation.py`) y en el matcher de render (`MaterialsList.tsx`), no solo en lo re-autorado por el enjambre.

---

## 2. Objetivo

Que cada tutorial linkee los productos correctos que la tienda **sí** tiene (o ninguno), sustituya solo cuando es técnicamente válido, y **nunca** publique con productos basura ni imágenes incoherentes.

## 3. Principio rector (decisión editorial, aprobada con veto pendiente)

Cuando el componente central de un tutorial no se vende:

1. **Re-angular** (preferido): adaptar el alcance del tutorial a una versión achievable con lo que la tienda sí soporta, **solo si existe un camino técnicamente honesto** (ej. "asistente de visión" → HuskyLens 2 o Grove Vision AI V2, re-escopeado a detección de pocas clases).
2. **Educativo** (respaldo): si no hay camino honesto, publicar sin productos forzados; los materiales se listan con honestidad ("no disponible en MechatronicStore") y a lo sumo una sugerencia suave de "lo más parecido que tenemos".
3. **Basura: jamás.** Nunca rellenar con productos no relacionados para "tener algo linkeado".

---

## 4. Arquitectura (5 fases)

### Fase 0 — Capacidad de match semántico (fundación)

**Qué:** una capacidad única de matching producto↔material/tema que devuelve candidatos rankeados con score de relevancia semántica, tipo/categoría de producto, stock y precio reales.

**Cómo:** se apoya en la búsqueda semántica de la tienda (BM25 + vectores, la misma que expone el MCP `buscar_productos`, ya verificada como funcional y buena).

**Riesgo/decisión técnica a resolver en el plan:** el MCP es una herramienta agéntica; el pipeline headless (Routine C en CCR, GitHub Actions) **no puede llamar un MCP interactivo**. Por eso Fase 0 debe resolver el **acceso del pipeline al backend de búsqueda**:
- **Camino A (preferido):** localizar el endpoint HTTP real detrás del MCP (instancia Meilisearch + key, o un endpoint del dashboard) y que un helper `scripts/match_products.py` lo llame directo. Discovery requerido.
- **Camino B (fallback):** mantener el scrape de `mechatronicstore.cl/?s=` que ya usa el enjambre, pero aplicarle encima las reglas nuevas de relevancia y tipo.

Las corridas agénticas (backfill Fase 4, enjambre) sí usan el MCP directo. Entregable: `scripts/match_products.py` con una interfaz estable (input: nombre de material o tema + tipo esperado; output: lista rankeada con `{sku, wc_id, nombre, precio, stock, categoria, url, imagen, relevance}`).

### Fase 1 — Piso de relevancia + match por tipo (mata el relleno basura)

**Dónde:** `MaterialsList.tsx` (`findProduct`), el prompt de autoría (`docs/routines/blog-translation-prompt.md`), `content_swarm_lib.py`, y la validación de `stage`/`publish`.

1. **Piso de relevancia:** un material recibe producto solo si el match supera un umbral de relevancia. Si nada lo supera → "no disponible". **Prohibido** linkear un producto cuya relevancia no llega al piso (mata el caso cable+protoboard del wearable).
2. **Match por tipo:** una "microSD" (almacenamiento) no puede matchear una "pantalla para Raspberry Pi". Se usa la categoría que devuelve el backend de búsqueda. El matcher compara tipo de material vs tipo de producto antes de aceptar.
3. **Mapeo explícito material↔producto:** cada entrada de `linked_products` lleva el campo `matched_material` (el nombre exacto del material al que corresponde). `MaterialsList.findProduct` deja de adivinar por tokens y renderiza por ese mapeo explícito. Esto **elimina de raíz** el bug Pi/microSD (falso match por solapamiento de tokens). Si una entrada no tiene `matched_material`, no se renderiza (evita huérfanos/basura).

### Fase 2 — Sustitución honesta

**Dónde:** prompt de autoría + `linked_products` schema.

- Se sustituye solo por un equivalente **técnicamente válido**. Regla dura: no ofrecer un OLED como reemplazo de un e-ink en un tutorial que compara e-inks (tecnologías opuestas, caso de uso distinto).
- Las entradas sustitutas se marcan `is_alternative: true` + `alternative_note` (una línea honesta, ej. "alternativa más simple; no es e-ink").
- Acá vive la regla de **re-angular** del Principio Rector: si el componente central no existe pero hay un camino honesto (vision → HuskyLens 2 / Grove Vision AI), el autor re-angula el alcance del tutorial y lo declara. Si no hay camino → modo educativo, sin productos.

### Fase 3 — Gate de coherencia antes de publicar

**Dónde:** `content_swarm_lib.py` (`stage`/`publish`) y `persist_blog_translation.py`.

Validación que corre antes de marcar `published`/`staged`:
- **Producto↔tema:** cada `linked_products` debe tener `matched_material` y relevancia ≥ piso. Cero huérfanos, cero basura. (Determinista, barato.)
- **Imagen↔título:** arranca barato (bloquear genéricas conocidas, reusando los filtros `GENERIC_IMAGE_URL_PATTERNS` ya existentes en `scraper.py`) + un chequeo liviano de coherencia. Se endurece después con visión.
- Si el gate falla, el tutorial se **retiene** (queda en `staged` o un estado de revisión) en vez de publicarse. Nunca sale algo incoherente.

### Fase 4 — Backfill del corpus actual

**Dónde:** script nuevo `scripts/backfill_product_matching.py` + un barrido tipo enjambre (corrida agéntica con acceso al MCP).

- Pasar las publicadas + las staged por el matcher nuevo: sacar productos basura, re-matchear con búsqueda semántica, arreglar sustituciones malas.
- Caso piloto: el wearable RDK X5 `16d08ade217e` (sacar cable+protoboard; re-angular hacia HuskyLens 2 / Grove Vision AI, o dejar educativo).
- Reusa el patrón de verificación del enjambre de contenido (subagente por tutorial, dos pasadas).

---

## 5. Modelo de datos

Extensión de cada objeto en `linked_products_json` (no rompe lo existente; campos nuevos opcionales):

```json
{
  "name_original": "Grove Vision AI V2 HX6538 ARM",
  "product_id": "GV2-1",
  "wc_id": 0,
  "price_clp": 34900,
  "stock_available": true,
  "image_url": "...",
  "product_url": "...?utm_source=blog&utm_medium=tutorial&utm_campaign=<slug>",
  "matched_material": "Cámara con IA para detección de objetos",   // NUEVO: mapeo explícito
  "relevance": 0.86,                                                // NUEVO: score del matcher
  "is_alternative": true,                                           // NUEVO: es sustituto
  "alternative_note": "alternativa on-device; detecta menos clases que una SBC con NPU"  // NUEVO
}
```

`MaterialsList.tsx` renderiza por `matched_material` cuando existe; si no, cae al match fuzzy actual (retrocompatibilidad con tutoriales viejos hasta que el backfill los actualice).

---

## 6. Manejo de errores y casos límite

- **Backend de búsqueda caído:** el matcher devuelve vacío y el tutorial queda sin productos linkeados (no inventa). El gate de coherencia no bloquea por "0 productos" (0 es válido y honesto).
- **Material genérico (jumpers, protoboard):** se mantiene el match por token único + valor que ya funciona; el piso de relevancia y el tipo solo se suman, no reemplazan los aciertos actuales.
- **Tutorial educativo sin productos:** permitido explícitamente; el gate no lo rechaza.
- **Sustituto dudoso:** si el matcher no puede afirmar equivalencia técnica, NO sustituye (mejor "no disponible" honesto que un OLED-por-eInk).

## 7. Testing

- Unit: `match_products.py` con casos conocidos (microSD → no debe devolver "pantalla Pi"; "cámara IA" → debe devolver Grove Vision/HuskyLens; e-ink → no debe devolver OLED como equivalente).
- Unit: `findProduct` con `matched_material` explícito (no más falso match Pi/microSD).
- Gate: un tutorial con producto huérfano/basura debe ser retenido; uno limpio debe pasar; uno educativo (0 productos) debe pasar.
- Regresión: re-correr el matcher sobre los 6 tutoriales auditados y verificar que el wearable ya no tiene basura.

## 8. Secuencia y entrega

Fase 0 y 1 son la base (alto impacto, bajo riesgo) y se pueden liberar juntas. Fase 2 y 3 suben la inteligencia. Fase 4 limpia el corpus existente. Cada fase es liberable por separado.

## 9. Riesgos

- **Principal:** el gate imagen↔título es lo más difícil de automatizar bien (requiere visión). Mitigación: arrancar como heurística barata (genéricas + chequeo liviano), endurecer después; nunca bloquear el pipeline de entrada por este chequeo en su versión v1.
- **Acceso headless al backend de búsqueda** (Fase 0): si no se encuentra endpoint HTTP, se usa el fallback de scrape con las reglas nuevas encima.

## 10. Fuera de alcance (futuro)

- Panel admin para blocklist/overrides manuales (la idea de Esteban + el "PANEL PRO" pendiente). Se puede layerizar después; este diseño lo hace innecesario para el caso común, pero un override manual sería un buen complemento.
- Scoring de calidad de imagen ("IMAGE PRO" pendiente).

## 11. Criterio de éxito

- 0 tutoriales con productos linkeados que no estén en su lista de materiales (fin del relleno basura).
- 0 falsos matches por solapamiento de tokens (mapeo explícito).
- Los tutoriales con componentes no vendidos o se re-angulan a productos reales en stock, o quedan educativos; ninguno con basura.
- El gate retiene cualquier tutorial incoherente antes de publicar.
