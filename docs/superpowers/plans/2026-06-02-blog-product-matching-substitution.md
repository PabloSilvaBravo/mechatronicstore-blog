# Matching y sustitución inteligente de productos — Plan de implementación (Fundación)

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** que el blog nunca linkee productos basura ni haga falsos matches, mediante mapeo explícito material↔producto y un gate determinista, sin depender de la búsqueda semántica headless (que queda como spike).

**Architecture:** dos defensas deterministas que no necesitan el backend de búsqueda: (1) el frontend deja de adivinar por tokens y usa un campo explícito `matched_material`; (2) un gate en `content_swarm_lib.py` descarta cualquier producto que no corresponda a un material real antes de publicar. El autor (prompt) pasa a emitir el mapeo. La búsqueda semántica mejor y la sustitución fina van en un plan posterior, después del spike de Fase 0.

**Tech Stack:** Next.js 16 / TypeScript (vitest), Python 3.12 (pytest), Turso (libsql). Spec fuente: `docs/superpowers/specs/2026-06-02-blog-product-matching-substitution-design.md`.

**Comandos de test del repo:** TS → `npm run test` (vitest run). Python → `python3 -m pytest tests/ -v` (precedente: `tests/test_hard_filters.py`, que hace `sys.path.insert(0, .../scripts)`).

---

## File Structure

- **Create** `src/lib/materials-matching.ts` — lógica de match material↔producto, extraída de `MaterialsList.tsx` y exportada para test. Responsabilidad única: dado un material y la lista de `linked_products`, devolver el producto correspondiente, **priorizando el mapeo explícito `matched_material`** y cayendo al fuzzy legacy solo si no hay mapeo.
- **Modify** `src/app/blog/components/MaterialsList.tsx` — borrar la copia interna de `findProduct` y consumir `materials-matching.ts`.
- **Modify** `src/lib/db/queries.ts` (tipo `TutorialPublished["linked_products"]`) — agregar campos opcionales `matched_material`, `relevance`, `is_alternative`, `alternative_note`.
- **Create** `tests/materials-matching.test.ts` — vitest; cubre el caso Pi/microSD y huérfanos.
- **Modify** `scripts/content_swarm_lib.py` — agregar `validate_product_coherence()` y llamarla en `cmd_publish` y `cmd_stage` para descartar productos basura.
- **Create** `tests/test_product_coherence.py` — pytest; cubre el caso wearable (cable+protoboard) y el legítimo.
- **Modify** `docs/routines/blog-translation-prompt.md` — formato `linked_products` con los 4 campos nuevos + regla de sustitución honesta.
- **Create** `docs/superpowers/spikes/2026-06-02-headless-search-access.md` — resultado del spike de Fase 0.
- **Create** `scripts/backfill_product_matching.py` — orquesta el barrido del corpus (Tarea 5).

---

## Task 1: Mapeo explícito material↔producto en el frontend

Mata el bug de falso match (microSD que pega a un producto "Raspberry Pi" por solapar el token "Raspberry Pi OS").

**Files:**
- Create: `src/lib/materials-matching.ts`
- Modify: `src/lib/db/queries.ts` (tipo de `linked_products`)
- Modify: `src/app/blog/components/MaterialsList.tsx:25-200` (quitar `findProduct` local, importar del lib)
- Test: `tests/materials-matching.test.ts`

- [ ] **Step 1: Agregar campos al tipo `linked_products`**

En `src/lib/db/queries.ts`, en el tipo del elemento de `TutorialPublished["linked_products"]`, agregar (opcionales, no rompen lo existente):

```typescript
  matched_material?: string | null;   // nombre EXACTO del material al que corresponde
  relevance?: number | null;          // 0..1, score del matcher (futuro)
  is_alternative?: boolean | null;    // true si es sustituto, no el componente exacto
  alternative_note?: string | null;   // 1 línea honesta del porqué del sustituto
```

- [ ] **Step 2: Escribir el test que falla**

