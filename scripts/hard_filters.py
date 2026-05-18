"""
Hard filters pre-LLM para drafts de tutoriales.

Spec sec 3.2: cualquier candidate que falle CUALQUIERA de estos filtros
se rechaza sin gastar Opus. Eficiencia esperada: ~70% se rechazan acá.
"""
import re

_RE_CODE_BLOCK = re.compile(r"```\w*\n.*?```", re.DOTALL)
_RE_INLINE_CODE = re.compile(r"<code[^>]*>.*?</code>|`[^`]+`", re.DOTALL)
_RE_CODE_LANG_HINT = re.compile(
    r"\b(import\s+\w+|#include\s*<|void\s+\w+\s*\(|def\s+\w+\s*\(|"
    r"function\s+\w+\s*\(|class\s+\w+|public\s+class|Serial\.begin|"
    r"pinMode|digitalWrite|analogRead)\b"
)

_RE_STEP_NUMERIC = re.compile(r"^\s*(\d+)[\.\)]\s+", re.MULTILINE)
_RE_STEP_HEADER = re.compile(r"^#+\s*(?:step\s+\d+|paso\s+\d+|\d+[\.\):])",
                              re.IGNORECASE | re.MULTILINE)
_RE_STEP_BOLD = re.compile(r"\*\*step\s+\d+", re.IGNORECASE)
# HTML-aware patterns (cuando body es HTML, no markdown)
_RE_STEP_HTML_HEADER = re.compile(
    r"<h[1-6][^>]*>[^<]*(?:step\s+\d+|paso\s+\d+|\d+\s*[\.\):])",
    re.IGNORECASE,
)
_RE_PRE_CODE = re.compile(r"<pre\b[^>]*>", re.IGNORECASE)

_RE_IMG_MD = re.compile(r"!\[[^\]]*\]\([^)]+\)")
_RE_IMG_HTML = re.compile(r"<img\b[^>]*>", re.IGNORECASE)

_RE_MATERIALS_KEYWORDS = re.compile(
    r"\b("
    r"materials?|"
    r"components?|"
    r"parts?\s+(?:list|required|needed)|"  # acepta "Parts List" + "Parts Required" + "Parts Needed"
    r"hardware\s+(?:list|required|needed)|"  # "Hardware Required"
    r"prerequisites?|"  # "Prerequisites"
    r"requirements?|"  # "Requirements"
    r"bill\s+of\s+materials|"
    r"bom|"
    r"what\s+you\'?ll\s+need|"
    r"what\s+you\s+need|"
    r"necesit[áa]s|necesitar[áa]s|"
    r"lista\s+de\s+materiales|"
    r"componentes?\s+necesarios|"
    r"herramientas"
    r")\b\s*:?",
    re.IGNORECASE,
)


def has_code(body: str) -> bool:
    """¿El body tiene algún bloque de código o señal de código? Detecta MD y HTML."""
    if not body:
        return False
    if _RE_CODE_BLOCK.search(body):
        return True
    if _RE_INLINE_CODE.search(body):
        return True
    if _RE_PRE_CODE.search(body):
        return True
    if _RE_CODE_LANG_HINT.search(body):
        return True
    return False


def count_steps(body: str) -> int:
    """Cuenta cuántos pasos identificables hay (MD + HTML headers + numeric list)."""
    if not body:
        return 0
    numeric_steps = len(set(int(m.group(1)) for m in _RE_STEP_NUMERIC.finditer(body)))
    header_steps = len(_RE_STEP_HEADER.findall(body))
    bold_steps = len(_RE_STEP_BOLD.findall(body))
    html_header_steps = len(_RE_STEP_HTML_HEADER.findall(body))
    # Conteo H2/H3 total como proxy de pasos (cualquier tutorial estructurado los tiene)
    all_h2_h3 = len(re.findall(r"<h[23]\b[^>]*>", body, re.IGNORECASE))
    return max(numeric_steps, header_steps, bold_steps, html_header_steps, all_h2_h3)


