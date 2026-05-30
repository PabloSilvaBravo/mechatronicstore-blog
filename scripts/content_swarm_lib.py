#!/usr/bin/env python3
"""
Helper uniforme para el enjambre de contenido (Pablo 30-may-2026).

Da a cada subagente Opus un mecanismo unico y auditado para leer/persistir
contenido y rehostear imagenes a R2, en vez de 39 subagentes escribiendo SQL
crudo divergente.

Subcomandos:
  getrec <id>
      Imprime JSON con el registro completo del tutorial.

  setfields <id> --json '{"title_es": "...", "body_es": "...", ...}'
      UPDATE de los campos provistos (whitelist). Los *_json aceptan tanto
      string JSON como objeto (se serializa). Setea updated_at.

  rehost <url_origen> <id>
      Descarga la imagen del origen (UA navegador + Referer del origen) y la
      sube a R2. Imprime la URL del CDN (images.mechatronicstore.cl/...).
      Falla ruidoso si no se puede (no inventa URL).

Ejemplos:
  python3 scripts/content_swarm_lib.py getrec 5ac98e994275
  python3 scripts/content_swarm_lib.py rehost "https://site/img.jpg" 5ac98e994275
  python3 scripts/content_swarm_lib.py setfields 5ac98e994275 --json '{"title_es":"..."}'
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # carga .env.local + conexion Turso

# Campos que el enjambre puede modificar. Cualquier otro campo es rechazado.
WRITABLE = {
    "title_es", "subtitle_es", "body_es",
    "materials_list_json", "linked_products_json", "hero_image_url",
}
JSON_FIELDS = {"materials_list_json", "linked_products_json"}

READ_FIELDS = [
    "id", "slug", "status", "category", "source_id", "source_url",
    "title_en", "subtitle_en", "title_es", "subtitle_es", "body_es",
    "materials_list_json", "linked_products_json", "hero_image_url",
    "extra_images_json", "tags_json", "difficulty", "published_at",
]


def cmd_getrec(tid: str) -> int:
    cols = ", ".join(READ_FIELDS)
    rows = db.execute(
        f"SELECT {cols} FROM tutorials WHERE id = ?", [tid]
    ).fetchall()
    if not rows:
        print(json.dumps({"error": f"no existe tutorial {tid}"}))
        return 1
    r = rows[0]
    rec = {READ_FIELDS[i]: r[i] for i in range(len(READ_FIELDS))}
    print(json.dumps(rec, ensure_ascii=False))
    return 0


def cmd_setfields(tid: str, raw_json: str) -> int:
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: --json invalido: {e}", file=sys.stderr)
        return 2
    if not isinstance(data, dict) or not data:
        print("ERROR: --json debe ser un objeto no vacio", file=sys.stderr)
        return 2

    bad = [k for k in data if k not in WRITABLE]
    if bad:
        print(
            f"ERROR: campos no permitidos: {bad}. Permitidos: {sorted(WRITABLE)}",
            file=sys.stderr,
        )
        return 2

    sets = []
    vals = []
    for k, v in data.items():
        if k in JSON_FIELDS and not isinstance(v, str):
            v = json.dumps(v, ensure_ascii=False)
        sets.append(f"{k} = ?")
        vals.append(v)
    sets.append("updated_at = datetime('now')")
    vals.append(tid)

    sql = f"UPDATE tutorials SET {', '.join(sets)} WHERE id = ?"
    db.execute(sql, vals)
    db.commit()
    print(json.dumps({"ok": True, "id": tid, "updated": list(data.keys())}))
    return 0


def cmd_rehost(url: str, tid: str) -> int:
    from r2_uploader import rehost_hero_strict  # import diferido
    try:
        r2_url = rehost_hero_strict(url, tutorial_id=tid)
    except Exception as e:
        print(f"ERROR rehost: {e}", file=sys.stderr)
        return 1
    print(r2_url)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_get = sub.add_parser("getrec")
    p_get.add_argument("id")

    p_set = sub.add_parser("setfields")
    p_set.add_argument("id")
    p_set.add_argument("--json", dest="json_str", default=None)
    p_set.add_argument(
        "--file", dest="json_file", default=None,
        help="archivo con el JSON de campos (recomendado para body_es grande)",
    )

    p_re = sub.add_parser("rehost")
    p_re.add_argument("url")
    p_re.add_argument("id")

    args = parser.parse_args()
    if args.cmd == "getrec":
        return cmd_getrec(args.id)
    if args.cmd == "setfields":
        raw = args.json_str
        if args.json_file:
            raw = Path(args.json_file).read_text()
        if not raw:
            print("ERROR: pasar --json o --file", file=sys.stderr)
            return 2
        return cmd_setfields(args.id, raw)
    if args.cmd == "rehost":
        return cmd_rehost(args.url, args.id)
    return 2


if __name__ == "__main__":
    sys.exit(main())
