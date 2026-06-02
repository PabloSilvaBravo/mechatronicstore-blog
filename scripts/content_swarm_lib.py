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


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


# ---------------------------------------------------------------------------
# Fuzzy match R1-R5 — port fiel de src/lib/materials-matching.ts
# ---------------------------------------------------------------------------

# Keywords tecnicos UNICOS: si aparece UNO en ambos lados -> match (R3)
_UNIQUE_TECH_KEYWORDS = frozenset({
    # Microcontroladores
    "esp32", "esp8266", "esp32c3", "esp32s3", "esp32s2", "esp32c6",
    "arduino", "raspberry", "rpi", "pico", "rp2040", "rp2350",
    "atmega", "attiny", "stm32", "samd21", "nrf52",
    # Drivers display 7-seg / LED matrix
    "tm1637", "max7219", "ht16k33",
    # Pantallas OLED/LCD
    "ssd1306", "ssh1106", "hd44780", "pcd8544",
    # TFT
    "ili9341", "st7735", "st7789", "st7796", "gc9a01",
    # LEDs direccionables
    "ws2812", "ws2812b", "ws2811", "sk6812", "neopixel", "apa102",
    # Sensores
    "dht11", "dht22", "ds18b20", "bme280", "bmp280", "bme680",
    "mpu6050", "mpu9250", "mlx90614", "max30100", "max30102",
    "hc-sr04", "hcsr04", "vl53l0x", "tcs34725", "tcrt5000",
    "mq2", "mq3", "mq4", "mq6", "mq7", "mq135",
    # Drivers motor
    "l298n", "l293d", "a4988", "drv8825", "tmc2208", "tmc2209", "tmc5160",
    # Modulos
    "nrf24l01", "hc05", "hc06", "rfid", "rc522", "pn532",
    "max31855", "max31865", "ads1115", "mcp23017", "pca9685",
    # Camaras
    "ov2640", "ov7670", "ov5640",
})

# Componentes GENERICOS comunes: solo matchean si comparten tambien un valor
# (R4), o si el material tiene <=2 tokens y es generico (R5)
_GENERIC_COMPONENTS = frozenset({
    "led", "leds", "resistencia", "resistencias", "resistor",
    "diodo", "diodos", "transistor", "transistores",
    "capacitor", "capacitores", "condensador", "condensadores",
    "potenciometro", "potenciometro", "trimpot",
    "protoboard", "breadboard", "matriz", "jumper", "jumpers",
    "boton", "boton", "pulsador", "pulsadores", "switch", "rele", "rele",
    "servo", "servomotor", "motor", "stepper", "encoder",
    "buzzer", "altavoz", "speaker", "microfono", "microfono",
    "fuente", "fuentes", "regulador", "reguladores",
    "bateria", "bateria", "baterias", "baterias",
    "cargador", "cargadores", "powerbank", "pila", "pilas",
    "cable", "cables", "header", "headers", "conector", "conectores",
    "modulo", "modulo", "modulos", "modulos",
    "antena", "antenas",
})

# Tokens numericos / valores: 220, 220k, 5mm, 10uf, 3v3, etc.
# Puerto fiel de /^\d+(?:[a-zA-Z]+|[.,]\d+)?$/ del TS
_VALUE_RE = re.compile(r"^\d+(?:[a-zA-Z]+|[.,]\d+)?$")


def _tokenize(s: str) -> list[str]:
    """Port de la funcion tokenize() del TS.

    Divide por no-alfanumericos (incluyendo vocales acentuadas como separadoras
    de tokens, igual que el split del TS /[^a-zaeioun0-9]+/i) y sintetiza
    el token compuesto digito+alfa adyacente ("5","mm" -> tambien "5mm").
    """
    # El TS usa /[^a-záéíóúñ0-9]+/i como separador, es decir que las letras
    # acentuadas SON parte de los tokens. Normalizamos la entrada primero
    # (quitamos diacriticos) para unificar "resistencia" vs "resistência".
    normalized = unicodedata.normalize("NFKD", str(s or ""))
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = normalized.lower()

    raw = [t for t in re.split(r"[^a-z0-9]+", normalized) if t]

    # Sintetizar token digito+alfa adyacente: "5" + "mm" -> agregar "5mm"
    synthesized: list[str] = []
    for i, tok in enumerate(raw):
        synthesized.append(tok)
        if re.fullmatch(r"\d+", tok) and i + 1 < len(raw) and re.fullmatch(r"[a-z]+", raw[i + 1]):
            synthesized.append(tok + raw[i + 1])

    return synthesized


