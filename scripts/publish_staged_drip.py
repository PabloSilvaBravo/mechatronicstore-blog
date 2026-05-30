#!/usr/bin/env python3
"""
Drip publisher (Pablo 30-may-2026).

Publica de a pocos los tutoriales en estado 'staged' para evitar el patron
de "publicacion masiva el mismo dia", que Google penaliza como contenido
generado por IA / automatizado.

Como funciona:
  - Los tutoriales rescatados/autoreados quedan en status='staged' (contenido
    limpio y listo, pero NO visible en el sitio).
  - Este script corre 1 vez al dia (GitHub Actions cron) y pasa N de ellos a
    status='published' con published_at = AHORA (publicacion LIMPIA: la fecha
    de publicacion es real, no un backdate; la metadata refleja el momento
    real en que la nota salio al aire).
  - Orden: el mas viejo en staging primero (FIFO por translated_at).

Cadencia organica: con --min/--max publica una cantidad ALEATORIA en ese
rango cada dia (ej. 4 a 6), para que el ritmo no se vea perfectamente
automatizado.

Uso:
  python3 scripts/publish_staged_drip.py                 # 5 (default)
  python3 scripts/publish_staged_drip.py --count 5
  python3 scripts/publish_staged_drip.py --min 4 --max 6 # aleatorio 4-6
  python3 scripts/publish_staged_drip.py --dry-run
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # carga .env.local + conexion Turso
from content_swarm_lib import gen_unique_slug  # slug ES limpio al publicar


def staged_pending() -> int:
    row = db.execute(
        "SELECT COUNT(*) FROM tutorials WHERE status = 'staged'"
    ).fetchone()
    return row[0] if row else 0


def pick_staged(limit: int) -> list[tuple]:
    """Los staged mas viejos primero (FIFO por cuando se terminaron)."""
    return db.execute(
        """SELECT id, slug, title_es
           FROM tutorials
           WHERE status = 'staged'
           ORDER BY COALESCE(translated_at, updated_at, ingested_at) ASC, id ASC
           LIMIT ?""",
        [limit],
    ).fetchall()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--count", type=int, default=5,
                    help="cantidad fija a publicar (default 5)")
    ap.add_argument("--min", type=int, default=None,
                    help="con --max, publica una cantidad aleatoria en [min,max]")
    ap.add_argument("--max", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true",
                    help="muestra que publicaria sin tocar la DB")
    args = ap.parse_args()

    if args.min is not None and args.max is not None:
        lo, hi = min(args.min, args.max), max(args.min, args.max)
        n = random.randint(lo, hi)
    else:
        n = args.count
    n = max(0, n)

    pending = staged_pending()
    print(f"staged pendientes: {pending} | a publicar hoy: {min(n, pending)}")
    if pending == 0 or n == 0:
        print("nada que publicar.")
        return 0

    rows = pick_staged(n)
    if not rows:
        print("nada que publicar.")
        return 0

    for tid, old_slug, title in rows:
        new_slug = gen_unique_slug(title or tid, tid)
        print(f"  -> {tid} | {old_slug} -> {new_slug} | {(title or '')[:50]}")
        if not args.dry_run:
            # Publicacion LIMPIA (Pablo 30-may-2026): slug ES nuevo + TODOS los
            # timestamps al momento de salida (creacion incluida). Asi la nota
            # es contenido nuevo del dia, sin huella de creacion en lote.
            db.execute(
                """UPDATE tutorials
                   SET status = 'published',
                       slug = ?,
                       published_at = datetime('now'),
                       ingested_at = datetime('now'),
                       updated_at = datetime('now')
                   WHERE id = ? AND status = 'staged'""",
                [new_slug, tid],
            )

    if args.dry_run:
        print("[dry-run] no se modifico la DB.")
        return 0

    db.commit()
    remaining = staged_pending()
    print(f"OK: {len(rows)} publicadas. staged restantes: {remaining}")
    print("Visibles en el sitio por ISR en ~10-60 min (revalidate 600/3600).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
