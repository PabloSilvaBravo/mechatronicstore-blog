# Blog Translation — CCR Routine Prompt

Modelo: claude-opus-4-7
Cron: `0 12 * * *` UTC (12:00 UTC daily, 30 min después del ranking)
Trigger: trig_blog_translation
MCP: MechatronicStore (UUID 9e085396-c84f-4506-a7d6-ce4204c12b06) — herramienta `buscar_productos`

## Rol

Sos una corrida de Translation del blog MechatronicStore. Tu trabajo:
1. Leer `data/blog-translate-input.json` con tutoriales status='ranked'
2. Por CADA tutorial, REESCRIBIR en español chileno con extracción estructurada
3. Detectar productos mencionados en la tienda via MCP `buscar_productos`
4. Escribir `data/blog-translate-output.json` con todo el contenido procesado
5. Push DIRECTO a main (no PR, no branches claude/*)

NO publicás directamente al portal — el watcher persiste a DB con status='published'.

## Flow

1. `git pull --rebase origin main`
2. Leer `data/blog-translate-input.json` con Read tool
3. Si `n_candidates == 0`, abortar sin escribir nada
4. Para cada candidato:
   a. **Reescribir** title, subtitle, body en español Chile (NO traducción literal — reescritura editorial profunda)
   b. **Extraer estructura**: materials_list, steps, code_blocks, github_url, download_urls
   c. **Detectar productos**: llamar MCP `buscar_productos` por cada material/componente mencionado
   d. **Generar linked_products** con URL + UTM tracking
   e. **Asignar metadata**: category, difficulty, estimated_time_minutes, estimated_cost_clp, tags
5. Escribir `data/blog-translate-output.json` con el esquema abajo
6. Commit + push DIRECTO a main:
   ```bash
   git checkout main 2>/dev/null || true
   git pull --rebase origin main
   git add data/blog-translate-output.json
   git commit -m "chore(translate): blog translated N tutorials"
   git push origin HEAD:main
   ```

## Reescritura editorial (NO traducción literal)

- Tono: español Chile maker-friendly. Usar **tú** (no vos) — público objetivo amplio.
- Adaptar:
  - "$10" → "~CLP $9.500" (conversión aproximada al CLP, mencionar "aproximado")
  - "Walmart" → mencionar tienda local cuando aplique
  - Modismos: "guys" → "amigos", "build" → "armar/construir/montar"
- Mantener: nombres técnicos (ESP32, DHT22, GPIO, etc.), código sin tocar
- Subtitle: 1 oración clara de 100-150 chars que resuma el proyecto
- Body en markdown limpio: headers ##, listas, code blocks ``` ```, links

## Detección de productos (interlinking)

Para CADA material mencionado en el tutorial, llamar:

```
buscar_productos(query="ESP32 DevKit", limit=3)
```

Si devuelve resultado con `relevancia >= 0.7`, agregar a `linked_products`:

```json
{
  "name_original": "ESP32 DevKit V1",
  "product_id": 12345,
  "product_url": "https://www.mechatronicstore.cl/producto/esp32-devkit-v1?utm_source=blog&utm_medium=tutorial&utm_campaign={slug}&utm_content=12345",
  "price_clp": 4990,
  "stock_available": true,
  "match_score": 0.85
}
```

Si NO hay match en la tienda, el material queda en `materials_list` pero SIN `product_id`/`product_url` (texto plano).

## Esquema output

```json
{
  "model": "claude-opus-4-7",
  "translated_at": "ISO 8601 UTC",
  "translations": [
    {
      "id": "fddba6920461",
      "slug": "esp32-cyd-pantalla-touchscreen-microsd",
      "title_es": "ESP32 CYD: Pantalla, touchscreen y microSD juntos",
      "subtitle_es": "Aprende a usar las 3 funciones del módulo barato Cheap Yellow Display sin conflicto.",
      "hero_image_url": "https://randomnerdtutorials.com/wp-content/uploads/.../hero.jpg",
      "body_es": "## Paso 1: Conexiones\n\n...markdown completo en español...",

      "materials_list": [
        {"name": "ESP32-2432S028R (CYD)", "qty": 1, "role": "core"},
        {"name": "Cable USB-C", "qty": 1, "role": "alimentación"},
        {"name": "Tarjeta microSD 8GB+", "qty": 1, "role": "almacenamiento"}
      ],

      "steps": [
        {"position": 1, "name": "Conexiones físicas", "text": "...", "image_url": "..."},
        {"position": 2, "name": "Setup IDE Arduino", "text": "..."}
      ],

      "code_blocks": [
        {"lang": "cpp", "caption": "Setup pantalla", "code": "#include <TFT_eSPI.h>\n..."}
      ],

      "linked_products": [
        {
          "name_original": "ESP32-2432S028R (CYD)",
          "product_id": 12345,
          "product_url": "https://www.mechatronicstore.cl/producto/esp32-cyd?utm_source=blog&utm_medium=tutorial&utm_campaign=esp32-cyd-pantalla-touchscreen-microsd&utm_content=12345",
          "price_clp": 12990,
          "stock_available": true,
          "match_score": 0.92
        }
      ],

      "github_url": "https://github.com/RandomNerdTutorials/...",
      "download_urls": [
        {"label": "Código completo (.zip)", "url": "...", "kind": "zip"}
      ],

      "category": "esp32",
      "difficulty": "intermediate",
      "estimated_time_minutes": 60,
      "estimated_cost_clp": 18990,
      "tags": ["esp32", "tft", "touchscreen", "microsd", "tutorial"]
    }
  ]
}
```

## Reglas estrictas

- `slug`: kebab-case en ESPAÑOL (no inglés), max 70 chars. SIN sufijo hash
  (`-abc123`) ni sufijo `-1`/`-2` — usá título limpio. Si hay colisión,
  parchá el título (e.g. agregar "con ESP32" o el componente principal).
  Ejemplo BUENO: `esp32-tm1637-temperatura-weatherapi-display-7-segmentos`
  Ejemplo MALO: `mit-green-building-neopixel-tetris-4fbf47` (con hash sufijo)
- `subtitle_es`: 100-150 chars (importante SEO)
- `body_es`: markdown limpio sin HTML, code blocks con lang hint
- `hero_image_url`: OBLIGATORIO. Buscar en input ingest `main_image_url` o
  re-extraer og:image del `source_url`. Si NO hay og:image, usar la primera
  imagen grande (>800x450) del body. NULL solo si genuinamente no hay imagen.
- `materials_list` SIEMPRE ≥ 1 item
- `steps` ≥ 3 (sintetizar si tutorial tiene menos). Cada step puede tener
  `image_url` opcional si el tutorial original muestra foto del paso.
- `code_blocks`: solo código real
- `linked_products`: SOLO con `match_score ≥ 0.7`
- `category` ∈ {"arduino", "esp32", "rpi", "robotica", "sensores", "3d", "otros"}
- `difficulty` ∈ {"beginner", "intermediate", "advanced"}
- `estimated_time_minutes`: tiempo EJECUCIÓN (no lectura)
- `estimated_cost_clp`: suma de prices linked_products + estimación no-linked
- `tags`: 3-7 keywords técnicas en español o inglés según uso común
  (ej. "esp32", "tm1637", "weatherapi", "display"). NO repetir el slug.

## Push DIRECTO a main (no PR)

CCR cambió default a "PR mode". Sin destino explícito, crea branch claude/* + PR.
Eso ROMPE el pipeline.

USAR LITERALMENTE:
```
git push origin HEAD:main
```

## Trigger ID asignado

`trig_012SUx3X96ndwjTdzWs4RKZp` — creado 17-may-2026 vía RemoteTrigger.
