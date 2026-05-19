"""
Orchestrator de ingesta del blog.

Flujo:
  1. Lee sources activas de DB.
  2. Por cada source, llama al parser correspondiente.
  3. Por cada candidate, scrape full body.
  4. Aplica hard filters.
  5. Si pasa → INSERT tutorials (status='draft'). Si no → 'rejected'.

Idempotente: usa INSERT OR IGNORE basado en source_url (dedup natural).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import db
from scraper import fetch_full_page, fetch_adafruit_multipage, slugify, short_hash
from sources import get as get_parser
from hard_filters import apply_all


def gen_id(source_url: str) -> str:
    return short_hash(source_url, 12)


def gen_slug(title_en: str, tid: str) -> str:
    base = slugify(title_en, max_len=70)
    return f"{base}-{tid[:6]}" if base else tid


def utc_now_sqlite() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def fetch_excluded_keywords() -> list[str]:
    val = db.get_setting("rank.excluded_keywords", "[]")
    try:
        kw = json.loads(val) if isinstance(val, str) else val
        return list(kw) if isinstance(kw, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def process_source(source: dict, excluded_kw: list[str], stats: dict, per_source_limit: int = 15):
    print(f"\n=== {source['name']} ({source['parser_id']}) ===")
    try:
        parser = get_parser(source["parser_id"])
        candidates = parser.discover(source, limit=per_source_limit)
        print(f"  found: {len(candidates)} candidates")
    except Exception as e:
        print(f"  ✗ parser error: {e}")
        stats["sources_failed"].append({"source": source["id"], "error": str(e)})
        return

    for cand in candidates:
        tid = gen_id(cand.source_url)
        existing = db.execute(
            "SELECT id FROM tutorials WHERE id = ?", [tid]
        ).fetchone()
        if existing:
            stats["skipped_existing"] += 1
            continue

        # Pablo 19-may-2026: Adafruit Learn tiene tutoriales multi-page.
        # El fetch_full_page genérico solo trae el overview → la mayoría
        # quedaba rejected. fetch_adafruit_multipage sigue subpages y
        # concatena. Otras sources usan el genérico.
        if cand.source_id == "adafruit-learn":
            page = fetch_adafruit_multipage(cand.source_url)
        else:
            page = fetch_full_page(cand.source_url)
        if page.error:
            print(f"  ✗ {cand.title_en[:50]} — {page.error}")
            stats["scrape_failed"] += 1
            continue

        # Pasar body_html al filter — preserva <pre>, <h2>, <img> structure
        body_for_filter = page.body_html or page.body_text or ""
        body_for_store = page.body_text or ""
        filter_result = apply_all(body_for_filter, excluded_keywords=excluded_kw)
        body = body_for_store  # Store body_text en DB (más compacto)

        if not filter_result["passed"]:
            reasons = ",".join(filter_result["reasons"])
            print(f"  ✗ {cand.title_en[:50]} — {reasons[:60]}")
            stats["filtered_out"] += 1
            db.execute(
                """INSERT OR IGNORE INTO tutorials
                   (id, slug, source_id, source_url, title_en, subtitle_en,
                    body_en, status, rejected_reason, ingested_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'rejected', ?, ?)""",
                [
                    tid,
                    gen_slug(cand.title_en, tid),
                    cand.source_id,
                    page.final_url,
                    page.title or cand.title_en,
                    cand.summary_en[:500],
                    body[:50000],
                    f"hard_filter:{reasons[:200]}",
                    utc_now_sqlite(),
                ],
            )
            continue

        db.execute(
            """INSERT INTO tutorials
               (id, slug, source_id, source_url, title_en, subtitle_en,
                body_en, hero_image_url, status, ingested_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)""",
            [
                tid,
                gen_slug(cand.title_en, tid),
                cand.source_id,
                page.final_url,
                page.title or cand.title_en,
                cand.summary_en[:500],
                body[:50000],
                page.main_image_url,
                utc_now_sqlite(),
            ],
        )
        stats["inserted_drafts"] += 1
        print(f"  ✓ {cand.title_en[:55]}  ({filter_result['stats']})")

    db.execute(
        "UPDATE sources SET last_polled_at = ?, last_success_at = ?, consecutive_failures = 0 WHERE id = ?",
        [utc_now_sqlite(), utc_now_sqlite(), source["id"]],
    )


def main():
    stats = {
        "started_at": utc_now_sqlite(),
        "sources_processed": 0,
        "sources_failed": [],
        "skipped_existing": 0,
        "scrape_failed": 0,
        "filtered_out": 0,
        "inserted_drafts": 0,
    }

    excluded_kw = fetch_excluded_keywords()
    print(f"Excluded keywords loaded: {len(excluded_kw)}")

    sources_rows = db.execute(
        "SELECT id, name, feed_url, homepage, parser_id, tier FROM sources WHERE is_active = 1 ORDER BY tier, id"
    ).fetchall()
    print(f"Sources active: {len(sources_rows)}")

    for row in sources_rows:
        source = {
            "id": row[0], "name": row[1], "feed_url": row[2],
            "homepage": row[3], "parser_id": row[4], "tier": row[5],
        }
        process_source(source, excluded_kw, stats)
        stats["sources_processed"] += 1
        db.commit()

    db.commit()
    stats["ended_at"] = utc_now_sqlite()

    print(f"\n{'=' * 60}")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
