#!/usr/bin/env python3
"""
Re-scrape rejected tutorials con full HTML (no solo RSS summary).

Caso de uso: rejected viejos cuyo `body_en` se cargó del RSS feed truncado
y fallaron filtros porque steps/words/images aparecían bajos. Si re-fetcheamos
el full page del `source_url`, probablemente pasen.

Solo procesa tier-1 sources (Adafruit, Random Nerd, Hackaday, Instructables,
SparkFun) — donde la probabilidad de tutorial legítimo es alta.

Uso:
    TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... python3 refetch_rejected.py [--limit N] [--source ID]
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import libsql

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hard_filters import apply_all  # noqa: E402
from scraper import fetch_full_page  # noqa: E402


TIER1_SOURCES = {
    "adafruit-learn",
    "hackaday-howto",
    "instructables",
    "random-nerd",
    "sparkfun-tutorials",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=15)
    parser.add_argument("--source", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sleep", type=float, default=2.0)
    args = parser.parse_args()

    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    client = libsql.connect(
        url.replace("libsql://", "https://"),
        auth_token=token,
    )

    sources_clause = (
        "AND source_id = ?" if args.source
        else f"AND source_id IN ({','.join('?' * len(TIER1_SOURCES))})"
    )
    sources_args = [args.source] if args.source else list(TIER1_SOURCES)

    sql = f"""
        SELECT id, source_id, source_url, title_en
        FROM tutorials
        WHERE status='rejected'
          {sources_clause}
        ORDER BY ingested_at DESC
        LIMIT ?
    """
    rows = client.execute(sql, [*sources_args, args.limit]).fetchall()

    print(f"Re-fetching {len(rows)} rejected del repo\n")
    promoted = 0
    for row in rows:
        tid, source_id, source_url, title = row
        page = fetch_full_page(source_url)
        if page.error or page.status_code >= 400:
            print(f"  ✗ {tid[:12]} fetch failed: {page.error or page.status_code}")
            time.sleep(args.sleep)
            continue

        result = apply_all(page.body_html)
        if result["passed"]:
            promoted += 1
            print(f"  ✅ PROMOTE {tid[:12]} {(title or '')[:55]}")
            if not args.dry_run:
                client.execute(
                    """
                    UPDATE tutorials
                    SET status='draft', rejected_reason=NULL,
                        body_en=?, title_en=COALESCE(NULLIF(?, ''), title_en)
                    WHERE id=?
                    """,
                    [page.body_html, page.title, tid],
                )

        time.sleep(args.sleep)

    if not args.dry_run:
        client.commit()
    print(f"\n{promoted}/{len(rows)} promoted to draft")
    return 0


if __name__ == "__main__":
    sys.exit(main())