Crear `tests/materials-matching.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { matchProductToMaterial } from "../src/lib/materials-matching";

const PI = { name_original: "Raspberry Pi 4 Model B", product_id: "GS3-1", wc_id: 1, price_clp: 49990, stock_available: true, product_url: "", image_url: "", matched_material: "Raspberry Pi (Pi Zero 2 W, Pi 3, Pi 4 o Pi 5)" };
const SD_PROD = { name_original: "Tarjeta microSD 32GB", product_id: "C-901", wc_id: 2, price_clp: 6990, stock_available: true, product_url: "", image_url: "", matched_material: "Tarjeta microSD 8 GB o más con Raspberry Pi OS" };

describe("matchProductToMaterial — mapeo explícito", () => {
  it("la microSD NO matchea el producto Raspberry Pi (bug histórico)", () => {
    const m = matchProductToMaterial("Tarjeta microSD 8 GB o más con Raspberry Pi OS", [PI, SD_PROD]);
    expect(m?.product_id).toBe("C-901");
  });

  it("el material Raspberry Pi matchea SOLO el producto Pi", () => {
    const m = matchProductToMaterial("Raspberry Pi (Pi Zero 2 W, Pi 3, Pi 4 o Pi 5)", [PI, SD_PROD]);
    expect(m?.product_id).toBe("GS3-1");
  });

  it("un producto sin material correspondiente no se devuelve para materiales ajenos", () => {
    const ORPHAN = { name_original: "Protoboard 830", product_id: "C-302", wc_id: 3, price_clp: 3790, stock_available: true, product_url: "", image_url: "", matched_material: "Protoboard" };
    const m = matchProductToMaterial("Cámara USB", [ORPHAN]);
    expect(m).toBeUndefined();
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm run test -- materials-matching`
Expected: FAIL — `matchProductToMaterial` no existe / módulo no encontrado.

- [ ] **Step 4: Implementar `materials-matching.ts`**

Crear `src/lib/materials-matching.ts`. Mover la lógica fuzzy actual (las constantes `UNIQUE_TECH_KEYWORDS`, `GENERIC_COMPONENTS`, `VALUE_RE`, `tokenize`, y el cuerpo de `findProduct`) desde `MaterialsList.tsx` tal cual, renombrando la función a `fuzzyMatch`. Luego exportar la función nueva que prioriza el mapeo explícito:

```typescript
function norm(s: string): string {
  return (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Producto[] tipado laxo para no acoplar al tipo de queries.ts
type P = { name_original: string; matched_material?: string | null; [k: string]: unknown };

export function matchProductToMaterial<T extends P>(materialName: string, products: T[]): T | undefined {
  const ml = norm(materialName);
  // 1) Mapeo EXPLÍCITO: si algún producto declara este material, gana (sin adivinar).
  const explicit = products.filter((p) => p.matched_material).find((p) => norm(p.matched_material as string) === ml);
  if (explicit) return explicit;
  // 2) Si HAY productos con mapeo explícito en el set, NO caemos a fuzzy para este material
  //    (evita robar un producto ya asignado a otro material). Solo fuzzy sobre los sin-mapear.
  const unmapped = products.filter((p) => !p.matched_material);
  if (unmapped.length === 0) return undefined;
  return fuzzyMatch(materialName, unmapped) as T | undefined;
}
```

(`fuzzyMatch` es el `findProduct` legacy movido aquí; mantiene retrocompat con tutoriales viejos que no tienen `matched_material`.)

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm run test -- materials-matching`
Expected: PASS (3 tests).

- [ ] **Step 6: Conectar `MaterialsList.tsx` al lib**

En `src/app/blog/components/MaterialsList.tsx`: borrar las constantes y `findProduct` locales (ahora viven en el lib), importar `matchProductToMaterial`, y reemplazar las 2 llamadas `findProduct(m.name, linkedProducts)` por `matchProductToMaterial(m.name, linkedProducts)`.

- [ ] **Step 7: Typecheck + test suite**

Run: `npx tsc --noEmit && npm run test`
Expected: sin errores TS; toda la suite verde.

- [ ] **Step 8: Commit**

```bash
git add src/lib/materials-matching.ts src/lib/db/queries.ts src/app/blog/components/MaterialsList.tsx tests/materials-matching.test.ts
git commit -m "fix(blog): match material-producto por mapeo explicito, no por tokens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Gate determinista que descarta productos basura

