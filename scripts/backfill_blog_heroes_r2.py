#!/usr/bin/env python3
"""
Backfill de hero_image_url externos a R2 — fix definitivo de cards en blanco.

Pablo 30-may-2026. Contexto del bug:
  En /blog/tutoriales varias cards salían con un recuadro gris vacío en vez
  del hero. De los tutoriales publicados, ~25 ya tenían su hero en el CDN
  R2 (https://images.mechatronicstore.cl/...) y cargaban bien, pero 14 aún
  apuntaban a hosts EXTERNOS (electroniclinic.com, pimylifeup.com,
  components101.com, mechatronicstore.cl). Esos hosts responden 200 a una
  descarga server-side pero hotlink-bloquean al NAVEGADOR (chequeo de
  Referer / Sec-Fetch-Site), así que el <img> queda 0x0 y la card en blanco.

Root cause: el persist (persist_blog_translation.py) aplicaba select_best_hero
(que solo FILTRA dominios en blocklist) pero NUNCA espejaba el hero a R2. El
espejo de hero solo existía en el script manual backfill_heros_to_r2.py.

Este script:
  1. Re-consulta el set AUTORITATIVO de externos (no confía en una lista
     hardcodeada): published, hero NOT NULL/empty, hero NOT LIKE el CDN R2
     ni *.r2.dev.
  2. Para cada uno descarga con UA de navegador + Referer del origen del
     source (vence hotlink al momento de fetch) y sube a R2 reusando el
     helper compartido r2_uploader.rehost_hero_strict.
  3. ANTES de tocar la DB, guarda el mapeo old -> new en
     /tmp/hero_backfill_map.json para que sea REVERSIBLE.
  4. Verifica que la nueva URL del CDN devuelva image/* 200 con un HEAD/GET.
  5. Recién ahí hace UPDATE hero_image_url.
  6. Si un source sigue dando 403/timeout server-side, lo loguea y lo SALTA
     (no rompe el resto).

Idempotente: correrlo dos veces no re-sube (sha1 key estable) y los que ya
quedaron en R2 ya no entran al set de externos.

Uso:
    # Creds: usa CLOUDFLARE_API_TOKEN_R2 + CLOUDFLARE_ACCOUNT_ID +
    # TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (auto desde .env.local via db.py).
    python3 scripts/backfill_blog_heroes_r2.py [--dry-run] [--limit N]

En CI/workflow exportar esos secrets como env vars.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import db  # noqa: E402  (carga .env.local + conexión Turso)
from r2_uploader import (  # noqa: E402
    rehost_hero_strict,
    is_configured,
    is_already_rehosted,
    R2_PUBLIC_HOST,
)

MAP_PATH = Path("/tmp/hero_backfill_map.json")

# UA de navegador para la verificación del CDN (Cloudflare a veces 403ea a
# clients sin UA). El CDN propio no hotlink-bloquea, pero por las dudas.
VERIFY_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)


def _is_external(url: str | None) -> bool:
    """True si la URL es un hero externo (no en nuestro CDN R2 ni *.r2.dev)."""
    if not url:
        return False
    host = (urlparse(url).hostname or "").lower()
    cdn_host = (urlparse(R2_PUBLIC_HOST).hostname or "").lower()
    if host == cdn_host:
        return False
    if host.endswith(".r2.dev"):
        return False
    return True


def _verify_cdn(url: str, timeout: int = 20) -> tuple[bool, str]:
    """
    Verifica que la nueva URL del CDN devuelva image/* 200.
    Devuelve (ok, detalle) donde detalle = "200 image/webp".
    """
    headers = {"User-Agent": VERIFY_UA, "Accept": "image/*,*/*;q=0.8"}
    try:
        r = requests.head(url, headers=headers, timeout=timeout, allow_redirects=True)
        # Algunos edges no soportan HEAD bien — fallback a GET liviano.
        if r.status_code >= 400 or "image/" not in r.headers.get("content-type", ""):
            r = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        ct = r.headers.get("content-type", "?")
        ok = r.status_code == 200 and ct.split(";")[0].strip().startswith("image/")
        return ok, f"{r.status_code} {ct}"
    except Exception as e:
        return False, f"ERR {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="No escribe DB ni mapa, solo muestra qué haría")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--sleep", type=float, default=1.0)
    args = parser.parse_args()

    if not is_configured():
        print(
            "✗ R2 creds ausentes (CLOUDFLARE_API_TOKEN_R2 + CLOUDFLARE_ACCOUNT_ID).\n"
            "  El backfill DEBE correr con creds de escritura R2. En local: "
            ".env.local. En CI: secrets del repo.\n"
            "  Abortando sin tocar nada."
        )
        return 2

    rows = db.execute(
        """
        SELECT id, slug, hero_image_url
        FROM tutorials
        WHERE status = 'published'
          AND hero_image_url IS NOT NULL
          AND hero_image_url != ''
        ORDER BY published_at DESC
        LIMIT ?
        """,
        [args.limit],
    ).fetchall()

    external = [r for r in rows if _is_external(r[2]) and not is_already_rehosted(r[2])]
    print(f"Published con hero: {len(rows)}")
    print(f"Externos a espejar: {len(external)}\n")
    if not external:
        print("Nada que hacer — todos los heros ya están en el CDN R2.")
        return 0

    # Mapa reversible old -> new. Lo persistimos ANTES de escribir la DB:
    # cada éxito agrega su entrada y reescribimos el archivo. Así, si el
    # proceso muere a mitad, el mapa refleja exactamente lo ya cambiado.
    mapping: dict[str, dict[str, str]] = {}
    if MAP_PATH.exists() and not args.dry_run:
        try:
            mapping = json.loads(MAP_PATH.read_text())
        except Exception:
            mapping = {}

    results = []  # (tid, slug, old, new_or_None, http_detail, status)
    ok_count = 0
    fail_count = 0

    for tid, slug, old_url in external:
        slug_short = (slug or "")[:55]
        print(f"→ {tid[:12]} {slug_short}")
        print(f"  old: {old_url[:90]}")
        # 1. Descargar (UA + Referer del origen) y subir a R2.
        try:
            new_url = rehost_hero_strict(old_url, tutorial_id=tid)
        except Exception as e:
            fail_count += 1
            print(f"  ✗ rehost falló (se salta): {e}")
            results.append((tid, slug_short, old_url, None, "rehost_error", "SKIP"))
            time.sleep(args.sleep)
            continue

        # 2. Verificar que el nuevo CDN URL sirve image/* 200.
        ok, detail = _verify_cdn(new_url)
        if not ok:
            fail_count += 1
            print(f"  ✗ verificación CDN falló ({detail}) — NO se actualiza DB")
            results.append((tid, slug_short, old_url, new_url, detail, "VERIFY_FAIL"))
            time.sleep(args.sleep)
            continue

        print(f"  new: {new_url[:90]}")
        print(f"  ✓ CDN verificado: {detail}")

        # 3. Guardar mapa reversible ANTES de tocar la DB.
        if not args.dry_run:
            mapping[tid] = {"slug": slug or "", "old": old_url, "new": new_url}
            MAP_PATH.write_text(json.dumps(mapping, indent=2, ensure_ascii=False))

            # 4. Recién ahora UPDATE.
            db.execute(
                """
                UPDATE tutorials
                SET hero_image_url = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [new_url, tid],
            )
            db.commit()

        ok_count += 1
        results.append((tid, slug_short, old_url, new_url, detail, "OK"))
        time.sleep(args.sleep)

    # Tabla before/after.
    print("\n" + "=" * 100)
    print("RESULTADO BACKFILL (before -> after)")
    print("=" * 100)
    for tid, slug, old, new, detail, status in results:
        print(f"\n[{status}] {tid[:12]} {slug}")
        print(f"  before: {old}")
        print(f"  after : {new or '(sin cambio)'}")
        print(f"  http  : {detail}")

    print("\n" + "-" * 100)
    print(f"OK: {ok_count}  |  FALLOS/SKIP: {fail_count}  |  total externos: {len(external)}")
    if not args.dry_run:
        print(f"Mapa reversible guardado en: {MAP_PATH}")
        print("Para revertir un id: UPDATE tutorials SET hero_image_url=<old> WHERE id=<id>")
    else:
        print("(dry-run — no se escribió DB ni mapa)")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