def _fuzzy_matches(material_name: str, product_name: str) -> bool:
    """Devuelve True si product_name matchea material_name por alguna de R1-R5.

    Port fiel de fuzzyMatch() en src/lib/materials-matching.ts.
    """
    ml = _norm(material_name)
    pl = _norm(product_name)

    # R1: exact match
    if pl == ml:
        return True

    ml_tokens_all = _tokenize(ml)
    pl_tokens_all = _tokenize(pl)

    ml_tokens4 = {t for t in ml_tokens_all if len(t) >= 4}
    pl_tokens4 = {t for t in pl_tokens_all if len(t) >= 4}

    # R2: >=2 tokens de 4+ chars compartidos
    overlap4 = ml_tokens4 & pl_tokens4
    if len(overlap4) >= 2:
        return True

    # R3: >=1 keyword tecnico unico compartido
    ml_tech = {t for t in ml_tokens_all if t in _UNIQUE_TECH_KEYWORDS}
    pl_tech = {t for t in pl_tokens_all if t in _UNIQUE_TECH_KEYWORDS}
    if ml_tech & pl_tech:
        return True

    # R4: >=1 componente generico + >=1 valor numerico compartidos
    ml_generic = {t for t in ml_tokens_all if t in _GENERIC_COMPONENTS}
    pl_generic = {t for t in pl_tokens_all if t in _GENERIC_COMPONENTS}
    ml_values = {t for t in ml_tokens_all if _VALUE_RE.fullmatch(t)}
    pl_values = {t for t in pl_tokens_all if _VALUE_RE.fullmatch(t)}
    if (ml_generic & pl_generic) and (ml_values & pl_values):
        return True

    # R5: material es UN solo token GENERICO -> matchea cualquier producto
    #     con ese mismo token generico
    if len(ml_tokens_all) <= 2 and ml_generic:
        if ml_generic & pl_generic:
            return True

    return False


def validate_product_coherence(materials, linked_products):
    """Devuelve (clean, dropped). Un producto se MANTIENE si:
      - tiene matched_material que coincide (normalizado) con algun material, o
      - (legacy, sin matched_material) matchea algun material por R1-R5 (mismo
        criterio que el frontend en src/lib/materials-matching.ts).
    Cualquier otro producto es BASURA y se descarta.
    """
    mats = [_norm(m.get("name", "")) for m in (materials or [])]
    clean, dropped = [], []
    for p in (linked_products or []):
        mm = p.get("matched_material")
        if mm and _norm(mm) in mats:
            clean.append(p); continue
        if not mm:
            prod_name = p.get("name_original", "")
            if any(_fuzzy_matches(mat_raw, prod_name) for mat_raw in (m.get("name", "") for m in (materials or []))):
                clean.append(p); continue
        dropped.append(p)
    return clean, dropped


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

    # Gate de coherencia de productos (Pablo 2-jun-2026): descartar basura
    # (productos que no corresponden a ningun material del tutorial).
    try:
        _mats = data.get("materials_list_json")
        _mats = json.loads(_mats) if isinstance(_mats, str) else (_mats or [])
        _prods = data.get("linked_products_json")
        _prods = json.loads(_prods) if isinstance(_prods, str) else (_prods or [])
        _clean, _dropped = validate_product_coherence(_mats, _prods)
        if _dropped:
            print(f"WARN: gate descarto {len(_dropped)} producto(s) basura: "
                  f"{[p.get('name_original') for p in _dropped]}", file=sys.stderr)
            data["linked_products_json"] = json.dumps(_clean, ensure_ascii=False)
    except Exception as e:
        print(f"WARN: gate de coherencia fallo ({e}); sigo sin filtrar.", file=sys.stderr)

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

    # Gate de coherencia de productos (Pablo 2-jun-2026): descartar basura
    # (productos que no corresponden a ningun material del tutorial).
    try:
        _mats = data.get("materials_list_json")
        _mats = json.loads(_mats) if isinstance(_mats, str) else (_mats or [])
        _prods = data.get("linked_products_json")
        _prods = json.loads(_prods) if isinstance(_prods, str) else (_prods or [])
        _clean, _dropped = validate_product_coherence(_mats, _prods)
        if _dropped:
            print(f"WARN: gate descarto {len(_dropped)} producto(s) basura: "
                  f"{[p.get('name_original') for p in _dropped]}", file=sys.stderr)
            data["linked_products_json"] = json.dumps(_clean, ensure_ascii=False)
    except Exception as e:
        print(f"WARN: gate de coherencia fallo ({e}); sigo sin filtrar.", file=sys.stderr)

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
