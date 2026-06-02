#!/usr/bin/env python3
"""
Selector del backfill de matching de productos (Pablo 2-jun-2026).

SOLO LECTURA: lista los tutoriales published/staged cuyo linked_products tiene
productos BASURA (que el gate validate_product_coherence descartaria) o
productos legacy sin matched_material. Salida prioriza por cantidad de basura.

El enjambre de backfill consume esta lista para re-matchear con la busqueda
semantica de la tienda (endpoint POST /api/catalog/search).

Uso:
  python3 scripts/backfill_product_matching.py --dry-run
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import db
from content_swarm_lib import validate_product_coherence

def _loads(v):
    if not v: return []
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return x if isinstance(x, list) else []
    except Exception:
        return []

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="solo listar (no hace nada mas igual)")
    args = ap.parse_args()
    rows = db.execute(
        "SELECT id, status, title_es, materials_list_json, linked_products_json "
        "FROM tutorials WHERE status IN ('published','staged')"
    ).fetchall()
    affected = []
    for tid, status, title, mats_j, prods_j in rows:
        mats = _loads(mats_j); prods = _loads(prods_j)
        if not prods:
            continue
        clean, dropped = validate_product_coherence(mats, prods)
        no_mm = sum(1 for p in prods if not p.get("matched_material"))
        if dropped or no_mm:
            affected.append({
                "id": tid, "status": status,
                "title": (title or "")[:55],
                "junk": len(dropped), "no_matched_material": no_mm,
                "total_prods": len(prods),
            })
    affected.sort(key=lambda a: (a["junk"], a["no_matched_material"]), reverse=True)
    print(f"Tutoriales afectados (basura o sin matched_material): {len(affected)}")
    for a in affected:
        print(f"  {a['id']} [{a['status']}] junk={a['junk']} no_mm={a['no_matched_material']}/{a['total_prods']} | {a['title']}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
