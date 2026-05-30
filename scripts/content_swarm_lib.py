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
import re
import sys
import unicodedata
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
    "title_en", "subtitle_en", "body_en", "body_html_en",
    "title_es", "subtitle_es", "body_es",
    "materials_list_json", "linked_products_json", "hero_image_url",
    "extra_images_json", "tags_json", "difficulty", "published_at",
]

# Campos que el subagente provee al PUBLICAR una nota nueva (desde rejected/draft).
PUBLISH_FIELDS = {
    "title_es", "subtitle_es", "body_es", "materials_list_json",
    "linked_products_json", "hero_image_url", "category", "tags_json",
    "difficulty", "estimated_time_minutes", "estimated_cost_clp", "steps_json",
}
PUBLISH_JSON_FIELDS = {
    "materials_list_json", "linked_products_json", "tags_json", "steps_json",
}
_R2_PREFIX = "https://images.mechatronicstore.cl/"


def slugify_es(text: str, max_len: int = 60) -> str:
    """Slug limpio en espanol: saca acentos (a->a, n->n), deja solo
    a-z0-9 y guiones, recorta en borde de palabra. SIN sufijo de hash."""
    s = unicodedata.normalize("NFKD", str(text or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s).strip("-")
    if len(s) > max_len:
        s = s[:max_len].rsplit("-", 1)[0]
    return s or "tutorial"


def gen_unique_slug(title_es: str, tid: str) -> str:
    """Genera slug desde title_es; si choca con otra nota, agrega -2, -3..."""
    base = slugify_es(title_es)
    cand, n = base, 1
    while True:
        rows = db.execute(
            "SELECT id FROM tutorials WHERE slug = ? AND id != ?", [cand, tid]
        ).fetchall()
        if not rows:
            return cand
        n += 1
        cand = f"{base}-{n}"


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


def cmd_publish(tid: str, raw_json: str) -> int:
    """Publica una nota nueva (estado rejected/draft -> published) con los
    campos en español autoreados por el subagente. Aplica los guards de
    calidad (3+ imágenes en R2, sin guiones de marca) ANTES de publicar.
    Conserva el slug existente. Setea published_at/translated_at = ahora.
    """
    import re as _re
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: --json/--file invalido: {e}", file=sys.stderr)
        return 2
    for req in ("title_es", "subtitle_es", "body_es", "hero_image_url", "category"):
        if not data.get(req):
            print(f"ERROR: falta campo requerido '{req}'", file=sys.stderr)
            return 2

    body = str(data["body_es"])
    imgs = _re.findall(r"!\[[^\]]*\]\(([^)\s]+)", body)
    if len(imgs) < 3:
        print(f"ERROR: body_es tiene {len(imgs)} imagenes (minimo 3). NO se publica.", file=sys.stderr)
        return 3
    ext = [u for u in imgs if not u.startswith(_R2_PREFIX)]
    if ext:
        print(f"ERROR: {len(ext)} imagen(es) externa(s) en el body, deben estar en R2: {ext[:2]}", file=sys.stderr)
        return 3
    if not str(data["hero_image_url"]).startswith(_R2_PREFIX):
        print("ERROR: hero_image_url no esta en R2", file=sys.stderr)
        return 3

    # Saneo de guiones de marca (reusa el sanitizer fence-aware del persist).
    try:
        from persist_blog_translation import sanitize_brand_dashes
        for k in ("title_es", "subtitle_es", "body_es"):
            data[k], _ = sanitize_brand_dashes(str(data[k]))
    except Exception as e:
        print(f"WARN: no se pudo sanear guiones ({e}); sigo igual.", file=sys.stderr)

    sets, vals = [], []
    for k, v in data.items():
        if k not in PUBLISH_FIELDS:
            continue
        if k in PUBLISH_JSON_FIELDS and not isinstance(v, str):
            v = json.dumps(v, ensure_ascii=False)
        sets.append(f"{k} = ?")
        vals.append(v)
    # Estado + timestamps + limpiar cualquier rastro de rechazo/bloqueo.
    sets += [
        "status = 'published'",
        "published_at = datetime('now')",
        "translated_at = datetime('now')",
        "updated_at = datetime('now')",
        "rejected_reason = NULL",
        "is_blocked = 0",
        "blocked_reason = NULL",
        "editor_byline = COALESCE(NULLIF(editor_byline, ''), 'Equipo MechatronicStore')",
    ]
    vals.append(tid)
    db.execute(f"UPDATE tutorials SET {', '.join(sets)} WHERE id = ?", vals)
    db.commit()
    print(json.dumps({"ok": True, "id": tid, "status": "published", "body_images": len(imgs)}))
    return 0


def cmd_stage(tid: str, raw_json: str) -> int:
    """Igual que publish PERO deja el tutorial en estado 'staged' (contenido
    listo y limpio, NO visible en el sitio). El drip diario lo pasa a
    'published' de a 5/dia con published_at = ahora (publicacion limpia, no
    backdate). Genera un slug limpio en espanol desde title_es. Setea
    translated_at = ahora (orden del drip). published_at queda NULL.
    """
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: --json/--file invalido: {e}", file=sys.stderr)
        return 2
    for req in ("title_es", "subtitle_es", "body_es", "hero_image_url", "category"):
        if not data.get(req):
            print(f"ERROR: falta campo requerido '{req}'", file=sys.stderr)
            return 2

    body = str(data["body_es"])
    imgs = re.findall(r"!\[[^\]]*\]\(([^)\s]+)", body)
    if len(imgs) < 3:
        print(f"ERROR: body_es tiene {len(imgs)} imagenes (minimo 3). NO se stagea.", file=sys.stderr)
        return 3
    ext = [u for u in imgs if not u.startswith(_R2_PREFIX)]
    if ext:
        print(f"ERROR: {len(ext)} imagen(es) externa(s) en el body, deben estar en R2: {ext[:2]}", file=sys.stderr)
        return 3
    if not str(data["hero_image_url"]).startswith(_R2_PREFIX):
        print("ERROR: hero_image_url no esta en R2", file=sys.stderr)
        return 3

    # Saneo de guiones de marca (reusa el sanitizer fence-aware del persist).
    try:
        from persist_blog_translation import sanitize_brand_dashes
        for k in ("title_es", "subtitle_es", "body_es"):
            data[k], _ = sanitize_brand_dashes(str(data[k]))
    except Exception as e:
        print(f"WARN: no se pudo sanear guiones ({e}); sigo igual.", file=sys.stderr)

    sets, vals = [], []
    for k, v in data.items():
        if k not in PUBLISH_FIELDS:
            continue
        if k in PUBLISH_JSON_FIELDS and not isinstance(v, str):
            v = json.dumps(v, ensure_ascii=False)
        sets.append(f"{k} = ?")
        vals.append(v)
    # El slug definitivo (ES limpio) y los timestamps frescos los asigna el
    # DRIP al publicar (publish_staged_drip.py): asi la nota que sale al aire
    # es "contenido nuevo de ese momento" (slug + fecha de creacion/publicacion
    # del dia de salida), no un flag flipeado sobre un registro viejo.
    sets += [
        "status = 'staged'",
        "translated_at = datetime('now')",
        "updated_at = datetime('now')",
        "published_at = NULL",
        "rejected_reason = NULL",
        "is_blocked = 0",
        "blocked_reason = NULL",
        "editor_byline = COALESCE(NULLIF(editor_byline, ''), 'Equipo MechatronicStore')",
    ]
    vals.append(tid)
    db.execute(f"UPDATE tutorials SET {', '.join(sets)} WHERE id = ?", vals)
    db.commit()
    print(json.dumps({"ok": True, "id": tid, "status": "staged", "body_images": len(imgs)}))
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

    p_pub = sub.add_parser("publish")
    p_pub.add_argument("id")
    p_pub.add_argument("--json", dest="json_str", default=None)
    p_pub.add_argument("--file", dest="json_file", default=None)

    p_stg = sub.add_parser("stage")
    p_stg.add_argument("id")
    p_stg.add_argument("--json", dest="json_str", default=None)
    p_stg.add_argument("--file", dest="json_file", default=None)

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
    if args.cmd == "publish":
        raw = args.json_str
        if args.json_file:
            raw = Path(args.json_file).read_text()
        if not raw:
            print("ERROR: pasar --json o --file", file=sys.stderr)
            return 2
        return cmd_publish(args.id, raw)
    if args.cmd == "stage":
        raw = args.json_str
        if args.json_file:
            raw = Path(args.json_file).read_text()
        if not raw:
            print("ERROR: pasar --json o --file", file=sys.stderr)
            return 2
        return cmd_stage(args.id, raw)
    return 2


if __name__ == "__main__":
    sys.exit(main())
