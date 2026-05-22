#!/usr/bin/env python3
"""
Enriquece linked_products_json con:
  - wc_id (WooCommerce post_id numérico, scraped del HTML del producto)
  - image_url (thumb 100x100, del MCP buscar_productos o regex del HTML)

Pablo 22-may-2026: el blog guardaba product_id como SKU del dashboard
(GP3-6, F-444, X4-8...). Esos NO son los IDs numéricos que WC necesita
para ?add-to-cart=ID. Sin el WC post_id, el botón "Comprar todo" del
blog NUNCA agregaba productos al cart.

Solución: cada permalink del store renderiza HTML con
<input name="add-to-cart" value="649"> en el formulario .cart. Parseamos
con regex y guardamos el WC ID en cada linked_product, sin tocar el
schema de la DB (re-uso linked_products_json agregando keys).

Uso:
    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
    python3 enrich_linked_products.py [--dry-run] [--slug=<slug>]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from typing import Optional

import requests
import libsql

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def _conn():
    """Fresh libsql connection — usar 1 por tutorial para evitar stream timeout."""
    url = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://")
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    return libsql.connect(url, auth_token=token)

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)

# Pablo 22-may-2026: helper para convertir URL de imagen a thumbnail.
# WordPress genera sizes automáticos al uploadear: foto.jpg → foto-100x100.jpg
# en el mismo path. Las thumbs son ~10× más pequeñas (1-10KB vs 50-500KB),
# critical para performance del blog donde una página puede tener 20+ thumbs.
#
# El pattern es estándar de WP: /path/<name>-<W>x<H>.<ext>
# Ejemplos confirmados en mechatronicstore.cl:
#   .../arduino-uno-r3-atmega328p.jpg → .../arduino-uno-r3-atmega328p-100x100.jpg
#   .../resistencias.webp → .../resistencias-100x100.webp
# Si la versión cropeada no existe (raro pero posible con WebP recientes),
# el <img onError> del frontend hace fallback a la URL original.
_THUMB_EXT_RE = re.compile(r"\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$", re.IGNORECASE)
_THUMB_ALREADY_RE = re.compile(r"-\d+x\d+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$", re.IGNORECASE)


def to_thumb_url(url: str, size: int = 100) -> str:
    """Transforma image.jpg → image-100x100.jpg (formato WP standard)."""
    if not url or _THUMB_ALREADY_RE.search(url):
        return url
    m = _THUMB_EXT_RE.search(url)
    if not m:
        return url
    ext, query = m.group(1), m.group(2) or ""
    return _THUMB_EXT_RE.sub(f"-{size}x{size}.{ext}{query}", url, count=1)


# Regex para extraer WC post_id del HTML del producto.
# WooCommerce renderiza <input name="add-to-cart" value="649"> en .cart form.
WC_ID_RE = re.compile(r'name="add-to-cart"\s+value="(\d+)"')
# Fallback: data-product_id="649" (variations, etc.)
WC_ID_DATA_RE = re.compile(r'data-product_id="(\d+)"')
# OG image fallback si MCP no traía imagen
OG_IMAGE_RE = re.compile(r'<meta\s+property="og:image"\s+content="([^"]+)"')


def resolve_wc_id(permalink: str, timeout: int = 10) -> Optional[int]:
    """
    Fetch permalink + regex parse del input add-to-cart.

    Pablo 22-may-2026 FIX: si WP redirige a OTRO slug (porque el permalink
    original no existe), el wc_id parsed pertenece al producto del destino,
    NO al producto original. Detectar el mismatch comparando paths.
    Si mismatch → return None para que el UI muestre "no disponible" en
    vez de un link a producto WRONG.
    """
    try:
        clean_url = permalink.split("?")[0]  # quitar query params (utm, variants)
        resp = requests.get(
            clean_url,
            headers={"User-Agent": UA, "Accept-Language": "es-CL,es;q=0.9"},
            timeout=timeout,
            allow_redirects=True,
        )
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        print(f"    ✗ fetch failed: {e}")
        return None

    # Detectar redirect a otro slug → mismatch
    final_url = resp.url.split("?")[0].rstrip("/")
    original_url = clean_url.rstrip("/")
    if final_url != original_url:
        # WP redirigió. Si los slugs base difieren → producto distinto.
        original_slug = original_url.rsplit("/", 1)[-1]
        final_slug = final_url.rsplit("/", 1)[-1]
        if original_slug and final_slug and original_slug != final_slug:
            print(f"    ⊘ redirect mismatch: {original_slug} → {final_slug}")
            return None

    # 1) Try main add-to-cart input
    m = WC_ID_RE.search(html)
    if m:
        return int(m.group(1))
    # 2) Fallback to data-product_id
    m2 = WC_ID_DATA_RE.search(html)
    if m2:
        return int(m2.group(1))
    return None


def resolve_image(permalink: str, timeout: int = 10) -> Optional[str]:
    """Fetch og:image del producto como fallback de thumb."""
    try:
        clean_url = permalink.split("?")[0]
        resp = requests.get(
            clean_url,
            headers={"User-Agent": UA},
            timeout=timeout,
            allow_redirects=True,
        )
        resp.raise_for_status()
        m = OG_IMAGE_RE.search(resp.text)
        if m:
            return m.group(1)
    except Exception:
        pass
    return None


def enrich_tutorial(tid: str, slug: str, products_json: str, dry: bool) -> tuple[int, int, int]:
    """Devuelve (n_enriched_ids, n_enriched_imgs, n_already)."""
    try:
        products = json.loads(products_json or "[]")
    except json.JSONDecodeError:
        return 0, 0, 0
    if not isinstance(products, list) or not products:
        return 0, 0, 0

    enriched_id = 0
    enriched_img = 0
    already = 0
    changed = False

    for p in products:
        if not isinstance(p, dict):
            continue
        permalink = (p.get("product_url") or "").strip()
        if not permalink:
            continue

        # WC id resolve
        if not p.get("wc_id"):
            wc_id = resolve_wc_id(permalink)
            if wc_id:
                p["wc_id"] = wc_id
                enriched_id += 1
                changed = True
                print(f"    ✓ {p.get('product_id', '?')} → wc_id={wc_id}")
            time.sleep(0.4)  # rate-limit suave
        else:
            already += 1

        # Image resolve (only if no image_url yet)
        if not p.get("image_url"):
            img = resolve_image(permalink)
            if img:
                p["image_url"] = to_thumb_url(img, 100)
                enriched_img += 1
                changed = True
                print(f"      img: {p['image_url'][:80]}")
            time.sleep(0.4)

    if changed and not dry:
        # Reconexión fresca por tutorial — libsql stream se cae después de
        # varios minutos de scrapeo (uno produce 10+ HTTP fetches).
        c = _conn()
        c.execute(
            "UPDATE tutorials SET linked_products_json = ?, updated_at = datetime('now') WHERE id = ?",
            [json.dumps(products, ensure_ascii=False), tid],
        )
        c.commit()

    return enriched_id, enriched_img, already


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", help="Solo enriquecer un slug específico")
    parser.add_argument("--limit", type=int, default=200)
    args = parser.parse_args()

    where_extra = ""
    if args.slug:
        where_extra = f"AND slug = '{args.slug}'"

    c = _conn()
    rows = c.execute(
        f"""
        SELECT id, slug, linked_products_json
        FROM tutorials
        WHERE status='published'
          AND linked_products_json IS NOT NULL
          AND linked_products_json != '[]'
          {where_extra}
        ORDER BY published_at DESC
        LIMIT ?
        """,
        [args.limit],
    ).fetchall()

    print(f"Tutoriales target: {len(rows)}")
    if args.dry_run:
        print("DRY RUN — no se escribe a DB\n")
    total_ids = 0
    total_imgs = 0
    total_already = 0

    for r in rows:
        tid, slug, products = r
        print(f"→ {slug[:60]}")
        n_id, n_img, n_already = enrich_tutorial(tid, slug, products, args.dry_run)
        total_ids += n_id
        total_imgs += n_img
        total_already += n_already

    print(
        f"\n{total_ids} WC IDs nuevos · {total_imgs} imágenes nuevas · "
        f"{total_already} ya enriquecidos."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
