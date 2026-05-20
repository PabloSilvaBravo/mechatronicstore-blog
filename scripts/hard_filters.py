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
    """Cuenta cuántos pasos identificables hay (MD + HTML headers + numeric list + ol/li)."""
    if not body:
        return 0
    numeric_steps = len(set(int(m.group(1)) for m in _RE_STEP_NUMERIC.finditer(body)))
    header_steps = len(_RE_STEP_HEADER.findall(body))
    bold_steps = len(_RE_STEP_BOLD.findall(body))
    html_header_steps = len(_RE_STEP_HTML_HEADER.findall(body))
    # Conteo H2/H3 total como proxy de pasos (cualquier tutorial estructurado los tiene)
    all_h2_h3 = len(re.findall(r"<h[23]\b[^>]*>", body, re.IGNORECASE))
    # Pablo 19-may-2026: agregar <li> dentro de <ol> (ordered list HTML).
    # Adafruit/Make-Magazine usan ol/li sin headers numerados. Antes contaba
    # 0 pasos en tutoriales con 6-10 <li> válidos.
    ol_li_steps = 0
    for ol_match in re.finditer(r"<ol\b[^>]*>(.*?)</ol>", body, re.IGNORECASE | re.DOTALL):
        ol_li_steps = max(
            ol_li_steps,
            len(re.findall(r"<li\b", ol_match.group(1), re.IGNORECASE)),
        )
    return max(
        numeric_steps, header_steps, bold_steps,
        html_header_steps, all_h2_h3, ol_li_steps,
    )


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


# Pablo 20-may-2026 editorial overhaul: detectar downloadables concretos
# para premiar valor añadido. Tutoriales con GitHub repo + STL + library
# generan confianza editorial y son MENOS plagiables (downloads son
# trazables al original, lo que nos protege legal y técnicamente).

_RE_GITHUB = re.compile(r"github\.com/[\w-]+/[\w-]+", re.IGNORECASE)
_RE_STL = re.compile(r"\.stl\b|thingiverse\.com|printables\.com|prusaprinters\.org",
                     re.IGNORECASE)
_RE_CODE_DL = re.compile(r"\.ino\b|\.cpp\b|\.py\b|/sketch\b|\.h\b\s+download",
                          re.IGNORECASE)
_RE_PCB = re.compile(r"\.kicad|gerber|\.zip[^\"<]*pcb|easyeda\.com|jlcpcb\.com",
                      re.IGNORECASE)
_RE_LIBRARY = re.compile(
    r"arduino-libraries/|adafruit-circuitpython|platformio\.org/lib|"
    r"pip\s+install\s+\w|library\.json|library\.properties",
    re.IGNORECASE,
)
_RE_PDF_SCHEMA = re.compile(
    r"\.pdf[\"\s]*[^>]*(schema|schematic|datasheet|wiring|circuit)",
    re.IGNORECASE,
)


def detect_downloadables(body: str) -> dict:
    """Detecta links a archivos descargables que dan valor concreto al
    lector. Devuelve dict con contadores. Total >= 1 = tutorial decente,
    >= 3 = excelente.

    Pablo 20-may-2026: criterio editorial — un tutorial sin nada que
    descargar es solo texto. Con GitHub + STL + library, el lector se
    va con algo tangible.
    """
    if not body:
        return {
            "github_repos": 0, "stl_files": 0, "code_files": 0,
            "pcb_files": 0, "libraries": 0, "pdf_schemas": 0,
            "total_distinct": 0,
        }
    return {
        "github_repos": len(set(_RE_GITHUB.findall(body))),
        "stl_files": 1 if _RE_STL.search(body) else 0,
        "code_files": 1 if _RE_CODE_DL.search(body) else 0,
        "pcb_files": 1 if _RE_PCB.search(body) else 0,
        "libraries": 1 if _RE_LIBRARY.search(body) else 0,
        "pdf_schemas": 1 if _RE_PDF_SCHEMA.search(body) else 0,
        "total_distinct": sum([
            min(len(set(_RE_GITHUB.findall(body))), 3),  # cap GitHub a 3
            1 if _RE_STL.search(body) else 0,
            1 if _RE_CODE_DL.search(body) else 0,
            1 if _RE_PCB.search(body) else 0,
            1 if _RE_LIBRARY.search(body) else 0,
            1 if _RE_PDF_SCHEMA.search(body) else 0,
        ]),
    }


