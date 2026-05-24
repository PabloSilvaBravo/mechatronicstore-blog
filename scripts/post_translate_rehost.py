"""
Post-translate R2 rehost: para cada tutorial con body_es conteniendo
URLs externas (no images.mechatronicstore.cl), rehospede esas imágenes
a R2 y actualiza la DB.

Pablo 23-may-2026: necesario porque la Routine C corre en CCR cloud SIN
acceso a las env vars de R2 (CLOUDFLARE_API_TOKEN_R2, etc.). El persist
en CCR guarda las URLs externas tal cual; este script LOCAL las
rehospede después.

USO:

  # Rehost de tutoriales modificados en últimas N horas (default 24h)
  python3 scripts/post_translate_rehost.py --hours 24

  # Rehost de tutoriales específicos
  python3 scripts/post_translate_rehost.py --ids 1ec722f7c21b ca35c83050a0

  # Dry-run
  python3 scripts/post_translate_rehost.py --hours 24 --dry-run

Estrategia: SELECT tutoriales con `body_es` que contenga URLs externas,
para cada uno correr `rehost_inline_images()` (del persist_blog_translation),
UPDATE body_es + steps_json.

Idempotente: URLs ya en R2 se saltean (is_already_rehosted check).
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

# Asegurar que R2 esté habilitado
os.environ.setdefault("R2_REHOST_ENABLED", "1")
from persist_blog_translation import rehost_inline_images  # noqa: E402

R2_HOST = "images.mechatronicstore.cl"
# Regex para detectar URLs externas en markdown ![](url)
_MD_IMG_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)\)")


def has_external_urls(body_es: str | None, steps_json: str | None) -> bool:
    """True si body_es o steps tienen al menos 1 URL externa (no R2)."""
    body = body_es or ""
    for url in _MD_IMG_RE.findall(body):
        if url.startswith("http") and R2_HOST not in url:
            return True
    if steps_json:
        try:
            steps = json.loads(steps_json)
        except (json.JSONDecodeError, TypeError):
            return False
        for s in steps:
            if isinstance(s, dict):
                url = s.get("image_url") or ""
                if url.startswith("http") and R2_HOST not in url:
                    return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hours", type=int, default=24,
                        help="Tutoriales modificados en últimas N horas (default 24)")
    parser.add_argument("--ids", nargs="+", help="IDs específicos (sobreescribe --hours)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.ids:
        rows = db.execute(
            f"SELECT id, slug, body_es, steps_json FROM tutorials WHERE id IN ({','.join('?' * len(args.ids))})",
            args.ids,
        ).fetchall()
    else:
        # Tutoriales recién modificados
        rows = db.execute(
            """SELECT id, slug, body_es, steps_json
                 FROM tutorials
                WHERE status = 'published'
                  AND updated_at >= datetime('now', '-' || ? || ' hours')
                ORDER BY updated_at DESC""",
            [args.hours],
        ).fetchall()

    # Filtrar a los que tienen URLs externas
    candidates = [r for r in rows if has_external_urls(r[2], r[3])]

    print(f"→ Buscados: {len(rows)} | con URLs externas: {len(candidates)}")
    if not candidates:
        print("  Nada que rehostear.")
        return 0

    if args.dry_run:
        for r in candidates:
            print(f"  {r[0]} | {r[1][:60]}")
        return 0

    stats = {"processed": 0, "rehosted_total": 0, "errors": 0}

    for tid, slug, body_es, steps_json in candidates:
        print(f"\n→ {tid} | {slug[:60]}")
        try:
            steps = json.loads(steps_json) if steps_json else []
        except (json.JSONDecodeError, TypeError):
            steps = []

        new_body, new_steps, n_rehosted = rehost_inline_images(
            body_es or "", steps, tid,
        )

        if n_rehosted == 0:
            print("  ⚠ 0 rehosted (probable: todas las URLs fallaron, ya en R2, o sin imágenes)")
            continue

        try:
            db.execute(
                """UPDATE tutorials
                      SET body_es = ?,
                          steps_json = ?,
                          updated_at = datetime('now')
                    WHERE id = ?""",
                [new_body, json.dumps(new_steps, ensure_ascii=False), tid],
            )
            # Commit per-tutorial — protege contra timeout de Turso stream
            # cuando el rehost de varias imágenes tarda (la conexión expira
            # mientras esperamos descargas+uploads de cada URL externa).
            db.commit()
            stats["processed"] += 1
            stats["rehosted_total"] += n_rehosted
            print(f"  ✓ {n_rehosted} imágenes rehospedadas a R2 (committed)")
        except Exception as e:
            stats["errors"] += 1
            print(f"  ✗ commit failed: {e}")

    print(f"\n✓ Post-translate rehost completo: {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