Mata el relleno basura (el wearable RDK X5 con "Cable macho-hembra" + "Protoboard" que no están en sus materiales). Corre en `stage`/`publish` antes de persistir.

**Files:**
- Modify: `scripts/content_swarm_lib.py` (agregar `validate_product_coherence`, llamarla en `cmd_publish` y `cmd_stage`)
- Test: `tests/test_product_coherence.py`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/test_product_coherence.py`:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from content_swarm_lib import validate_product_coherence

MATERIALS = [
    {"name": "D-Robotics RDK X5 (placa con NPU integrada)"},
    {"name": "Cámara USB"},
]

def test_descarta_producto_huerfano():
    # cable + protoboard NO estan en materiales -> basura -> se descartan
    prods = [
        {"name_original": "Cable macho a hembra 10 cm", "matched_material": None},
        {"name_original": "Protoboard 830 puntos", "matched_material": None},
    ]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert clean == []
    assert len(dropped) == 2

def test_mantiene_producto_con_material_mapeado():
    prods = [{"name_original": "Cámara USB OV5640", "matched_material": "Cámara USB"}]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert len(clean) == 1
    assert dropped == []

def test_legacy_sin_mapeo_usa_fuzzy_por_token_unico():
    # tutorial viejo sin matched_material: "Cámara USB" comparte token con "Cámara USB OV5640"
    prods = [{"name_original": "Cámara USB OV5640", "matched_material": None}]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert len(clean) == 1
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `python3 -m pytest tests/test_product_coherence.py -v`
Expected: FAIL — `validate_product_coherence` no existe.

- [ ] **Step 3: Implementar `validate_product_coherence` en `content_swarm_lib.py`**

Agregar (cerca de los helpers de slug). Usa `unicodedata`/`re` ya importados:

```python
def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def validate_product_coherence(materials, linked_products):
    """Devuelve (clean, dropped). Un producto se MANTIENE si:
      - tiene matched_material que coincide (normalizado) con algun material, o
      - (legacy, sin matched_material) comparte >=1 token significativo (>=4 chars
        o keyword tecnico) con algun material.
    Cualquier otro producto es BASURA y se descarta.
    """
    mats = [_norm(m.get("name", "")) for m in (materials or [])]
    mat_tokens = set()
    for m in mats:
        for t in re.split(r"[^a-z0-9]+", m):
            if len(t) >= 4:
                mat_tokens.add(t)
    clean, dropped = [], []
    for p in (linked_products or []):
        mm = p.get("matched_material")
        if mm and _norm(mm) in mats:
            clean.append(p); continue
        if not mm:  # legacy: fuzzy por token
            pn = _norm(p.get("name_original", ""))
            ptoks = {t for t in re.split(r"[^a-z0-9]+", pn) if len(t) >= 4}
            if ptoks & mat_tokens:
                clean.append(p); continue
        dropped.append(p)
    return clean, dropped
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `python3 -m pytest tests/test_product_coherence.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Llamar el gate en `cmd_publish` y `cmd_stage`**

En ambas funciones, después de parsear `data` y antes del UPDATE, insertar:

```python
    # Gate de coherencia de productos (Pablo 2-jun-2026): descartar basura
    # (productos que no corresponden a ningun material del tutorial).
    try:
        _mats = data.get("materials_list_json")
        _mats = json.loads(_mats) if isinstance(_mats, str) else (_mats or [])
        _prods = data.get("linked_products_json")
        _prods = json.loads(_prods) if isinstance(_prods, str) else (_prods or [])
        _clean, _dropped = validate_product_coherence(_mats, _prods)
        if _dropped:
            print(f"WARN: gate descarto {len(_dropped)} producto(s) basura: "
                  f"{[p.get('name_original') for p in _dropped]}", file=sys.stderr)
            data["linked_products_json"] = json.dumps(_clean, ensure_ascii=False)
    except Exception as e:
        print(f"WARN: gate de coherencia fallo ({e}); sigo sin filtrar.", file=sys.stderr)
