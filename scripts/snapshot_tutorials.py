#!/usr/bin/env python3
"""
Snapshot reversible del contenido de TODOS los tutoriales publicados.

Pablo 30-may-2026: antes de correr el enjambre de contenido (que muta
title_es / subtitle_es / body_es / materials_list_json / linked_products_json
/ hero_image_url en vivo), volcamos el estado actual a un JSON timestamped.
Asi cualquier entrada se puede revertir campo por campo si el enjambre la
degrada.

Uso:
    python3 scripts/snapshot_tutorials.py [--out data/content-snapshots/<archivo>.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # carga .env.local + conexion Turso

ROOT = Path(__file__).parent.parent

FIELDS = [
    "id", "slug", "status", "title_es", "subtitle_es", "body_es",
    "materials_list_json", "linked_products_json", "hero_image_url",
    "extra_images_json", "tags_json", "category", "published_at",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    default_out = ROOT / "data" / "content-snapshots" / (
        f"{datetime.now(timezone.utc):%Y-%m-%d}-pre-swarm.json"
    )
    parser.add_argument("--out", type=str, default=str(default_out))
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cols = ", ".join(FIELDS)
    rows = db.execute(
        f"SELECT {cols} FROM tutorials WHERE status='published' "
        "ORDER BY published_at DESC"
    ).fetchall()

    records = []
    for r in rows:
        records.append({FIELDS[i]: r[i] for i in range(len(FIELDS))})

    payload = {
        "snapshot_at": datetime.now(timezone.utc).isoformat(),
        "count": len(records),
        "tutorials": records,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"OK: {len(records)} tutoriales publicados volcados a {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
