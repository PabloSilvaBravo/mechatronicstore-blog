"""
Persiste data/blog-rank-output.json a la DB (tabla tutorials).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

ROOT = Path(__file__).parent.parent
INPUT = ROOT / "data" / "blog-rank-output.json"

THRESHOLD = 0.68  # Pablo 19-may-2026 v2: 0.72 → 0.68 después de ver que 5
                  # Adafruit caían 0.65-0.69 (justo abajo). Con 3 sources
                  # activas, necesitamos más recall. 0.68 ≈ 6.8/10 promedio.
                  # Sigue descartando basura (lo que cae en 0.40-0.60).
                  # Si calidad visible cae, subir a 0.72.


def utc_now_sqlite() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def main():
    if not INPUT.exists():
        print(f"ERROR: {INPUT} no existe")
        sys.exit(1)

    data = json.loads(INPUT.read_text())
    rankings = data.get("rankings", [])
    ranked_at = data.get("ranked_at") or utc_now_sqlite()
    ts_sqlite = ranked_at[:19].replace("T", " ") if "T" in ranked_at else ranked_at

    stats = {
        "persisted_ranked": 0,
        "persisted_rejected": 0,
        "blocked": 0,
        "missing_tutorial": 0,
        "skipped_terminal": 0,  # status='published' o 'rejected' (no se regresan)
    }

    for rk in rankings:
        tid = rk.get("id")
        if not tid:
            continue

        # Pablo 19-may-2026: chequeo de status PREVIO. Antes solo se
        # comprobaba que el tid existiera, lo que permitía que rank-persist
        # REGRESARA un tutorial 'published' a 'ranked' (destruyendo el
        # progreso del pipeline). Bug real ocurrido el 18-may: 2 tutoriales
        # ya publicados fueron rankeados de nuevo por Routine B (con input
        # stale del dump previo), persist los regresó a 'ranked', y como
        # `dump_blog_translate_input.py` filtra `title_es IS NULL`, quedaron
        # invisibles para el pipeline → limbo eterno hasta intervención
        # manual. Detectamos el bug porque /blog mostraba 4 tutoriales
        # cuando debían haber sido 6.
        existing = db.execute(
            "SELECT id, status FROM tutorials WHERE id = ?",
            [tid],
        ).fetchone()
        if not existing:
            stats["missing_tutorial"] += 1
            continue
        if existing[1] in ("published", "rejected"):
            stats["skipped_terminal"] += 1
            print(
                f"  ↷ skip {tid}: status='{existing[1]}' es terminal "
                "(no se sobreescribe desde rank-persist)"
            )
            continue

        scores = rk.get("scores", {})
        cs = float(rk.get("combined_score", 0))
        is_blocked = bool(rk.get("is_blocked", False))

        if is_blocked:
            status = "rejected"
            reason = f"blocked:{rk.get('blocked_reason') or 'unspecified'}"
            stats["blocked"] += 1
        elif cs >= THRESHOLD:
            status = "ranked"
            reason = None
            stats["persisted_ranked"] += 1
        else:
            status = "rejected"
            reason = f"below_threshold:cs={cs:.3f}<{THRESHOLD}"
            stats["persisted_rejected"] += 1

        # Defense-in-depth: el WHERE incluye el guard también en el UPDATE
        # por si el SELECT/UPDATE corre en transacciones distintas (libsql
        # commit-en-batch). Si una concurrent racea con un workflow de
        # translate-persist que sube a 'published', el UPDATE no afecta.
        db.execute(
            """UPDATE tutorials
               SET status = ?,
                   cs_pedagogy = ?,
                   cs_code_quality = ?,
                   cs_materials_clarity = ?,
                   cs_step_completeness = ?,
                   cs_image_quality = ?,
                   cs_relevance_to_store_catalog = ?,
                   cs_novelty = ?,
                   combined_score = ?,
                   is_blocked = ?,
                   blocked_reason = ?,
                   rejected_reason = ?,
                   ranked_at = ?,
                   updated_at = datetime('now')
               WHERE id = ?
                 AND status NOT IN ('published', 'rejected')""",
            [
                status,
                int(scores.get("pedagogy", 0)),
                int(scores.get("code_quality", 0)),
                int(scores.get("materials_clarity", 0)),
                int(scores.get("step_completeness", 0)),
                int(scores.get("image_quality", 0)),
                int(scores.get("relevance_to_store_catalog", 0)),
                int(scores.get("novelty", 0)),
                cs,
                1 if is_blocked else 0,
                rk.get("blocked_reason"),
                reason,
                ts_sqlite,
                tid,
            ],
        )

    db.commit()
    print(f"✓ Persisted rankings: {stats}")


if __name__ == "__main__":
    main()