```

- [ ] **Step 6: Compilar + test suite Python**

Run: `python3 -m py_compile scripts/content_swarm_lib.py && python3 -m pytest tests/test_product_coherence.py tests/test_hard_filters.py -v`
Expected: compila; tests verdes.

- [ ] **Step 7: Commit**

```bash
git add scripts/content_swarm_lib.py tests/test_product_coherence.py
git commit -m "feat(blog): gate descarta productos basura en stage/publish

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: El autor emite el mapeo explícito + sustitución honesta

Para que los tutoriales NUEVOS traigan `matched_material` (y el frontend + gate lo usen) y se sustituya con criterio.

**Files:**
- Modify: `docs/routines/blog-translation-prompt.md` (sección "Formato linked_products" ~línea 430 + reglas de sustitución)

- [ ] **Step 1: Actualizar el formato de `linked_products` en el prompt**

En la sección "Formato linked_products", agregar a cada objeto los campos obligatorios y la instrucción:

```
Cada producto en linked_products DEBE incluir:
- "matched_material": el nombre EXACTO (copiado tal cual) del material de
  materials_list al que corresponde. Si no corresponde a NINGÚN material, NO
  incluyas el producto (es relleno y será descartado por el gate).
- "is_alternative": true si es un sustituto (no el componente exacto del tutorial).
- "alternative_note": si is_alternative, una línea honesta ("alternativa más
  simple; no es e-ink"). Si no, omitir o null.
```

- [ ] **Step 2: Agregar la regla de sustitución honesta**

En la sección de detección de productos, agregar:

```
SUSTITUCIÓN (regla dura): solo sustituí por un equivalente TÉCNICAMENTE válido.
- Prohibido ofrecer un OLED/TFT como reemplazo de un e-ink en un tutorial que
  trata de e-ink (son tecnologías opuestas, distinto caso de uso).
- Si el componente central no se vende pero hay un equivalente real que SÍ
  permite el proyecto (ej. visión con IA -> HuskyLens 2 o Grove Vision AI V2),
  podés re-angular el alcance y declararlo, marcando is_alternative=true.
- Si no hay equivalente honesto, dejá el material SIN producto (educativo). NUNCA
  rellenes con un producto barato no relacionado.
```

- [ ] **Step 3: Verificación (smoke)**

Run: `grep -c "matched_material" docs/routines/blog-translation-prompt.md`
Expected: ≥ 1.

- [ ] **Step 4: Commit**

