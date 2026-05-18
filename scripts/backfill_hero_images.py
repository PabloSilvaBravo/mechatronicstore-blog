#!/usr/bin/env python3
"""
Backfill hero_image_url para tutoriales publicados que no la tengan.

Razón (Pablo 17-may-2026 audit-blog): Routine C (translation) no siempre
extrae el og:image del source_url, resultando en tutoriales con hero NULL
que se ven feos en el listing del blog.

Solución: re-scrapear el source_url y extraer og:image. Si no hay og:image
ni meta twitter:image, dejar NULL y agregar a `data/hero-backfill-failed.json`
para revisión manual.

Uso:
    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... python3 backfill_hero_images.py [--dry-run]
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import libsql

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper import fetch_full_page  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sleep", type=float, default=2.0)
    args = parser.parse_args()

    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    client = libsql.connect(
        url.replace("libsql://", "https://"),
        auth_token=token,
    )

    rows = client.execute(
        """
        SELECT id, source_url, slug, title_es
        FROM tutorials
        WHERE status='published'
          AND (hero_image_url IS NULL OR hero_image_url = '')
        ORDER BY published_at DESC
        """,
    ).fetchall()

    print(f"Tutoriales sin hero_image_url: {len(rows)}\n")
    fixed = 0
    failed = 0

    for row in rows:
        tid, source_url, slug, title = row
        print(f"→ {tid[:12]} {slug[:60]}")
        page = fetch_full_page(source_url)
        if page.error or not page.main_image_url:
            failed += 1
            print(f"  ✗ no og:image (error={page.error})")
            time.sleep(args.sleep)
            continue

        print(f"  ✅ found: {page.main_image_url[:80]}")
        if not args.dry_run:
            client.execute(
                """
                UPDATE tutorials
                SET hero_image_url = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [page.main_image_url, tid],
            )
            fixed += 1
        time.sleep(args.sleep)

    if not args.dry_run:
        client.commit()

    print(f"\n{fixed} fixed, {failed} sin og:image (dejados NULL)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
