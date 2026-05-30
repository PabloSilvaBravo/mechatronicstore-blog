"""
Dump de drafts sin rankear a JSON, para que la CCR routine los lea + score.

Output: data/blog-rank-input.json
"""
import json
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

ROOT = Path(__file__).parent.parent
OUTPUT = ROOT / "data" / "blog-rank-input.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=30)
    args = parser.parse_args()

    # Pablo 30-may-2026 — defensa contra el bug del limbo: además de los
    # drafts frescos sin score (caso normal), re-reclamamos los "orphaned
    # score drafts": filas status='draft' con combined_score YA poblado de un
    # ranking previo. Eso solo pasa si algún script las regresó a 'draft' sin
    # limpiar las columnas de ranking (p.ej. refetch_rejected.py antes del fix
    # de hoy). Quedaban invisibles para ambos dumps y mataban la cola. El
    # filtro ranked_at < now-12h evita carrera con una corrida de rank en
    # curso: si una fila acaba de ser rankeada y aún no transicionó a
    # 'ranked', no la tocamos. Si lleva >12h en ese estado anómalo, la
    # reclamamos para re-rankearla limpia. ORDER BY ingested_at DESC sigue
    # priorizando lo más reciente; el LIMIT no cambia.
    sql = """
        SELECT t.id, t.slug, t.source_id, t.source_url, t.title_en, t.subtitle_en,
               SUBSTR(t.body_en, 1, 25000) AS body_en_excerpt,
               t.hero_image_url, t.ingested_at,
               s.name AS source_name, s.tier AS source_tier
        FROM tutorials t
        LEFT JOIN sources s ON s.id = t.source_id
        WHERE t.status = 'draft'
          AND (
                t.combined_score IS NULL
             OR (t.combined_score IS NOT NULL
                 AND t.ranked_at < datetime('now', '-12 hours'))
          )
        ORDER BY t.ingested_at DESC
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
            "ingested_at": r[8],
            "source_name": r[9],
            "source_tier": r[10],
        })

    output = {
        "dumped_at": datetime.now(timezone.utc).isoformat(),
        "n_candidates": len(candidates),
        "config": {
            "threshold_cs": 0.78,
            "dimensions": [
                "pedagogy", "code_quality", "materials_clarity",
                "step_completeness", "image_quality",
                "relevance_to_store_catalog", "novelty",
            ],
            "weights": {
                "pedagogy": 0.20,
                "code_quality": 0.15,
                "materials_clarity": 0.15,
                "step_completeness": 0.15,
                "image_quality": 0.10,
                "relevance_to_store_catalog": 0.15,
                "novelty": 0.10,
            },
            "model": "claude-opus-4-7",
        },
        "candidates": candidates,
    }

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"✓ Wrote {OUTPUT}")
    print(f"  n_candidates: {len(candidates)}")


if __name__ == "__main__":
    main()
