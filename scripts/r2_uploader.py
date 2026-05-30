"""
Cloudflare R2 upload helper para hero images del blog MechatronicStore.

Pablo 21-may-2026: tras audits Playwright que detectaron repetidamente imgs
broken por hotlink-protection (studiopieters.nl, tronixstuff.com — devolvían
200 a curl pero 0×0 al browser), aplicamos la opción 3 sistémica: descargar
img server-side y subirla a R2 bucket compartido con MechaNoticias
(`mechanoticias-images` → public host `https://images.mechatronicstore.cl`).

Diferencia vs el `scripts/r2.py` de MechaNoticias:
  - Keys bajo `tutorials/<tutorial_id>/` en vez de `articles/`
  - El resto (optimización WebP, idempotencia sha1, content-type guess) es
    idéntico — código casi line-by-line port para mantener el comportamiento.

Activación:
  - Local: usa CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID de .env.local
  - CI/Routines: requiere agregar esos secrets al repo en GH Settings.
    Hasta que estén, el `ingest_blog.py` salta el rehost si los creds no
    están seteados, dejando la URL externa (con blocklist + fallback de
    hero_picker como red de seguridad).
"""

from __future__ import annotations

import hashlib
import io
import logging
import os
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
except ImportError:
    pass

log = logging.getLogger(__name__)


CF_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID") or ""
# Pablo 21-may-2026: token DEDICADO R2 Edit. Si está, lo usamos. Sino
# fallback al token general (que puede no tener R2 Edit, en cuyo caso
# los PUT van a fallar 403 — ese es el caso que motivó el split).
CF_API_TOKEN = (
    os.environ.get("CLOUDFLARE_API_TOKEN_R2")
    or os.environ.get("CLOUDFLARE_API_TOKEN")
    or ""
)
R2_BUCKET = os.environ.get("R2_BUCKET", "mechanoticias-images")
R2_PUBLIC_HOST = os.environ.get(
    "R2_PUBLIC_HOST", "https://images.mechatronicstore.cl"
).rstrip("/")

# Límites de tamaño antes de subir (mantener bill predecible bajo free tier)
MAX_WIDTH = 1600
MAX_BYTES = 1_500_000  # ~1.5 MB

MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
}

# UA realista: muchos dominios bloqueean UA con "bot"/"crawler"/no UA
DOWNLOAD_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)


def is_configured() -> bool:
    return bool(CF_ACCOUNT_ID and CF_API_TOKEN)


def _headers() -> dict:
    return {"Authorization": f"Bearer {CF_API_TOKEN}"}


def _api_base() -> str:
    if not CF_ACCOUNT_ID:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID not set")
    return (
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}"
        f"/r2/buckets/{R2_BUCKET}"
    )


def _object_exists(key: str) -> bool:
    r = requests.head(f"{_api_base()}/objects/{key}", headers=_headers(), timeout=10)
    return r.status_code == 200


def _public_url(key: str) -> str:
    return f"{R2_PUBLIC_HOST}/{key}"


def is_already_rehosted(url: str) -> bool:
    """True si la URL ya está sirviendo desde nuestro CDN R2."""
    if not url:
        return False
    return urlparse(url).hostname == urlparse(R2_PUBLIC_HOST).hostname


def _source_referer(url: str) -> str:
    """
    Pablo 30-may-2026: deriva un Referer del ORIGEN del source (scheme+host)
    para vencer hotlink protection al momento de descargar. Varios CMS
    (WordPress + plugins anti hotlink, WAFs) sirven la imagen solo cuando el
    Referer apunta a su propio dominio. Mandar el origen del source como
    Referer imita una carga desde la misma página de origen.
    """
    try:
        p = urlparse(url)
        if p.scheme and p.netloc:
            return f"{p.scheme}://{p.netloc}/"
    except Exception:
        pass
    return ""


def _guess_ext(url: str, content_type: str | None) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in MIME_TO_EXT:
        return MIME_TO_EXT[ct]
    path = urlparse(url).path.lower()
    for ext in ("jpg", "jpeg", "png", "webp", "avif", "gif"):
        if path.endswith("." + ext):
            return "jpg" if ext == "jpeg" else ext
    return "jpg"


def _optimize(raw: bytes, content_type: str) -> tuple[bytes, str]:
    """Re-encode oversized a WebP, downscale a MAX_WIDTH. Idempotente."""
    if Image is None:
        return raw, content_type
    if len(raw) <= MAX_BYTES and "webp" in content_type:
        return raw, content_type
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_h = int(img.height * ratio)
            img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        if has_alpha:
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            img.save(buf, format="WEBP", quality=82, method=6, lossless=False)
        else:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(buf, format="WEBP", quality=82, method=6)
        optimized = buf.getvalue()
        if len(optimized) < len(raw):
            return optimized, "image/webp"
        return raw, content_type
    except Exception as e:
        log.warning("PIL optimize failed: %s — uploading original bytes", e)
        return raw, content_type


def upload_bytes(key: str, data: bytes, content_type: str) -> str:
    """PUT a R2. Devuelve la URL pública."""
    url = f"{_api_base()}/objects/{key}"
    r = requests.put(
        url,
        headers={**_headers(), "Content-Type": content_type},
        data=data,
        timeout=30,
    )
    r.raise_for_status()
    j = r.json()
    if not j.get("success"):
        raise RuntimeError(f"R2 upload failed: {j}")
    return _public_url(key)


