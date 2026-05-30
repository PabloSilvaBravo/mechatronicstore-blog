"""
Persiste data/blog-translate-output.json a la DB.

Para cada translation:
  - UPDATE tutorials con todas las columnas estructuradas
  - status='published'
  - published_at = now UTC
  - hero_image_url: usa el del output si viene, sino fallback a re-fetch
    del source_url (og:image extraction).

Pablo 17-may-2026 audit-blog B9: el persist no estaba capturando
hero_image_url, dejando tutoriales sin foto.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db
from hero_picker import select_best_hero
import re as _re

# Pablo 23-may-2026 fase 1.5 — opcional R2 rehost de imágenes inline
# del body_es markdown y steps[].image_url. Inmuniza contra hotlink
# protection de sources externas (studiopieters, hackaday, etc.).
# Si R2_REHOST_ENABLED=1, hace el rehost; sino deja URLs externas.
_R2_INLINE_ENABLED = os.environ.get("R2_REHOST_ENABLED", "1") == "1"
try:
    from r2_uploader import rehost_hero as _r2_rehost  # type: ignore
    from r2_uploader import (  # type: ignore
        rehost_hero_strict as _r2_rehost_strict,
        is_configured as _r2_is_configured,
        is_already_rehosted as _r2_is_already_rehosted,
    )
except Exception:
    _r2_rehost = None  # type: ignore
    _r2_rehost_strict = None  # type: ignore
    _r2_is_configured = None  # type: ignore
    _r2_is_already_rehosted = None  # type: ignore
    _R2_INLINE_ENABLED = False

# Regex para extraer URLs de markdown ![alt](url) y de plain URLs en src.
# Captura el grupo 1 (URL) con alt opcional antes.
_MD_IMAGE_RE = _re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")

# ---------------------------------------------------------------------------
# Pablo 30-may-2026 — CHOKEPOINT de validacion + saneo del output de Routine C.
#
# El persist era un passthrough ciego: guardaba body_es/title_es/code_blocks
# exactamente como venian del modelo. La auditoria del enjambre encontro que
# Routine C produce defectos sistematicos:
#   - Codigo destruido: angle brackets vaciados (#include <WiFi.h> -> sin <...>),
#     operadores < > <= borrados, o el bloque entero como la palabra "None".
#   - Rayas de marca: em (raya), en (guion medio), minus (signo menos) en prosa,
#     y compuestos como "Wi-Fi" (la marca NUNCA usa guion).
#   - Cuerpo cortado a media palabra (input al modelo truncado mid-word).
#
# Las dos funciones de saneo (dashes de marca) son CODE-FENCE-AWARE: jamas
# tocan el contenido dentro de bloques cercados (```...```), inline code
# (`...`) ni URLs. El codigo es sagrado: si "a < b" vive dentro de un fence,
# queda intacto. La validacion de codigo NO altera nada, solo detecta basura.
# ---------------------------------------------------------------------------

# Fence cercado: ``` o ~~~ (con lenguaje opcional) hasta el cierre del mismo
# tipo. DOTALL para que abarque multiples lineas. Non-greedy.
_FENCE_RE = _re.compile(r"(?:```|~~~)[^\n]*\n.*?(?:```|~~~)", _re.DOTALL)
# Inline code: 1+ backticks de apertura, mismo numero de cierre. Capturamos
# corridas de backticks para respetar el largo (``a`b`` es 1 solo span).
_INLINE_CODE_RE = _re.compile(r"(`+)(?:.+?)\1")
# URLs crudas (http/https) — no queremos normalizar guiones dentro de una URL.
_RAW_URL_RE = _re.compile(r"https?://[^\s\)<>\]]+")
# Markdown link/imagen completo ![alt](url) o [txt](url): protegemos la URL
# pero NO el texto visible (alt/label SI debe sanearse). Se maneja aparte.
_MD_LINK_URL_RE = _re.compile(r"(\]\()([^)\s]+)")

# Caracteres de raya/guion prohibidos en copy de marca y su reemplazo por
# defecto. La raya larga (em) suele ser puntuacion -> punto y espacio.
_EM_DASH = "—"   # raya (em dash)
_EN_DASH = "–"   # guion medio (en dash)
_MINUS = "−"     # signo menos
_FIG_DASH = "‒"  # figure dash
_HORBAR = "―"    # horizontal bar


def _split_protected(md: str):
    """Tokeniza el markdown en segmentos (texto, es_protegido).

    Protegido = dentro de fence cercado, inline code, o URL cruda. Esos
    segmentos NUNCA se tocan. El resto es prosa saneable.

    Returns: lista de tuplas (segmento:str, protegido:bool) en orden, cuya
    concatenacion reconstruye el markdown original byte a byte.
    """
    if not md:
        return [(md or "", False)]
    spans: list[tuple[int, int]] = []
    for rx in (_FENCE_RE, _INLINE_CODE_RE, _RAW_URL_RE):
        for m in rx.finditer(md):
            spans.append((m.start(), m.end()))
    if not spans:
        return [(md, False)]
    # Merge de spans solapados/adyacentes para no romper offsets.
    spans.sort()
    merged: list[list[int]] = []
    for s, e in spans:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    out: list[tuple[str, bool]] = []
    cur = 0
    for s, e in merged:
        if s > cur:
            out.append((md[cur:s], False))
        out.append((md[s:e], True))
        cur = e
    if cur < len(md):
        out.append((md[cur:], False))
    return out


def _sanitize_brand_dashes_prose(text: str) -> tuple[str, int]:
    """Reemplaza rayas/guiones de marca en un fragmento de PROSA (ya sin code).

    Reglas (regla estricta de marca, sin guiones nunca):
      - Raya larga (em) usada como puntuacion -> punto+espacio si separa
        oraciones, sino dos puntos. Heuristica simple: ", X — Y" pasa a
        ", X. Y"; espacios alrededor se normalizan.
      - Guion medio (en), signo menos, figure dash, horizontal bar -> coma o
        nada segun contexto.
      - "Wi-Fi"/"wi-fi" -> "WiFi"; "2-en-1" -> "2 en 1"; rangos "9-12V" se
        dejan al lector (no son copy de prosa) — pero un guion entre palabras
        alfabeticas tipo "plug-and-play" -> "plug and play".

    Retorna (texto_saneado, n_cambios).
    """
    if not text:
        return text, 0
    n = 0

    # 1. Compuestos de marca conocidos primero (case-insensitive).
    def _wifi(m):
        nonlocal n
        n += 1
        return "WiFi"
    text, c = _re.subn(r"Wi[\-‑]Fi", _wifi, text, flags=_re.IGNORECASE)

    # 2. "<num>-en-<num>" / "<num>-in-<num>" -> "<num> en <num>".
    text, c = _re.subn(r"(\d+)\s*-\s*en\s*-\s*(\d+)", r"\1 en \2", text)
    n += c

    # 3. Em dash / horizontal bar como puntuacion. Si tiene espacios a los
    #    lados ("texto — texto") es un inciso -> ". " (punto). Si esta pegado
    #    ("texto—texto") -> ", ".
    def _emrepl(m):
        nonlocal n
        n += 1
        left, right = m.group(1), m.group(2)
        # Inciso con espacios -> punto y mayuscula si parece nueva oracion.
        return f"{left}. {right}" if (left and right) else (left or right)
    # con espacios
    text, c = _re.subn(rf"(\S)\s*[{_EM_DASH}{_HORBAR}]\s*(\S)", _emrepl, text)

    # 4. En dash / minus / figure dash. Entre numeros (rango "10-20") -> "a";
    #    entre palabras -> espacio (quita el guion). Suelto -> coma.
    other = f"{_EN_DASH}{_MINUS}{_FIG_DASH}"
    def _numrange(m):
        nonlocal n
        n += 1
        return f"{m.group(1)} a {m.group(2)}"
    text, c = _re.subn(rf"(\d)\s*[{other}]\s*(\d)", _numrange, text)
    def _otherrepl(m):
        nonlocal n
        n += 1
        left, right = m.group(1), m.group(2)
        return f"{left}, {right}" if (left and right) else (left or right)
    text, c = _re.subn(rf"(\S)\s*[{other}]\s*(\S)", _otherrepl, text)

    # 5. Guion ASCII '-' entre dos palabras alfabeticas (no codigo, ya filtrado)
    #    tipo "plug-and-play", "plug-in", "step-by-step" -> espacio. NO toca
    #    nombres de modelo con digitos (ESP32-C6) ni fechas (no hay aca).
    def _alphahyphen(m):
        nonlocal n
        n += 1
        return f"{m.group(1)} {m.group(2)}"
    text, c = _re.subn(r"([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})-([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})", _alphahyphen, text)

    return text, n


def sanitize_brand_dashes(md: str) -> tuple[str, int]:
    """Aplica el saneo de guiones de marca preservando code fences, inline
    code y URLs. Tambien sanea el texto VISIBLE de links/imagenes ([alt],
    [label]) pero deja la URL intacta.

    Retorna (markdown_saneado, n_cambios_totales).
    """
    if not md:
        return md, 0
    total = 0
    out_parts: list[str] = []
    for seg, protected in _split_protected(md):
        if protected:
            out_parts.append(seg)
            continue
        # Dentro de prosa puede haber markdown links/imagenes: proteger SOLO
        # la porcion `](url`. Partimos por esa pieza, saneamos el resto.
        last = 0
        sub_parts: list[str] = []
        for m in _MD_LINK_URL_RE.finditer(seg):
            pre = seg[last:m.start()]
            cleaned, n = _sanitize_brand_dashes_prose(pre)
            total += n
            sub_parts.append(cleaned)
            sub_parts.append(m.group(0))  # `](url` intacto
            last = m.end()
        tail = seg[last:]
        cleaned, n = _sanitize_brand_dashes_prose(tail)
        total += n
        sub_parts.append(cleaned)
        out_parts.append("".join(sub_parts))
    return "".join(out_parts), total


def validate_code_blocks(code_blocks) -> list[str]:
    """Detecta bloques de codigo corruptos en el output de Routine C.

    NO altera nada (el codigo jamas se modifica). Devuelve una lista de
    problemas humano-legibles; vacia = sano. El caller decide si rechaza o
    loguea fuerte.

    Detecta:
      - code es None / null  -> el modelo devolvio null y se stringificaria.
      - code vacio o solo whitespace.
      - code == "None"/"null"/"undefined" literal (stringificacion de basura).
      - #include con angle brackets vaciados: "#include <>" o "#include <"
        sin cerrar o "#include  " seguido de salto (header borrado).
    """
    problems: list[str] = []
    if not isinstance(code_blocks, list):
        return problems
    for i, b in enumerate(code_blocks):
        if not isinstance(b, dict):
            continue
        code = b.get("code")
        cap = (b.get("caption") or b.get("lang") or f"#{i}")
        if code is None:
            problems.append(f"bloque '{cap}': code es None (modelo devolvio null)")
            continue
        cstr = str(code)
        if not cstr.strip():
            problems.append(f"bloque '{cap}': code vacio")
            continue
        if cstr.strip().lower() in ("none", "null", "undefined"):
            problems.append(f"bloque '{cap}': code es literal '{cstr.strip()}'")
            continue
        if _re.search(r"#include\s*<\s*>", cstr):
            problems.append(f"bloque '{cap}': #include con <> vaciado")
        elif _re.search(r"#include\s*<[^>\n]*$", cstr, _re.MULTILINE):
            problems.append(f"bloque '{cap}': #include con < sin cerrar")
    return problems


def body_es_looks_truncated(body_es: str) -> bool:
    """Heuristica: True si el body_es parece cortado a media palabra.

    Un cuerpo bien terminado cierra con puntuacion, fence, lista, header o
    cita. Si termina en una letra/numero suelto (palabra incompleta) y NO
    cierra un fence, es sospechoso de truncado del input al modelo.
    """
    if not body_es:
        return False
    # Remover bloques cercados COMPLETOS primero. Lo que queda con un opener
    # de fence al inicio de linea (``` / ~~~) sin cierre = fence truncado.
    # Esto evita falsos positivos cuando se usan corridas de 3+ backticks
    # como inline code (ej. "...```\nmas texto.") que no son un fence real.
    no_fences = _FENCE_RE.sub("", body_es)
    if _re.search(r"(?m)^[ \t]*(?:```|~~~)", no_fences):
        return True
    stripped = body_es.rstrip()
    if not stripped:
        return False
    last = stripped[-1]
    # Cierres validos: puntuacion, parentesis/comillas/backtick, asterisco
    # (bold/lista), dos puntos, mayor-que (cita), guion de lista.
    if last in ".!?)\"'`*:>]_":
        return False
    # Termina en letra/digito -> probable palabra cortada.
    return last.isalnum()

# Pablo 22-may-2026: helper inverso de to_thumb_url (enrich_linked_products.py).
# Los thumbs de productos vienen como `foto-100x100.webp` (cropeado para card).
# Para usar como HERO necesitamos la version full-res (foto.webp ~600-1200px)
# que WordPress también sirve en el mismo path sin sufijo de tamaño.
_THUMB_SIZE_RE = _re.compile(
    r"-\d+x\d+(\.(?:jpg|jpeg|png|webp|gif|avif))(\?.*)?$", _re.IGNORECASE
)

# Placeholders genéricos del catálogo MS (Flatsome usa estos cuando el
# producto no tiene foto propia subida). Skipearlos para que dos tutoriales
# que linkean el mismo producto-sin-foto NO terminen con el mismo hero.
# Pablo 22-may-2026: matcheamos por PREFIJO porque las URLs en
# linked_products_json incluyen sufijos -100x100 / -600x600 etc.
GENERIC_PLACEHOLDER_PREFIXES = (
    "portada-productos-",  # cubre portada-productos-600x600*, -100x100, etc.
)


def to_full_res(url: str) -> str:
    """Quita el sufijo -WxH de un URL de WP image para usar full-res."""
    if not url:
        return url
    return _THUMB_SIZE_RE.sub(r"\1\2", url, count=1)


def is_generic_placeholder(url: str) -> bool:
    """True si el URL es uno de los placeholders genéricos del store (prefix match)."""
    if not url:
        return False
    # Extraer basename y comparar contra prefijos conocidos
    basename = url.rsplit("/", 1)[-1]
    return any(basename.startswith(p) for p in GENERIC_PLACEHOLDER_PREFIXES)

ROOT = Path(__file__).parent.parent
INPUT = ROOT / "data" / "blog-translate-output.json"


def rehost_inline_images(body_es: str, steps: list, tid: str) -> tuple[str, list, int]:
    """
    Pablo 23-may-2026 fase 1.5 — rehospede todas las URLs externas de
    imágenes inline (en body_es markdown y steps[].image_url) a R2.

    Inmuniza contra hotlink protection de sources externas. Si R2 no
    está habilitado o el rehost individual falla, deja la URL externa
    como fallback (mejor imagen rota visible que imagen ausente).

    Returns: (body_es_new, steps_new, n_rehosted)
    """
    if not _R2_INLINE_ENABLED or _r2_rehost is None:
        return body_es, steps, 0

    n_rehosted = 0
    # Cache local: misma URL en múltiples steps/body → 1 sola subida.
    url_cache: dict[str, str] = {}

    def rehost(url: str) -> str:
        nonlocal n_rehosted
        if not url or not url.startswith(("http://", "https://")):
            return url
        if url in url_cache:
            return url_cache[url]
        try:
            r2_url = _r2_rehost(url, tutorial_id=tid)
        except Exception as e:
            print(f"    ⚠ R2 rehost inline falló para {url[:60]}: {e}")
            return url
        if r2_url and r2_url != url:
            n_rehosted += 1
        url_cache[url] = r2_url or url
        return url_cache[url]

    # 1. Rehost imágenes en body_es markdown ![alt](url)
    def replace_md(m: _re.Match) -> str:
        alt = m.group(1)
        url = m.group(2)
        new_url = rehost(url)
        return f"![{alt}]({new_url})"

    new_body_es = _MD_IMAGE_RE.sub(replace_md, body_es) if body_es else body_es

    # 2. Rehost steps[].image_url
    new_steps = []
    for step in (steps or []):
        if isinstance(step, dict) and step.get("image_url"):
            new_step = dict(step)
            new_step["image_url"] = rehost(step["image_url"])
            new_steps.append(new_step)
        else:
            new_steps.append(step)

    return new_body_es, new_steps, n_rehosted


def rehost_hero_to_r2(hero_url: str | None, tid: str) -> str | None:
    """
    Pablo 30-may-2026 — CHOKEPOINT OBLIGATORIO de espejo del hero a R2.

    Root cause del bug de imágenes rotas en /blog/tutoriales: el persist
    aplicaba select_best_hero (que solo FILTRA dominios en blocklist) pero
    NUNCA espejaba el hero a R2. Sources como electroniclinic.com,
    pimylifeup.com, components101.com y mechatronicstore.cl responden 200 a
    una descarga server-side pero hotlink-bloquean al navegador (Referer /
    Sec-Fetch-Site), así que el <img> queda 0x0 y la card sale en blanco.

    Esta función descarga el hero con UA de navegador + Referer del origen
    (r2_uploader._download_image) y lo sube a R2. Si el rehost FALLA, NO
    conservamos silenciosamente la URL externa: logueamos RUIDOSO y caemos a
    los fallbacks de abajo (None → la card usa fallback de marca). Mejor un
    hero faltante visible que una card rota indetectable.

    Reglas:
    - Si R2 no está habilitado o no hay creds (caso CCR cloud), devuelve la
      URL tal cual con WARN. El script LOCAL post_translate_rehost +
      backfill_blog_heroes_r2 la espejará después.
    - Si la URL ya está en R2, la devuelve sin tocar (idempotente).
    """
    if not hero_url:
        return hero_url
    # Sin creds (típico en CCR cloud): no podemos espejar acá. Dejamos la URL
    # y avisamos fuerte — el rehost local la recuperará.
    if (
        not _R2_INLINE_ENABLED
        or _r2_rehost_strict is None
        or _r2_is_configured is None
        or not _r2_is_configured()
    ):
        print(
            "    ⚠ R2 NO configurado: hero externo NO espejado, queda "
            f"pendiente de rehost local → {hero_url[:80]}"
        )
        return hero_url
    # Ya en nuestro CDN: nada que hacer.
    if _r2_is_already_rehosted is not None and _r2_is_already_rehosted(hero_url):
        return hero_url
    try:
        r2_url = _r2_rehost_strict(hero_url, tutorial_id=tid)
        if r2_url and r2_url != hero_url:
            print(f"    ✓ hero espejado a R2: {r2_url[:80]}")
        return r2_url
    except Exception as e:
        # Fallo RUIDOSO: no conservamos el externo bloqueable.
        print(
            f"    ✗ ERROR espejando hero a R2 (NO se conserva el externo): "
            f"{hero_url[:80]} — {e}"
        )
        return None


def fetch_og_image(source_url: str) -> str | None:
    """Fallback: extrae og:image del source_url si la translation no lo trae."""
    try:
        from scraper import fetch_full_page
        page = fetch_full_page(source_url)
        return page.main_image_url
    except Exception:
        return None


def utc_now_sqlite() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def main():
    if not INPUT.exists():
        print(f"ERROR: {INPUT} no existe")
        sys.exit(1)

    data = json.loads(INPUT.read_text())
    translations = data.get("translations", [])
    translated_at = data.get("translated_at") or utc_now_sqlite()
    ts_sqlite = (
        translated_at[:19].replace("T", " ")
        if "T" in translated_at else translated_at
    )

    stats = {
        "persisted_published": 0,
        "missing_tutorial": 0,
        "errors": 0,
        "editorial_warning": 0,
        "editorial_blocked": 0,
        # Pablo 30-may-2026 — nuevos guards de integridad del output.
        "code_corrupt_blocked": 0,
        "body_truncated_blocked": 0,
        "brand_dashes_fixed": 0,
    }

    # Pablo 20-may-2026: checklist editorial pre-publish.
    # Cada tutorial debe pasar ≥3 de 5 checks para ser publicado. Si pasa
    # 2 o menos, queda en status='editorial_review' para revisión manual.
    def editorial_score(tr):
        body = tr.get("body_es") or ""
        checks = {
            # 1. ¿Body tiene link a downloadable concreto?
            "has_downloadable": any(p in body.lower() for p in [
                "github.com/", ".stl", "thingiverse", "printables.com",
                ".ino)", ".cpp)", ".py)", "library", "biblioteca",
                ".kicad", "gerber",
            ]),
            # 2. ¿Body tiene sección "Personalización para Chile"?
            "has_chile_section": any(p in body.lower() for p in [
                "personalización para chile", "personalizacion para chile",
                "en chile podés", "en chile podes", "en chile puedes",
                "mechatronicstore", "catálogo mechatronic", "catalogo mechatronic",
            ]),
            # 3. ¿Body tiene sección "Variantes y mejoras"?
            "has_variants_section": any(p in body.lower() for p in [
                "variantes y mejoras", "variantes y mejora",
                "extender el proyecto", "para ir más allá",
                "ideas para ampliar", "próximos pasos",
                "## variantes", "## mejoras",
            ]),
            # 4. ¿Tiene linked_products ≥2?
            "has_linked_products": len(tr.get("linked_products") or []) >= 2,
            # 5. ¿Auto-checklist editorial sin warning?
            "editorial_self_ok": not tr.get("editorial_quality_warning", False),
            # 6. ¿Tiene sección "Recursos" + link al original?
            # Pablo 20-may-2026 fix: forzar atribución obligatoria
            "has_attribution": (
                ("## recursos" in body.lower()
                 or "## fuente" in body.lower()
                 or "tutorial original" in body.lower()
                 or "basado en" in body.lower()
                 or "inspirado en" in body.lower())
                and "http" in body.lower()
            ),
        }
        passed = sum(checks.values())
        return passed, checks

    for tr in translations:
        tid = tr.get("id")
        if not tid:
            continue

        existing = db.execute(
            "SELECT id, status, source_url, hero_image_url, slug, published_at FROM tutorials WHERE id = ?",
            [tid],
        ).fetchone()
        if not existing:
            stats["missing_tutorial"] += 1
            continue
        existing_status = existing[1]
        existing_source_url = existing[2]
        existing_hero = existing[3]
        existing_slug = existing[4]
        existing_published_at = existing[5]  # Pablo 22-may-2026 (preserve)

        # Pablo 20-may-2026 audit: SLUGS ESTABLES.
        # Bug detectado: Routine C re-procesa tutoriales ya publicados (caso
        # edge: reset score → re-rank → re-translate) y reescribe el slug
        # con uno distinto. Eso rompe links externos y desindexa en Google.
        # Fix: si el tutorial YA tiene status='published' Y ya tiene slug,
        # PRESERVAR el slug existente. Routine C puede reescribir el body
        # pero NO el slug.
        # Caso primera publicación (status='ranked' o 'translating'): usar
        # slug nuevo del output.
        # Pablo 22-may-2026: si el tutorial YA tiene slug (cualquiera sea
        # su estado), preservarlo. Antes solo lo preservaba si estaba
        # 'published', pero re-translates manuales (SET status='ranked'
        # del que ya estaba published) cambiaban el slug → 404 SEO.
        # COALESCE: prefiere slug existente, fallback al del output.
        if existing_slug:
            slug_to_use = existing_slug
        else:
            slug_to_use = tr.get("slug")

        # Hero image: prioridad output > existente > fallback fetch og:image.
        # Pablo 22-may-2026: aplicar hero_picker.select_best_hero al final
        # para filtrar dominios bloqueados (studiopieters, tronixstuff) y
        # caer a primera img útil del body. Antes el blocklist solo se
        # aplicaba al ingest, así que re-translates de un tutorial con
        # source de un dominio bloqueado restauraban el hero malo.
        hero_url = tr.get("hero_image_url") or existing_hero
        extras: list[str] = []
        if existing_source_url:
            try:
                from scraper import fetch_full_page
                page = fetch_full_page(existing_source_url)
                extras = list(page.extra_images or [])
                if not hero_url and page.main_image_url:
                    hero_url = page.main_image_url
                    print(f"    ✓ og:image recuperada: {hero_url[:80]}")
            except Exception as e:
                print(f"    ⚠ fetch source falló para hero/extras: {e}")
        # Aplicar blocklist + filtro tracker/logo. Si hero está bloqueado
        # y extras tiene algo útil, lo reemplaza. Si nada usable, None.
        hero_url = select_best_hero(hero_url, extras)

        # Pablo 22-may-2026: FALLBACK universal cuando hero queda NULL
        # (e.g. source en blocklist tronixstuff/studiopieters y todas las
        # extras también del mismo dominio). En vez de placeholder gris,
        # usar la imagen del PRIMER producto linked con match_score≥0.85
        # (alta confianza editorial) en version full-res (sin -100x100).
        # Razones: (a) tutorial vende ese producto, foto contextual,
        # (b) refuerza marca MechatronicStore en vez de hueco, (c) cero
        # riesgo legal (catálogo propio), (d) regla universal — aplica a
        # cualquier tutorial futuro sin hero válido.
        if not hero_url:
            linked = tr.get("linked_products") or []
            # Cross-tutorial dedup: cargar heros ya usados por otros published
            # para NO replicar el mismo hero. Si producto A es usado como hero
            # de tutorial X, tutorial Y debe elegir producto B siguiente.
            already_used = set()
            try:
                rows_used = db.execute(
                    "SELECT hero_image_url FROM tutorials WHERE status='published' "
                    "AND hero_image_url IS NOT NULL AND id != ?",
                    [tid],
                ).fetchall()
                already_used = {r[0] for r in rows_used if r[0]}
            except Exception as e:
                print(f"    ⚠ dedup query falló: {e}")

            for p in linked:
                img = p.get("image_url")
                score = p.get("match_score") or 0
                if not img or score < 0.85:
                    continue
                candidate = to_full_res(img)
                if is_generic_placeholder(candidate):
                    print(f"    ⊘ skip {p.get('product_id','?')}: placeholder genérico")
                    continue
                if candidate in already_used:
                    print(f"    ⊘ skip {p.get('product_id','?')}: hero ya usado por otro tutorial")
                    continue
                hero_url = candidate
                print(f"    ↳ hero fallback (catálogo {p.get('product_id','?')}): {hero_url[:70]}")
                break

        if hero_url:
            print(f"    hero final: {hero_url[:80]}")
        else:
            print(f"    ⊘ hero limpiado (todo blocklist + sin linked_products score≥0.85)")

        # Pablo 30-may-2026 — GUARD DE INTEGRIDAD DEL CODIGO (hard-reject).
        # Routine C a veces destruye los bloques de codigo: angle brackets
        # vaciados (#include <WiFi.h> sin <...>), o el bloque entero como la
        # palabra "None" (stringificacion de un null del modelo). Persistir
        # eso es peor que no publicar: un tutorial con codigo que no compila
        # quema la credibilidad del sitio. Si hay corrupcion, NO publicamos:
        # rejected con razon clara + log RUIDOSO para que el monitor lo vea.
        code_problems = validate_code_blocks(tr.get("code_blocks"))
        if code_problems:
            stats["code_corrupt_blocked"] += 1
            reason = "code_corrupt:" + " | ".join(code_problems)[:180]
            print(f"  ✗✗ CODIGO CORRUPTO ({tid}): {tr.get('title_es','')[:50]}")
            for p in code_problems:
                print(f"        - {p}")
            try:
                db.execute(
                    "UPDATE tutorials SET status='rejected', "
                    "rejected_reason=?, updated_at=datetime('now') WHERE id=?",
                    [reason, tid],
                )
            except Exception as e:
                print(f"  ✗ no se pudo marcar rejected {tid}: {e}")
            continue

        # Pablo 30-may-2026 — GUARD DE CUERPO TRUNCADO (hard-reject).
        # El dump capa el input al modelo (SUBSTR) y, si corta mid-word, el
        # modelo traduce el fragmento incompleto y el body_es termina a media
        # palabra. No publicamos un tutorial cortado: rejected + log fuerte.
        if body_es_looks_truncated(tr.get("body_es") or ""):
            stats["body_truncated_blocked"] += 1
            tail = (tr.get("body_es") or "").rstrip()[-60:]
            print(f"  ✗✗ BODY TRUNCADO ({tid}): {tr.get('title_es','')[:50]}")
            print(f"        termina en: ...{tail!r}")
            try:
                db.execute(
                    "UPDATE tutorials SET status='rejected', "
                    "rejected_reason=?, updated_at=datetime('now') WHERE id=?",
                    ["body_truncated:body_es termina a media palabra", tid],
                )
            except Exception as e:
                print(f"  ✗ no se pudo marcar rejected {tid}: {e}")
            continue

        # Pablo 20-may-2026: aplicar checklist editorial. Si pasa < 3 de 5,
        # rejected con razón editorial (revisar manualmente).
        passed, checks = editorial_score(tr)
        # Pablo 20-may-2026: ahora son 6 checks. Threshold ≥4 para publicar
        # (era ≥3 de 5). Margen un poco más estricto pero alineado con la
        # filosofía editorial "sitio de referencia, no copia".
        total_checks = len(checks)
        if passed >= 4:
            target_status = "published"
            editorial_reason = None
            if passed == 4:
                stats["editorial_warning"] += 1
                print(f"  ⚠️ editorial ok-marginal ({passed}/{total_checks}): {tr.get('title_es','')[:50]}")
                print(f"      checks: {checks}")
        else:
            target_status = "rejected"
            failed = [k for k, v in checks.items() if not v]
            editorial_reason = f"editorial:passed_{passed}/{total_checks};failed:{','.join(failed)[:120]}"
            stats["editorial_blocked"] += 1
            print(f"  ✗ editorial BLOCKED ({passed}/{total_checks}): {tr.get('title_es','')[:50]}")
            print(f"      checks failed: {failed}")

        # Pablo 22-may-2026: PRESERVAR published_at original.
        # Si el tutorial YA tenía published_at (re-translate de algo ya
        # publicado), conservar la fecha original. Solo usar `now` si es
        # primera publicación (existing_published_at is NULL).
        # Sin esto, re-translates manuales movían tutoriales viejos al
        # tope de la home como "recientes" — comportamiento mentiroso.
        published_at_to_use = existing_published_at if existing_published_at else ts_sqlite
        if existing_published_at and target_status == "published":
            print(f"    ↻ preservando published_at original: {existing_published_at}")

        # Pablo 23-may-2026 fase 1.5 — rehospede inline images a R2 antes
        # de persistir. Procesa ![alt](url) en body_es y steps[].image_url.
        body_es_final = tr.get("body_es") or ""
        steps_final = tr.get("steps") or []

        # Pablo 30-may-2026 — SANEO DE GUIONES DE MARCA (regla estricta: la
        # marca NUNCA usa guion). Reemplaza em/en/minus por coma/punto/dos
        # puntos y normaliza Wi-Fi -> WiFi en title_es/subtitle_es/body_es.
        # Es CODE-FENCE-AWARE: jamas toca el contenido dentro de ```...```,
        # inline code (`...`) ni URLs. "a < b" en un fence queda intacto.
        # Se aplica ANTES del rehost (el rehost solo cambia URLs de imagenes,
        # que el sanitizer ya protege).
        title_es_final = tr.get("title_es")
        subtitle_es_final = tr.get("subtitle_es")
        if title_es_final:
            title_es_final, n = sanitize_brand_dashes(title_es_final)
            stats["brand_dashes_fixed"] += n
        if subtitle_es_final:
            subtitle_es_final, n = sanitize_brand_dashes(subtitle_es_final)
            stats["brand_dashes_fixed"] += n
        if body_es_final:
            body_es_final, n = sanitize_brand_dashes(body_es_final)
            stats["brand_dashes_fixed"] += n
            if n > 0:
                print(f"    ✓ guiones de marca saneados: {n}")

        if target_status == "published":
            # Pablo 30-may-2026 — GUARD DE MINIMO 3 IMAGENES (hard-reject).
            # Pablo: las fotos en un tutorial son criticas (referencia
            # Instructables). El prompt ya exige 3+ imagenes inline; este guard
            # lo vuelve un candado: si una nota llega a publicarse con menos de
            # 3 imagenes en el cuerpo, NO se publica. Queda 'rejected' y el
            # refetch/Routine C la reprocesa para insertar las que faltan desde
            # extra_images. El conteo es sobre body_es_final (mismo numero antes
            # y despues del rehost; rehost solo cambia las URLs).
            n_body_imgs = len(_MD_IMAGE_RE.findall(body_es_final or ""))
            if n_body_imgs < 3:
                stats.setdefault("few_images_blocked", 0)
                stats["few_images_blocked"] += 1
                print(
                    f"  ✗✗ POCAS IMAGENES ({tid}): {n_body_imgs} en el cuerpo "
                    f"(minimo 3): {tr.get('title_es','')[:50]}"
                )
                try:
                    db.execute(
                        "UPDATE tutorials SET status='rejected', "
                        "rejected_reason=?, updated_at=datetime('now') WHERE id=?",
                        [f"few_images:{n_body_imgs}<3", tid],
                    )
                except Exception as e:
                    print(f"  ✗ no se pudo marcar rejected {tid}: {e}")
                continue

            body_es_final, steps_final, n_rehosted = rehost_inline_images(
                body_es_final, steps_final, tid,
            )
            if n_rehosted > 0:
                print(f"    ✓ R2 rehost inline: {n_rehosted} imágenes")

            # Pablo 30-may-2026 — CHOKEPOINT OBLIGATORIO: espejar el HERO a R2.
            # Hasta ahora solo se espejaban las imágenes inline; el hero se
            # guardaba con su URL externa (hotlink-bloqueable por el navegador),
            # causando cards en blanco en /blog/tutoriales. Ahora todo hero que
            # se publica pasa por R2. Si falla, rehost_hero_to_r2 devuelve None
            # (fallo ruidoso) y la card usará el fallback de marca en vez de
            # conservar un externo roto.
            hero_url = rehost_hero_to_r2(hero_url, tid)

        try:
            db.execute(
                f"""UPDATE tutorials
                   SET status = '{target_status}',
                       rejected_reason = COALESCE(?, rejected_reason),
                       slug = COALESCE(?, slug),
                       title_es = ?,
                       subtitle_es = ?,
                       body_es = ?,
                       hero_image_url = COALESCE(?, hero_image_url),
                       materials_list_json = ?,
                       steps_json = ?,
                       code_blocks_json = ?,
                       linked_products_json = ?,
                       github_url = ?,
                       download_urls_json = ?,
                       category = ?,
                       difficulty = ?,
                       estimated_time_minutes = ?,
                       estimated_cost_clp = ?,
                       tags_json = ?,
                       translated_at = ?,
                       published_at = ?,
                       updated_at = datetime('now')
                   WHERE id = ?""",
                [
                    editorial_reason,
                    slug_to_use,
                    title_es_final,
                    subtitle_es_final,
                    body_es_final,
                    hero_url,
                    json.dumps(tr.get("materials_list") or [], ensure_ascii=False),
                    json.dumps(steps_final, ensure_ascii=False),
                    json.dumps(tr.get("code_blocks") or [], ensure_ascii=False),
                    json.dumps(tr.get("linked_products") or [], ensure_ascii=False),
                    tr.get("github_url"),
                    json.dumps(tr.get("download_urls") or [], ensure_ascii=False),
                    tr.get("category"),
                    tr.get("difficulty"),
                    tr.get("estimated_time_minutes"),
                    tr.get("estimated_cost_clp"),
                    json.dumps(tr.get("tags") or [], ensure_ascii=False),
                    ts_sqlite,                  # translated_at: siempre now
                    published_at_to_use,        # preserva si existía
                    tid,
                ],
            )
            if target_status == "published":
                stats["persisted_published"] += 1
                print(f"  ✓ {tr.get('title_es', '')[:60]}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  ✗ {tid}: {e}")

    db.commit()
    print(f"\n✓ Persisted translations: {stats}")


if __name__ == "__main__":
    main()
