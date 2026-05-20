#!/usr/bin/env python3
"""
Backfill hero_image_url para tutoriales publicados que no la tengan
O que tengan un hero de dominio bloqueado (hotlink-protection).

Razón (Pablo 17-may-2026 audit-blog): Routine C (translation) no siempre
extrae el og:image del source_url, resultando en tutoriales con hero NULL
que se ven feos en el listing del blog.

Extensión Pablo 20-may-2026: tras el primer run del workflow Playwright
blog-visual-audit que detectó 4 heros broken por hotlink (studiopieters.nl
+ tronixstuff.com), ampliamos el query para también rescatar tutoriales
con hero en HERO_BLOCKLIST_DOMAINS (ver scripts/hero_picker.py).

Solución: re-scrapear source_url, aplicar select_best_hero() que prefiere
og:image si no está bloqueado y sino fallback a primera img del body que
no esté bloqueada.

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
from hero_picker import select_best_hero, HERO_BLOCKLIST_DOMAINS  # noqa: E402


def _is_blocked(url: str) -> bool:
    if not url:
        return False
    low = url.lower()
    return any(d in low for d in HERO_BLOCKLIST_DOMAINS)


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

    # Query: NULL/empty O dominio bloqueado.
    # SQLite no soporta LIKE-any nativamente; filtramos client-side.
    rows = client.execute(
        """
        SELECT id, source_url, slug, title_es, hero_image_url
        FROM tutorials
        WHERE status='published'
        ORDER BY published_at DESC
        """,
    ).fetchall()

    targets = [
        r for r in rows
        if (not r[4]) or _is_blocked(r[4])
    ]

    print(f"Tutoriales target (NULL o blocklist): {len(targets)} / {len(rows)} published\n")
    fixed = 0
    failed = 0
    nothing_better = 0

    for row in targets:
        tid, source_url, slug, title, current_hero = row
        reason = "NULL" if not current_hero else "blocklist"
        print(f"→ {tid[:12]} {slug[:60]} ({reason})")
        page = fetch_full_page(source_url)
        if page.error:
            failed += 1
            print(f"  ✗ fetch error: {page.error}")
            time.sleep(args.sleep)
            continue

        new_hero = select_best_hero(page.main_image_url, page.extra_images)
        if not new_hero:
            # Nada usable encontrado. Si el hero actual está bloqueado (=rota),
            # limpiar a NULL para que el card use placeholder en vez de
            # imagen rota.
            if current_hero and _is_blocked(current_hero):
                print(f"  ⊘ no usable image; clearing hero (was blocked: {current_hero[:60]})")
                if not args.dry_run:
                    client.execute(
                        """
                        UPDATE tutorials
                        SET hero_image_url = NULL, updated_at = datetime('now')
                        WHERE id = ?
                        """,
                        [tid],
                    )
                    fixed += 1
            else:
                failed += 1
                print("  ✗ no usable image found (all blocked or none)")
            time.sleep(args.sleep)
            continue
        if new_hero == current_hero:
            nothing_better += 1
            print(f"  · same as before ({new_hero[:60]}) — skip")
            time.sleep(args.sleep)
            continue

        print(f"  ✅ {new_hero[:80]}")
        if not args.dry_run:
            client.execute(
                """
                UPDATE tutorials
                SET hero_image_url = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [new_hero, tid],
            )
            fixed += 1
        time.sleep(args.sleep)

    if not args.dry_run:
        client.commit()

    print(f"\n{fixed} fixed, {nothing_better} sin mejora, {failed} sin imagen útil")
    return 0


if __name__ == "__main__":
    sys.exit(main())