def _download_image(source_url: str, timeout: int) -> tuple[bytes, str]:
    """
    Descarga la imagen del source con UA de navegador + Referer del origen
    (vence la mayoría del hotlink protection). Lanza RuntimeError con causa
    legible si falla la descarga o el content-type no es image/*.

    Pablo 30-may-2026: extraído de rehost_hero para compartirlo entre el
    modo tolerante (devuelve None) y el modo estricto (lanza excepción).
    """
    headers = {"User-Agent": DOWNLOAD_UA, "Accept": "image/*,*/*;q=0.8"}
    referer = _source_referer(source_url)
    if referer:
        headers["Referer"] = referer
    resp = requests.get(
        source_url,
        timeout=timeout,
        headers=headers,
        stream=False,
        allow_redirects=True,
    )
    resp.raise_for_status()
    raw = resp.content
    ct = resp.headers.get("content-type", "image/jpeg")
    if not raw:
        raise RuntimeError(f"respuesta vacía desde {source_url}")
    if not ct.split(";")[0].strip().startswith("image/"):
        raise RuntimeError(f"content-type no-imagen {ct!r} en {source_url}")
    return raw, ct


def _upload_image(source_url: str, tutorial_id: str, raw: bytes, ct: str) -> str:
    """Optimiza a WebP e sube a R2 bajo articles/blog/<tid>/<sha>.<ext>."""
    optimized, out_ct = _optimize(raw, ct)
    ext = MIME_TO_EXT.get(out_ct, _guess_ext(source_url, out_ct))
    digest = hashlib.sha1(optimized).hexdigest()[:16]
    # Pablo 21-may-2026: el token CF está scoped a prefix `articles/*`.
    # Usamos `articles/blog/<tid>/...` para reusar el token + bucket de
    # MechaNoticias sin colisionar con sus keys (que viven bajo
    # `articles/<article_id>/` directo, no `articles/blog/`).
    key = f"articles/blog/{tutorial_id}/{digest}.{ext}"
    if _object_exists(key):
        return _public_url(key)
    return upload_bytes(key, optimized, out_ct)


def rehost_hero(
    source_url: str,
    tutorial_id: str,
    timeout: int = 15,
) -> Optional[str]:
    """
    Descarga img desde source_url (con UA realista + Referer del origen que
    pasa la mayoría de hotlink-checks), optimiza WebP, sube a R2 bajo
    articles/blog/<tid>/<sha>.<ext>.

    Idempotente: re-llamar con misma img devuelve la misma URL R2 sin re-subir.

    Devuelve URL pública R2 o None si:
      - Creds no configurados (mensaje WARN)
      - Source URL responde 403/404/timeout
      - Content-type no es image/*

    Tolerante a fallos (devuelve None). Para el chokepoint obligatorio del
    persist usar rehost_hero_strict (que lanza excepción).
    """
    if not source_url:
        return None
    if not is_configured():
        log.warning("R2 creds missing; skipping rehost of %s", source_url)
        return None
    if is_already_rehosted(source_url):
        # Ya está en nuestro CDN — no re-subir
        return source_url

    try:
        raw, ct = _download_image(source_url, timeout)
    except Exception as e:
        log.warning("download failed for %s: %s", source_url, e)
        return None

    try:
        return _upload_image(source_url, tutorial_id, raw, ct)
    except Exception as e:
        log.warning("R2 upload failed for %s: %s", source_url, e)
        return None


def rehost_hero_strict(
    source_url: str,
    tutorial_id: str,
    timeout: int = 15,
) -> str:
    """
    Igual que rehost_hero pero ESTRICTO: en vez de devolver None ante un
    fallo, lanza RuntimeError con la causa. Pensado para el chokepoint
    obligatorio del persist (Pablo 30-may-2026): si el hero no se puede
    espejar a R2, queremos un fallo RUIDOSO, NO conservar silenciosamente
    la URL externa hotlink-bloqueada.

    Si la URL ya está en nuestro CDN R2, la devuelve tal cual (no re-sube).
    """
    if not source_url:
        raise RuntimeError("source_url vacío")
    if not is_configured():
        raise RuntimeError(
            "R2 creds ausentes (CLOUDFLARE_API_TOKEN_R2 + CLOUDFLARE_ACCOUNT_ID)"
        )
    if is_already_rehosted(source_url):
        return source_url
    raw, ct = _download_image(source_url, timeout)
    return _upload_image(source_url, tutorial_id, raw, ct)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"Configured: {is_configured()}")
    print(f"Bucket: {R2_BUCKET}")
    print(f"Public host: {R2_PUBLIC_HOST}")
    # Smoke test
    test = "https://www.anthropic.com/favicon.ico"
    hosted = rehost_hero(test, tutorial_id="smoke_test")
    print(f"source: {test}")
    print(f"hosted: {hosted}")
    if hosted:
        check = requests.head(hosted, timeout=10)
        print(f"verified: {check.status_code} {check.headers.get('content-type')}")
