#!/usr/bin/env python3
"""
Backfill heros existentes a R2 (mirror permanente, inmune a hotlink/WAF).

Pablo 21-may-2026: opción 3 sistémica. Toma todos los tutoriales publicados
con hero_image_url externa (no en R2), descarga + sube a R2, UPDATE hero al
URL R2 (https://images.mechatronicstore.cl/tutorials/<tid>/<sha>.webp).

Después de correr esto, JAMÁS hay broken images por hotlink — porque las
imgs viven en nuestro CDN, no en el dominio source.

Uso:
    CLOUDFLARE_API_TOKEN=<token-con-R2-write> \
    CLOUDFLARE_ACCOUNT_ID=... \
    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
    python3 backfill_heros_to_r2.py [--dry-run] [--limit N]
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import libsql

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r2_uploader import rehost_hero, is_configured, is_already_rehosted  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--sleep", type=float, default=1.0)
    args = parser.parse_args()

    if not is_configured():
        print("✗ R2 creds missing (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)")
        return 2

    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    client = libsql.connect(
        url.replace("libsql://", "https://"),
        auth_token=token,
    )

    rows = client.execute(
        """
        SELECT id, slug, hero_image_url
        FROM tutorials
        WHERE status='published'
          AND hero_image_url IS NOT NULL
          AND hero_image_url != ''
        ORDER BY published_at DESC
        LIMIT ?
        """,
        [args.limit],
    ).fetchall()

    # Filtrar fuera los que ya están en R2
    pending = [r for r in rows if not is_already_rehosted(r[2])]
    skipped = len(rows) - len(pending)
    print(f"Total published with hero: {len(rows)}")
    print(f"Already on R2: {skipped}")
    print(f"To rehost: {len(pending)}\n")

    rehosted = 0
    failed = 0
    for r in pending:
        tid, slug, source = r
        print(f"→ {tid[:12]} {slug[:55]}")
        print(f"  src: {source[:80]}")
        new_url = rehost_hero(source, tutorial_id=tid)
        if not new_url:
            failed += 1
            print("  ✗ rehost failed")
            time.sleep(args.sleep)
            continue
        print(f"  ✅ {new_url}")
        if not args.dry_run:
            client.execute(
                """
                UPDATE tutorials
                SET hero_image_url = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [new_url, tid],
            )
            rehosted += 1
        time.sleep(args.sleep)

    if not args.dry_run:
        client.commit()

    print(f"\n{rehosted} rehosted, {failed} failed, {skipped} already on R2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
