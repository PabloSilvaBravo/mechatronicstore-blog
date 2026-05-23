"""
Backfill retroactivo de body_html_en + extra_images_json para tutoriales
ingresados ANTES de la fase 1.1-1.5 (23-may-2026).

Pablo 23-may-2026: el pipeline antes guardaba solo body_text, perdiendo
los <img> del HTML scrape. Routine C solo veía texto plano → tutoriales
quedaron con 1 sola imagen (hero). Este script re-scrape cada tutorial,
puebla las nuevas columnas, y opcionalmente marca para re-translate.

USO:

  # Modo 1: solo re-scrape (popular body_html + extras, sin re-translate)
  python3 scripts/backfill_inline_images.py --limit 20 --rescrape-only

  # Modo 2: re-scrape + status=ranked (próxima corrida Routine C lo
  # re-procesa con imágenes nuevas inline). Cuidado con la cadencia.
  python3 scripts/backfill_inline_images.py --limit 5 --full-retranslate

  # Modo 3: dry-run (lista qué se haría sin tocar la DB)
  python3 scripts/backfill_inline_images.py --limit 50 --dry-run

Criterio de selección:
  - status IN ('published', 'editorial_review')
  - extra_images_json IS NULL OR extra_images_json = ''
  - source_url NOT NULL

Cap recomendado:
  - rescrape-only: 20-50 por corrida (solo HTTP GETs, sin Opus tokens)
  - full-retranslate: 5-10 por corrida, respetando cadencia 2/día de
    Routine C. NO marcar 50 como ranked de una vez — quedaría backlog.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db
from scraper import fetch_full_page

ROOT = Path(__file__).parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument(
        "--rescrape-only",
        action="store_true",
        help="Solo popular body_html_en + extras, no tocar status",
    )
    parser.add_argument(
        "--full-retranslate",
        action="store_true",
        help="Rescrape + UPDATE status='ranked' (forzar re-translate)",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Solo listar, no escribir"
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.5,
        help="Sleep entre fetches (rate-limit cortesía)",
    )
    args = parser.parse_args()

    if not args.rescrape_only and not args.full_retranslate and not args.dry_run:
        print("ERROR: especifica --rescrape-only o --full-retranslate (o --dry-run)")
        return 2

    # Seleccionar candidatos: tutoriales sin extras (los viejos pre-1.1)
    rows = db.execute(
        """
        SELECT id, slug, source_url, status
          FROM tutorials
         WHERE status IN ('published', 'editorial_review')
           AND source_url IS NOT NULL
           AND (extra_images_json IS NULL OR extra_images_json = '' OR extra_images_json = '[]')
         ORDER BY published_at DESC NULLS LAST, ingested_at DESC
         LIMIT ?
        """,
        [args.limit],
    ).fetchall()

    print(f"→ {len(rows)} candidatos para backfill")
    if not rows:
        print("  Nada que hacer.")
        return 0

    if args.dry_run:
        for r in rows:
            print(f"  {r[0]} | {r[3]:18} | {r[1][:50]:<50} | {r[2][:60]}")
        return 0

    stats = {"rescraped": 0, "ranked": 0, "scrape_failed": 0, "errors": 0}

    for tid, slug, source_url, current_status in rows:
        print(f"\n→ {tid} ({current_status}): {slug[:60]}")
        print(f"  source: {source_url[:80]}")

        # Re-scrape la fuente original
        try:
            page = fetch_full_page(source_url)
        except Exception as e:
            print(f"  ✗ scrape error: {e}")
            stats["scrape_failed"] += 1
            continue

        if not page.body_html or len(page.body_html) < 200:
            print(f"  ⚠ body_html vacío/muy corto (len={len(page.body_html or '')}) — skip")
            stats["scrape_failed"] += 1
            continue

        body_html = page.body_html[:200000]
        extras = page.extra_images[:20] if page.extra_images else []
        extras_json = json.dumps(extras, ensure_ascii=False) if extras else None

        print(f"  ✓ body_html len={len(body_html)} extras={len(extras)}")

        # UPDATE columnas nuevas
        if args.full_retranslate:
            new_status = "ranked"
            db.execute(
                """UPDATE tutorials
                      SET body_html_en = ?,
                          extra_images_json = ?,
                          status = ?,
                          updated_at = datetime('now')
                    WHERE id = ?""",
                [body_html, extras_json, new_status, tid],
            )
            stats["ranked"] += 1
            print(f"  ✓ status: {current_status} → ranked (Routine C re-traducirá)")
        else:
            db.execute(
                """UPDATE tutorials
                      SET body_html_en = ?,
                          extra_images_json = ?,
                          updated_at = datetime('now')
                    WHERE id = ?""",
                [body_html, extras_json, tid],
            )
            stats["rescraped"] += 1

        # Rate-limit cortesía con la fuente
        if args.sleep > 0:
            time.sleep(args.sleep)

    db.commit()
    print(f"\n✓ Backfill completo: {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