def detect_language(body: str, sample_chars: int = 2000) -> str:
    """Heurística para detectar idioma del body. Devuelve uno de:
    'es', 'en', 'de', 'fr', 'pt', 'it', 'other'.

    Pablo 20-may-2026 v2: heurística mejorada — sample 2000 chars (era 500),
    threshold mínimo 2 markers (era 3), markers expandidos especialmente EN
    (palabras frecuentes en títulos cortos), bonus por características
    ortográficas (ñ/acentos español, ß/umlaut alemán, accents franceses).
    """
    if not body:
        return "other"
    sample = body[:sample_chars].lower()
    # Quitar HTML tags básico para no confundir palabras técnicas
    sample = re.sub(r"<[^>]+>", " ", sample)
    sample = re.sub(r"[^\w\sáéíóúñçàèìòùâêîôûäöüßãõ\-]", " ", sample)
    words = set(sample.split())

    # Keywords markers por idioma (expandidos — palabras de alta frecuencia)
    markers = {
        "es": {
            # function words
            "el", "la", "que", "para", "con", "este", "esta", "como", "una", "un",
            "los", "las", "más", "pero", "sin", "sobre", "entre", "todo",
            "donde", "cuando", "porque", "aunque", "mientras",
            # pronouns/verbs
            "puedes", "tienes", "vamos", "necesitas", "después", "antes", "ahora",
            "hacer", "tener", "ser", "estar", "decir", "usar", "puede",
            # technical context ES
            "tutorial", "código", "proyecto", "paso", "guía", "ejemplo",
        },
        "en": {
            # function words (high freq)
            "the", "and", "you", "for", "with", "this", "that", "how", "from",
            "your", "have", "make", "into", "what", "all", "but", "not", "are",
            "was", "were", "been", "they", "their", "will", "would", "should",
            # technical
            "tutorial", "step", "code", "use", "using", "need", "build", "setup",
            "guide", "example", "project", "create", "connect", "install",
            # very common short
            "to", "of", "in", "on", "is", "it", "be", "as", "or", "if",
        },
        "de": {
            "der", "die", "das", "und", "ist", "den", "mit", "für", "ein", "eine",
            "auf", "wir", "sie", "wird", "auch", "ihre", "nicht", "wenn", "dann",
            "kann", "schritt", "anleitung", "projekt", "verwenden", "müssen",
            "haben", "sind", "werden", "über",
        },
        "fr": {
            "le", "la", "les", "des", "pour", "avec", "vous", "cette", "comment",
            "code", "tutoriel", "étape", "votre", "est", "dans", "sur", "que",
            "pas", "nous", "ils", "elles", "tout", "leur", "guide", "projet",
            "exemple", "créer", "utiliser",
        },
        "pt": {
            "para", "com", "este", "esta", "como", "uma", "um", "que", "você",
            "não", "mas", "pelo", "pela", "isso", "tutorial", "código", "passo",
            "exemplo", "projeto", "guia", "fazer", "ter", "ser", "estar",
        },
        "it": {
            "per", "con", "questo", "questa", "come", "una", "uno", "che", "tu",
            "non", "ma", "del", "della", "tutorial", "codice", "passo", "primo",
            "esempio", "progetto", "guida", "fare", "essere", "avere",
        },
    }
    counts = {lang: len(words & kw) for lang, kw in markers.items()}

    # Bonus ortográficos por idioma
    if any(c in sample for c in "áéíóúñ"):
        counts["es"] += 5
    if "ß" in sample or any(c in sample for c in "äöü"):
        counts["de"] += 3
    if any(c in sample for c in "àèìòùâêîôûœ"):
        counts["fr"] += 3
    if any(c in sample for c in "ãõçà") and "you" not in words:
        counts["pt"] += 3

    best_lang = max(counts, key=counts.get)
    # Threshold mínimo 2 markers (antes 3) — pero requiere margen sobre el
    # segundo idioma para confianza
    second_best = sorted(counts.values(), reverse=True)[1] if len(counts) > 1 else 0
    if counts[best_lang] < 2:
        return "other"
    # Si el mejor tiene poco margen sobre el segundo Y es <4, dudoso → other
    if counts[best_lang] < 4 and (counts[best_lang] - second_best) < 2:
        # Caso típico: título corto inglés tipo "ESP32 Pro Tip" — pocos markers EN.
        # Si solo EN tiene match y los otros 0, igualmente devolver EN.
        if best_lang == "en" and second_best == 0:
            return "en"
        return "other"
    return best_lang


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
    min_images: int = 2,
    min_words: int = 600,
    code_required_unless_steps: int = 4,
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
