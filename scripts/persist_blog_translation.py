"""
Persiste data/blog-translate-output.json a la DB.

Para cada translation:
  - UPDATE tutorials con todas las columnas estructuradas
  - status='published'
  - published_at = now UTC
  - hero_image_url: usa el del output si viene, sino fallback a re-fetch
    del source_url (og:image extraction).

Pablo 17-may-2026 audit-blog B9: el persist no estaba capturando
hero_image_url, dejando tutoriales sin foto.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

ROOT = Path(__file__).parent.parent
INPUT = ROOT / "data" / "blog-translate-output.json"


def fetch_og_image(source_url: str) -> str | None:
    """Fallback: extrae og:image del source_url si la translation no lo trae."""
    try:
        from scraper import fetch_full_page
        page = fetch_full_page(source_url)
        return page.main_image_url
    except Exception:
        return None


def utc_now_sqlite() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def main():
    if not INPUT.exists():
        print(f"ERROR: {INPUT} no existe")
        sys.exit(1)

    data = json.loads(INPUT.read_text())
    translations = data.get("translations", [])
    translated_at = data.get("translated_at") or utc_now_sqlite()
    ts_sqlite = (
        translated_at[:19].replace("T", " ")
        if "T" in translated_at else translated_at
    )

    stats = {"persisted_published": 0, "missing_tutorial": 0, "errors": 0}

    for tr in translations:
        tid = tr.get("id")
        if not tid:
            continue

        existing = db.execute(
            "SELECT id, status, source_url, hero_image_url FROM tutorials WHERE id = ?",
            [tid],
        ).fetchone()
        if not existing:
            stats["missing_tutorial"] += 1
            continue
        existing_source_url = existing[2]
        existing_hero = existing[3]

        # Hero image: prioridad output > existente > fallback fetch og:image
        hero_url = tr.get("hero_image_url") or existing_hero
        if not hero_url and existing_source_url:
            print(f"  → fallback fetch og:image desde {existing_source_url[:70]}")
            hero_url = fetch_og_image(existing_source_url)
            if hero_url:
                print(f"    ✓ recovered: {hero_url[:80]}")

        try:
            db.execute(
                """UPDATE tutorials
                   SET status = 'published',
                       slug = COALESCE(?, slug),
                       title_es = ?,
                       subtitle_es = ?,
                       body_es = ?,
                       hero_image_url = COALESCE(?, hero_image_url),
                       materials_list_json = ?,
                       steps_json = ?,
                       code_blocks_json = ?,
                       linked_products_json = ?,
                       github_url = ?,
                       download_urls_json = ?,
                       category = ?,
                       difficulty = ?,
                       estimated_time_minutes = ?,
                       estimated_cost_clp = ?,
                       tags_json = ?,
                       translated_at = ?,
                       published_at = ?,
                       updated_at = datetime('now')
                   WHERE id = ?""",
                [
                    tr.get("slug"),
                    tr.get("title_es"),
                    tr.get("subtitle_es"),
                    tr.get("body_es"),
                    hero_url,
                    json.dumps(tr.get("materials_list") or [], ensure_ascii=False),
                    json.dumps(tr.get("steps") or [], ensure_ascii=False),
                    json.dumps(tr.get("code_blocks") or [], ensure_ascii=False),
                    json.dumps(tr.get("linked_products") or [], ensure_ascii=False),
                    tr.get("github_url"),
                    json.dumps(tr.get("download_urls") or [], ensure_ascii=False),
                    tr.get("category"),
                    tr.get("difficulty"),
                    tr.get("estimated_time_minutes"),
                    tr.get("estimated_cost_clp"),
                    json.dumps(tr.get("tags") or [], ensure_ascii=False),
                    ts_sqlite,
                    ts_sqlite,
                    tid,
                ],
            )
            stats["persisted_published"] += 1
            print(f"  ✓ {tr.get('title_es', '')[:60]}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  ✗ {tid}: {e}")

    db.commit()
    print(f"\n✓ Persisted translations: {stats}")


if __name__ == "__main__":
    main()