def count_images(body: str) -> int:
    """Imágenes embebidas (markdown + HTML)."""
    if not body:
        return 0
    md = len(_RE_IMG_MD.findall(body))
    html = len(_RE_IMG_HTML.findall(body))
    return md + html


def word_count(body: str) -> int:
    """Palabras útiles — STRIP de code blocks y imágenes antes de contar."""
    if not body:
        return 0
    clean = _RE_CODE_BLOCK.sub("", body)
    clean = _RE_INLINE_CODE.sub("", clean)
    clean = _RE_IMG_MD.sub("", clean)
    clean = _RE_IMG_HTML.sub("", clean)
    clean = re.sub(r"^#+\s+", "", clean, flags=re.MULTILINE)
    clean = re.sub(r"\*+", "", clean)
    return len(clean.split())


def has_materials_list(body: str) -> bool:
    """¿Hay una sección identificable de 'materiales / components / necesitás'?"""
    if not body:
        return False
    return bool(_RE_MATERIALS_KEYWORDS.search(body))


def matches_excluded_keyword(body: str, excluded: list[str]) -> str | None:
    """Si alguna keyword del body matchea, devuelve la keyword. None si no."""
    if not body or not excluded:
        return None
    body_lower = body.lower()
    for kw in excluded:
        kw_lc = kw.lower().strip()
        if not kw_lc:
            continue
        if kw_lc in body_lower:
            return kw
    return None


def apply_all(
    body: str,
    excluded_keywords: list[str] | None = None,
    min_steps: int = 3,
    min_images: int = 3,
    min_words: int = 800,
    code_required_unless_steps: int = 5,
) -> dict:
    """Aplica los hard filters. Devuelve resumen.

    Pablo 17-may-2026 (post-Week 8): los filtros estaban demasiado
    estrictos — 46 rejected / 1 published. Tutoriales válidos como
    "soldadura SMD", "calibración impresora 3D", "montaje mecánico"
    fueron rechazados por no tener bloques de código, aunque tenían
    materiales claros + pasos + imágenes.

    Reglas relajadas:
    - `min_steps` 5→3 (acepta tutoriales más cortos)
    - `has_code` ya NO es bloqueante absoluto: solo rechaza si TAMBIÉN
       tiene <`code_required_unless_steps` (default 5) pasos. Un tutorial
       extenso (5+ steps) sin código sigue siendo válido si tiene
       materiales + imágenes + palabras suficientes.

    Si después de relajar entran demasiados spam, subir thresholds:
       apply_all(body, min_steps=5, code_required_unless_steps=99)
       restaura el comportamiento original estricto.
    """
    excluded_keywords = excluded_keywords or []
    reasons: list[str] = []
    stats = {
        "has_code": has_code(body),
        "steps": count_steps(body),
        "images": count_images(body),
        "words": word_count(body),
        "has_materials": has_materials_list(body),
    }

    # Code-or-many-steps: rechaza solo si NO hay código Y los steps son pocos.
    # Tutoriales largos sin código (soldadura, calibración, montaje) → permitir.
    if not stats["has_code"] and stats["steps"] < code_required_unless_steps:
        reasons.append(
            f"no_code_and_steps_below_{code_required_unless_steps}"
        )

    if stats["steps"] < min_steps:
        reasons.append(f"steps_below_{min_steps}")
    if stats["images"] < min_images:
        reasons.append(f"images_below_{min_images}")
    if stats["words"] < min_words:
        reasons.append(f"words_below_{min_words}")
    if not stats["has_materials"]:
        reasons.append("no_materials_list")

    matched_kw = matches_excluded_keyword(body, excluded_keywords)
    if matched_kw:
        reasons.append(f"excluded_keyword:{matched_kw[:40]}")

    return {
        "passed": len(reasons) == 0,
        "reasons": reasons,
        "stats": stats,
    }
