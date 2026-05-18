#!/usr/bin/env python3
"""
Re-traduce tutoriales publicados que perdieron las imágenes inline en
body_es (Pablo 18-may-2026: "porque no hay fotos dentro de las entradas
de blog?, en mecha noticias si podiamos hacerlo").

Causa: Routine C antigua descartaba `<img>` tags al pasar body_en HTML
a body_es markdown. Prompt actualizado para preservar imágenes inline
con `![alt](URL)`, pero los tutoriales ya publicados quedaron sin imgs
hasta que re-procesemos.

Este script:
1. Lee body_en HTML + materials/steps de cada publicado con imgs en body_en
2. Llama a Claude Opus 4.7 directo con prompt que preserva las imgs
3. Update body_es en DB

Uso:
    ANTHROPIC_API_KEY=... TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
        python3 scripts/retranslate_with_images.py [--dry-run] [--id ID]
"""
from __future__ import annotations

import argparse
import os
import re
import sys

import anthropic
import libsql

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TURSO_URL = os.environ["TURSO_DATABASE_URL"]
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")

MODEL = "claude-opus-4-7"  # mismo modelo que Routine C

SYSTEM_PROMPT = """Sos un editor del blog MechatronicStore. Re-procesas tutoriales ya \
publicados que perdieron las imágenes inline durante su traducción inicial.

REGLA CRÍTICA: el body original (HTML) tiene tags `<img src="URL" alt="texto">` \
distribuidos a lo largo del contenido. Tu output (body_es en markdown) debe \
preservar TODAS esas imágenes en su MISMA posición relativa, usando \
`![alt traducido al español](URL_original_exacta)`.

EXCEPCIÓN: NO incluir la imagen de portada (hero_image_url) — ya se renderea \
aparte por el portal. Si la primera imagen del body es la cover (mismo URL \
o variante con query string), omitirla del body.

Tono: español Chile con TUTEO (NO voseo argentino). Usar **tú** + verbos sin \
acento final: "Conecta", "Carga", "Verifica", "Asegúrate" (no "Conectá", \
"Cargá", "Verificá", "Asegurate").

Output: SOLO el markdown del body_es (sin meta-comentarios, sin preámbulos, \
sin código de envoltura). Empieza directo con el primer header `##` o párrafo.

Mantener:
- Todos los `<a href="URL">texto</a>` como `[texto traducido](URL)`.
- Code blocks ```lang ... ```.
- Headers (convertir `<h2>` a `##`, `<h3>` a `###`).
- Listas, negritas, énfasis.

Estructura del body markdown:
- 2-4 secciones lógicas con `##` headers (Introducción, Cómo funciona, etc.)
- Las imágenes integradas naturalmente después del párrafo relevante
- Sin saltos extra ni texto al final tipo "Espero que te haya servido"
"""

USER_TEMPLATE = """Tutorial original (HTML body):

```html
{body_en}
```

Metadata del tutorial:
- Título: {title_es}
- Subtítulo: {subtitle_es}
- Hero image URL (omitir del body si aparece): {hero_image_url}
- Categoría: {category}

Re-procesar este body al español Chile con TUTEO, preservando TODAS las \
imágenes inline en formato `![alt](URL)`. Output: solo el markdown del body, \
sin código de envoltura, sin preámbulo, sin meta-comentarios.
"""


def fetch_published_with_images(client_db, only_id: str | None = None):
    sql = """
        SELECT id, slug, title_es, subtitle_es, hero_image_url, category, body_en
        FROM tutorials
        WHERE status='published'
          AND body_en IS NOT NULL
          AND instr(body_en, '<img') > 0
    """
    args: list = []
    if only_id:
        sql += " AND id=?"
        args.append(only_id)
    return client_db.execute(sql, args).fetchall()


def call_claude(client: anthropic.Anthropic, row) -> str:
    tid, slug, title_es, subtitle_es, hero, category, body_en = row
    user_msg = USER_TEMPLATE.format(
        body_en=body_en[:80000],  # safety cap
        title_es=title_es or "",
        subtitle_es=subtitle_es or "",
        hero_image_url=hero or "(sin hero)",
        category=category or "otros",
    )
    resp = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    # Concat all text blocks
    parts = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "\n".join(parts).strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--id", default=None, help="Solo este tutorial id")
    args = parser.parse_args()

    db = libsql.connect(
        TURSO_URL.replace("libsql://", "https://"),
        auth_token=TURSO_TOKEN,
    )
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    rows = fetch_published_with_images(db, args.id)
    print(f"Tutoriales con imgs en body_en: {len(rows)}\n")

    img_md_re = re.compile(r"!\[[^\]]*\]\([^)]+\)")
    for row in rows:
        tid, slug, title_es, *_ = row
        print(f"→ {tid[:12]} {slug[:60]}")
        try:
            body_es = call_claude(client, row)
        except Exception as e:
            print(f"  ✗ claude error: {e}")
            continue
        n_imgs = len(img_md_re.findall(body_es))
        print(f"  ✅ body_es generado: {len(body_es)} chars, {n_imgs} imgs inline")
        if args.dry_run:
            preview = body_es[:300].replace("\n", " ")
            print(f"     preview: {preview}…")
            continue
        # Re-connect a Turso justo antes de UPDATE — el call de Claude
        # tarda 30-90s y libsql cierra el stream HTTP entremedio.
        db_fresh = libsql.connect(
            TURSO_URL.replace("libsql://", "https://"),
            auth_token=TURSO_TOKEN,
        )
        db_fresh.execute(
            "UPDATE tutorials SET body_es=?, updated_at=datetime('now') WHERE id=?",
            [body_es, tid],
        )
        db_fresh.commit()
        print(f"     guardado en DB.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
