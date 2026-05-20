"""
Dump de tutoriales status='ranked' a JSON para que la CCR routine
los reescriba + traduzca + detecte productos.

Pablo 19-may-2026: ANTES filtraba también `AND t.title_es IS NULL`,
asumiendo que ranked + title_es=NULL = candidato fresco. Pero ese
filtro creaba un limbo: si por cualquier bug previo un tutorial
quedaba en status='ranked' con title_es ya poblado (caso real
ocurrido cuando persist_blog_rankings.py regresaba 'published' a
'ranked'), ese tutorial era INVISIBLE para el pipeline para
siempre. Ahora el filtro es solo `status='ranked'` y dejamos que
Routine C lo procese — si ya tiene title_es, la routine puede
saltearlo o re-traducirlo (idempotente).
"""
import json
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

ROOT = Path(__file__).parent.parent
OUTPUT = ROOT / "data" / "blog-translate-input.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    # Pablo 20-may-2026: incluir source_language en el dump para que
    # Routine C sepa qué reglas editoriales aplicar (re-angulación
    # obligatoria si es=es vs traducción + bonus angulación si es=en).
    # cs_image_quality/cs_novelty ahora contienen value_added/originality
    # (schema reuse, mismo nombre de columna).
    sql = """
        SELECT t.id, t.slug, t.source_id, t.source_url, t.title_en, t.subtitle_en,
               SUBSTR(t.body_en, 1, 30000) AS body_en_excerpt,
               t.hero_image_url, t.combined_score,
               t.cs_pedagogy, t.cs_code_quality, t.cs_materials_clarity,
               t.cs_step_completeness, t.cs_image_quality,
               t.cs_relevance_to_store_catalog, t.cs_novelty,
               t.source_language,
               s.name AS source_name
        FROM tutorials t
        LEFT JOIN sources s ON s.id = t.source_id
        WHERE t.status = 'ranked'
        ORDER BY t.combined_score DESC, t.ranked_at DESC
        LIMIT ?
    """
    rows = db.execute(sql, [args.limit]).fetchall()

    candidates = []
    for r in rows:
        candidates.append({
            "id": r[0],
            "slug": r[1],
            "source_id": r[2],
            "source_url": r[3],
            "title_en": r[4] or "",
            "subtitle_en": r[5] or "",
            "body_en_excerpt": r[6] or "",
            "hero_image_url": r[7],
            "combined_score": r[8],
            "scores": {
                "pedagogy": r[9],
                "code_quality": r[10],
                "materials_clarity": r[11],
                "step_completeness": r[12],
                # schema legacy: cs_image_quality almacena value_added
                "value_added": r[13],
                "relevance_to_store_catalog": r[14],
                # schema legacy: cs_novelty almacena originality_potential
                "originality_potential": r[15],
            },
            # Pablo 20-may-2026: Routine C necesita source_language para
            # aplicar reglas editoriales (re-angulación obligatoria si es=es).
            "source_language": r[16] or "other",
            "source_name": r[17],
        })

    output = {
        "dumped_at": datetime.now(timezone.utc).isoformat(),
        "n_candidates": len(candidates),
        "config": {
            "target_lang": "es-CL",
            "model": "claude-opus-4-7",
            "mcp_connector_uuid": "9e085396-c84f-4506-a7d6-ce4204c12b06",
            "utm_template": "?utm_source=blog&utm_medium=tutorial&utm_campaign={slug}&utm_content={product_id}",
        },
        "candidates": candidates,
    }

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"✓ Wrote {OUTPUT}")
    print(f"  n_candidates: {len(candidates)}")


if __name__ == "__main__":
    main()