```bash
git add docs/routines/blog-translation-prompt.md
git commit -m "docs(routine-c): autor emite matched_material + sustitucion honesta

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 (SPIKE): acceso headless a la búsqueda semántica

Time-box 60-90 min. Resuelve si el pipeline (Routine C en CCR / GitHub Actions) puede hacer búsqueda semántica sin el MCP interactivo.

**Files:** Create `docs/superpowers/spikes/2026-06-02-headless-search-access.md`

- [ ] **Step 1: Buscar config del backend**

Revisar el repo del MCP `mecha-mcp` (servidor que expone `buscar_productos`) y el dashboard VPS: ¿hay un endpoint HTTP de Meilisearch (URL + key de búsqueda) o un endpoint REST del dashboard que un script pueda llamar? Buscar en configs/infra, no en el blog (el blog no lo tiene).

- [ ] **Step 2: Probar el endpoint**

Si se encuentra, hacer un `curl` de prueba con una query conocida ("camara IA deteccion objetos") y confirmar que devuelve productos con stock/precio. Documentar URL, auth, forma de respuesta.

- [ ] **Step 3: Decidir y documentar**

Escribir el spike doc con UNA de dos conclusiones:
- **Camino A:** existe endpoint → especificar cómo `scripts/match_products.py` lo llamará (deja listo el siguiente plan).
- **Camino B:** no hay endpoint accesible → el pipeline headless usa el scrape de `mechatronicstore.cl/?s=` (como hoy el enjambre) con las reglas de relevancia/tipo encima; el match semántico bueno queda solo para corridas agénticas (backfill/enjambre, que sí tienen MCP).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/spikes/2026-06-02-headless-search-access.md
git commit -m "spike(blog): acceso headless a busqueda semantica de la tienda

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Backfill del corpus (corrida agéntica con MCP)

Limpia lo existente con el gate nuevo. Es agéntica (usa el MCP de la tienda), no un cron headless.

**Files:** Create `scripts/backfill_product_matching.py` (selector) + ejecución vía enjambre.

- [ ] **Step 1: Script selector**

`scripts/backfill_product_matching.py`: lista los tutoriales `published`/`staged` cuyo `linked_products_json` tenga al menos un producto SIN `matched_material` o que el gate `validate_product_coherence` marque como basura. Imprime los ids priorizados (más basura primero). Reusa `validate_product_coherence` (importándola de `content_swarm_lib`).

- [ ] **Step 2: Verificar el selector contra el caso conocido**

Run: `python3 scripts/backfill_product_matching.py --dry-run`
Expected: el wearable `16d08ade217e` aparece en la lista (tiene cable+protoboard basura).

- [ ] **Step 3: Enjambre de backfill**

Por cada id: un subagente Opus que (a) lee materiales + tema, (b) busca productos reales con el MCP `buscar_productos`, (c) arma `linked_products` con `matched_material` por producto, descartando lo que no corresponde, (d) re-angula o deja educativo si no hay equivalente (caso RDK X5 → HuskyLens 2 / Grove Vision AI V2, o educativo), (e) persiste con `content_swarm_lib.py setfields` (el gate corre solo). Patrón idéntico al enjambre de contenido (subagente por tutorial, throttle en tandas de 4, guarda anti rate/session-limit).

- [ ] **Step 4: Verificar**

Run: `python3 scripts/backfill_product_matching.py --dry-run`
Expected: lista vacía (0 tutoriales con basura).

- [ ] **Step 5: Commit + push + purgar CF**

```bash
git add scripts/backfill_product_matching.py
git commit -m "feat(blog): backfill de matching de productos sobre el corpus

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
./scripts/purge_cf_cache.sh
```

---

## Planes siguientes (fuera de esta fundación)

1. **Búsqueda semántica en el pipeline** (depende del resultado del Task 4 spike): `scripts/match_products.py` + integración en Routine C para que los tutoriales nuevos descubran los productos correctos automáticamente (hoy el wearable no encontró HuskyLens 2 / Grove Vision que SÍ existen).
2. **Gate de coherencia imagen↔título** (requiere visión): v1 bloquea genéricas conocidas (`GENERIC_IMAGE_URL_PATTERNS` ya existe en `scraper.py`); v2 chequeo con visión. Se suma al gate del Task 2.
3. **Panel admin / blocklist manual** (el "PANEL PRO" pendiente) como override humano.

---

## Self-Review

**Cobertura del spec:**
- Fase 1 (piso de relevancia + match por tipo + mapeo explícito) → Task 1 (frontend) + Task 2 (gate). ✓ El "match por tipo" fuerte y el "piso de relevancia" numérico dependen de la búsqueda semántica (Task 4 + plan siguiente); la versión determinista (mapeo explícito + descarte de huérfanos) cubre los bugs reales ya.
- Fase 2 (sustitución honesta) → Task 3 (prompt). ✓ La sustitución automática fina va al plan siguiente.
- Fase 3 (gate de coherencia) → Task 2 cubre producto↔tema; imagen↔título queda en planes siguientes (requiere visión, declarado). ✓ parcial y explícito.
- Fase 0 (acceso headless) → Task 4 spike. ✓
- Fase 4 (backfill) → Task 5. ✓
- Modelo de datos (`matched_material` etc.) → Task 1 Step 1 + Task 3. ✓

**Placeholders:** ninguno; todo paso de código trae código. Task 4 es un spike legítimo (no código contra unknown). Task 5 Step 3 es agéntico por naturaleza (brief concreto).

**Consistencia de tipos:** `matched_material` se define en Task 1 Step 1 (queries.ts) y se usa idéntico en `matchProductToMaterial` (Task 1), `validate_product_coherence` (Task 2) y el prompt (Task 3). `validate_product_coherence(materials, linked_products) -> (clean, dropped)` se define en Task 2 y se reusa en Task 5.
