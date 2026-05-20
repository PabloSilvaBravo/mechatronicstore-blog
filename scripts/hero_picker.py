"""
hero_picker — seleccionar el mejor hero_image_url evitando dominios con
hotlink-protection o WAF que devuelven 200 a curl pero 0×0 al browser.

Pablo 20-may-2026: tras el primer run del workflow blog-visual-audit
(Playwright headless) que detectó 4 imgs broken in-browser (2 de
studiopieters.nl + 2 de tronixstuff.com), agregamos blocklist de dominios
conocidos. Cuando el og:image es de un dominio bloqueado, fallback a
la primera img no-bloqueada del body (extras).

Opción 3 sistémica (proxy R2) en roadmap — bajaría a 0 el riesgo de
hotlink para CUALQUIER source.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional
from urllib.parse import urlparse


# Dominios que aplican hotlink-block / Cloudflare WAF severo y que confirmamos
# devuelven 0×0 (o 403) en navegador aún con referrerPolicy=no-referrer.
# Cuando ampliamos, mantener orden alfabético + comentario con fecha + audit ID.
HERO_BLOCKLIST_DOMAINS = {
    "studiopieters.nl",   # 20-may-2026 audit Playwright run #26193387806
    "tronixstuff.com",    # 20-may-2026 audit Playwright run #26193387806
}

# Hosts conocidos que sirven SOLO tracking/analytics, nunca contenido real
TRACKER_DOMAINS = {
    "pixel.wp.com",
    "stats.wp.com",
    "www.google-analytics.com",
    "ssl.google-analytics.com",
    "www.googletagmanager.com",
    "stats.g.doubleclick.net",
    "ad.doubleclick.net",
    "www.facebook.com",  # facebook pixel /tr/
}

# Patrones de filename que delatan logos, iconos, badges, sprites
_NOISE_FILENAME_RE = re.compile(
    r"(?:^|[/_-])(logo|icon|favicon|sprite|badge|avatar|gravatar|emoji|spinner|loader|placeholder)(?:[._-]|$)",
    re.IGNORECASE,
)

# Patrones que delatan dimensiones chicas en el filename: -100x50, _32x32
_SMALL_DIMS_RE = re.compile(r"-(\d{1,3})x(\d{1,3})(?:\.[a-z]{2,5})?$", re.IGNORECASE)


def _domain_blocked(url: str) -> bool:
    if not url:
        return False
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return False
    host = host.lower()
    if host.startswith("www."):
        host = host[4:]
    return host in HERO_BLOCKLIST_DOMAINS


def _looks_useful(url: str) -> bool:
    """
    True si la URL parece una img de contenido real (no tracker, no logo, no
    icono chico). Heurística por URL — no descarga la img.
    """
    if not url:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host_short = host[4:]
    else:
        host_short = host
    if host in TRACKER_DOMAINS or host_short in TRACKER_DOMAINS:
        return False
    path = parsed.path.lower()
    # Tracker pixel típico: /b.gif, /pixel.gif, /1x1.gif
    if re.search(r"/(b|pixel|track|beacon|1x1)\.(gif|png|webp)(?:$|\?)", path):
        return False
    # Extensiones que no son raster (svg sí puede ser válida, pero raramente
    # como hero — la dejamos pasar de todas formas)
    if not re.search(r"\.(jpg|jpeg|png|webp|gif|svg|avif)(?:$|\?)", path):
        return False
    # Filename ruido
    if _NOISE_FILENAME_RE.search(path):
        return False
    # Dimensiones chicas en filename
    m = _SMALL_DIMS_RE.search(path)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
        if max(w, h) < 400:
            return False
    return True


def select_best_hero(
    main_image_url: Optional[str],
    extra_images: Optional[Iterable[str]] = None,
) -> Optional[str]:
    """
    Devuelve la mejor URL hero o None si todo está bloqueado / no hay imgs.

    Estrategia:
    1. Si main_image_url no está bloqueado y parece útil → usar esa (el
       og:image suele ser el hero "intencional" del autor).
    2. Si está bloqueado → primera img de extra_images que no esté bloqueada
       Y que pase el filtro _looks_useful (skip trackers, logos, dimensiones
       chicas).
    3. Si todo descartado → None (el card del blog usa placeholder, igual de
       feo pero al menos no rompe el layout).

    No hacemos HEAD request acá (sería O(N) HTTP por ingest) — eso lo cubre
    monitor_pipeline.py métrica 7 post-publish.
    """
    if main_image_url and not _domain_blocked(main_image_url) and _looks_useful(main_image_url):
        return main_image_url

    if extra_images:
        for u in extra_images:
            if u and not _domain_blocked(u) and _looks_useful(u):
                return u

    return None


if __name__ == "__main__":
    # Smoke test inline
    cases = [
        # Caso normal
        ("https://example.com/foo.jpg", [], "https://example.com/foo.jpg"),
        # og:image bloqueado, extras útil
        ("https://www.studiopieters.nl/foo.png", ["https://imgur.com/bar.jpg"], "https://imgur.com/bar.jpg"),
        # Todo bloqueado
        ("https://tronixstuff.com/foo.webp", [], None),
        # Solo extras
        (None, ["https://hackster.imgix.net/a.png"], "https://hackster.imgix.net/a.png"),
        # og:image vacío, primera extras blocked, segunda OK
        ("", ["https://www.studiopieters.nl/x.png", "https://i.imgur.com/y.png"], "https://i.imgur.com/y.png"),
        # Tracking pixel descartado
        ("https://pixel.wp.com/b.gif?v=noscript", ["https://i.imgur.com/real.jpg"], "https://i.imgur.com/real.jpg"),
        # Logo chico descartado
        (None, ["http://achimpieters.com/wp-content/uploads/Logo_X-300x49.webp", "https://cdn.com/hero.jpg"], "https://cdn.com/hero.jpg"),
        # Solo trackers/logos
        (None, ["https://pixel.wp.com/b.gif", "https://stats.wp.com/x.png"], None),
        # Favicon descartado
        ("https://example.com/favicon.ico", ["https://example.com/hero-large.jpg"], "https://example.com/hero-large.jpg"),
    ]
    failed = 0
    for main, extras, expected in cases:
        got = select_best_hero(main, extras)
        ok = got == expected
        mark = "✓" if ok else "✗"
        if not ok:
            failed += 1
        print(f"{mark} main={main!r} extras={extras!r} → {got!r} (expected {expected!r})")
    if failed:
        print(f"\n{failed} cases failed")
        import sys
        sys.exit(1)
    print("\nAll cases passed")
