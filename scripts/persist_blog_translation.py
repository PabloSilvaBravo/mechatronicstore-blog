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

    stats = {
        "persisted_published": 0,
        "missing_tutorial": 0,
        "errors": 0,
        "editorial_warning": 0,
        "editorial_blocked": 0,
    }

    # Pablo 20-may-2026: checklist editorial pre-publish.
    # Cada tutorial debe pasar ≥3 de 5 checks para ser publicado. Si pasa
    # 2 o menos, queda en status='editorial_review' para revisión manual.
    def editorial_score(tr):
        body = tr.get("body_es") or ""
        checks = {
            # 1. ¿Body tiene link a downloadable concreto?
            "has_downloadable": any(p in body.lower() for p in [
                "github.com/", ".stl", "thingiverse", "printables.com",
                ".ino)", ".cpp)", ".py)", "library", "biblioteca",
                ".kicad", "gerber",
            ]),
            # 2. ¿Body tiene sección "Personalización para Chile"?
            "has_chile_section": any(p in body.lower() for p in [
                "personalización para chile", "personalizacion para chile",
                "en chile podés", "en chile podes", "en chile puedes",
                "mechatronicstore", "catálogo mechatronic", "catalogo mechatronic",
            ]),
            # 3. ¿Body tiene sección "Variantes y mejoras"?
            "has_variants_section": any(p in body.lower() for p in [
                "variantes y mejoras", "variantes y mejora",
                "extender el proyecto", "para ir más allá",
                "ideas para ampliar", "próximos pasos",
                "## variantes", "## mejoras",
            ]),
            # 4. ¿Tiene linked_products ≥2?
            "has_linked_products": len(tr.get("linked_products") or []) >= 2,
            # 5. ¿Auto-checklist editorial sin warning?
            "editorial_self_ok": not tr.get("editorial_quality_warning", False),
            # 6. ¿Tiene sección "Recursos" + link al original?
            # Pablo 20-may-2026 fix: forzar atribución obligatoria
            "has_attribution": (
                ("## recursos" in body.lower()
                 or "## fuente" in body.lower()
                 or "tutorial original" in body.lower()
                 or "basado en" in body.lower()
                 or "inspirado en" in body.lower())
                and "http" in body.lower()
            ),
        }
        passed = sum(checks.values())
        return passed, checks

    for tr in translations:
        tid = tr.get("id")
        if not tid:
            continue

        existing = db.execute(
            "SELECT id, status, source_url, hero_image_url, slug FROM tutorials WHERE id = ?",
            [tid],
        ).fetchone()
        if not existing:
            stats["missing_tutorial"] += 1
            continue
        existing_status = existing[1]
        existing_source_url = existing[2]
        existing_hero = existing[3]
        existing_slug = existing[4]

        # Pablo 20-may-2026 audit: SLUGS ESTABLES.
        # Bug detectado: Routine C re-procesa tutoriales ya publicados (caso
        # edge: reset score → re-rank → re-translate) y reescribe el slug
        # con uno distinto. Eso rompe links externos y desindexa en Google.
        # Fix: si el tutorial YA tiene status='published' Y ya tiene slug,
        # PRESERVAR el slug existente. Routine C puede reescribir el body
        # pero NO el slug.
        # Caso primera publicación (status='ranked' o 'translating'): usar
        # slug nuevo del output.
        # Pablo 22-may-2026: si el tutorial YA tiene slug (cualquiera sea
        # su estado), preservarlo. Antes solo lo preservaba si estaba
        # 'published', pero re-translates manuales (SET status='ranked'
        # del que ya estaba published) cambiaban el slug → 404 SEO.
        # COALESCE: prefiere slug existente, fallback al del output.
        if existing_slug:
            slug_to_use = existing_slug
        else:
            slug_to_use = tr.get("slug")

        # Hero image: prioridad output > existente > fallback fetch og:image
        hero_url = tr.get("hero_image_url") or existing_hero
        if not hero_url and existing_source_url:
            print(f"  → fallback fetch og:image desde {existing_source_url[:70]}")
            hero_url = fetch_og_image(existing_source_url)
            if hero_url:
                print(f"    ✓ recovered: {hero_url[:80]}")

        # Pablo 20-may-2026: aplicar checklist editorial. Si pasa < 3 de 5,
        # rejected con razón editorial (revisar manualmente).
        passed, checks = editorial_score(tr)
        # Pablo 20-may-2026: ahora son 6 checks. Threshold ≥4 para publicar
        # (era ≥3 de 5). Margen un poco más estricto pero alineado con la
        # filosofía editorial "sitio de referencia, no copia".
        total_checks = len(checks)
        if passed >= 4:
            target_status = "published"
            editorial_reason = None
            if passed == 4:
                stats["editorial_warning"] += 1
                print(f"  ⚠️ editorial ok-marginal ({passed}/{total_checks}): {tr.get('title_es','')[:50]}")
                print(f"      checks: {checks}")
        else:
            target_status = "rejected"
            failed = [k for k, v in checks.items() if not v]
            editorial_reason = f"editorial:passed_{passed}/{total_checks};failed:{','.join(failed)[:120]}"
            stats["editorial_blocked"] += 1
            print(f"  ✗ editorial BLOCKED ({passed}/{total_checks}): {tr.get('title_es','')[:50]}")
            print(f"      checks failed: {failed}")

        try:
            db.execute(
                f"""UPDATE tutorials
                   SET status = '{target_status}',
                       rejected_reason = COALESCE(?, rejected_reason),
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
                    editorial_reason,
                    slug_to_use,
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
            if target_status == "published":
                stats["persisted_published"] += 1
                print(f"  ✓ {tr.get('title_es', '')[:60]}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  ✗ {tid}: {e}")

    db.commit()
    print(f"\n✓ Persisted translations: {stats}")


if __name__ == "__main__":
    main()
