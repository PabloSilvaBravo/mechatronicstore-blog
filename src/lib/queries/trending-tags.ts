import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export interface Tag {
  slug: string;
  name: string;
  count: number;
}

export interface FeaturedTutorial {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  category: string;
}

/**
 * Devuelve los top N tags más usados across tutoriales published,
 * extraídos de la columna `tags_json` (JSON array) via json_each.
 * Slug derivado del tag lowercase + dashes.
 */
export async function getTopBlogTags(limit = 20): Promise<Tag[]> {
  const res = await client.execute({
    sql: `
      SELECT je.value AS name, COUNT(*) AS cnt
        FROM tutorials t, json_each(t.tags_json) je
       WHERE t.status = 'published'
         AND t.tags_json IS NOT NULL
         AND t.tags_json != ''
       GROUP BY je.value
       ORDER BY cnt DESC
       LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => {
    const name = String(r.name || "").trim();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { slug, name, count: Number(r.cnt) };
  });
}

/**
 * Tutorial más reciente de cada categoría (para mega-menu).
 */
export async function getFeaturedPerCategory(
  cats: readonly string[],
): Promise<Record<string, FeaturedTutorial | null>> {
  const out: Record<string, FeaturedTutorial | null> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT id, slug, title_es AS title, hero_image_url AS image, category
          FROM tutorials
         WHERE status = 'published' AND category = ?
         ORDER BY published_at DESC
         LIMIT 1
      `,
      args: [cat],
    });
    const r = res.rows[0];
    out[cat] = r
      ? {
          id: String(r.id),
          slug: String(r.slug),
          title: String(r.title || ""),
          image: r.image ? String(r.image) : null,
          category: String(r.category),
        }
      : null;
  }
  return out;
}

/**
 * MACRO-SUBMENUS — para los dropdowns de las 4 macro-categorias del header.
 *
 * Pablo 25-may-2026 audit: la version anterior usaba mega-menus 2-col
 * con "Subtemas" (top tags) + "Featured" (tutorial reciente). Para las
 * macro-categorias devolvian dropdown VACIO porque consultaban
 * `WHERE category = 'electronica'` que no existe en DB literal.
 *
 * Solucion: dropdown SIMPLE 1-col con sub-categorias/tags reales y conteo.
 *
 *   ELECTRONICA  → sub-categorias reales (arduino, esp32, rpi, sensores, otros)
 *   ROBOTICA     → robotica
 *   DOMOTICA     → tags top del pool (homekit, iot, mqtt, home-assistant, alexa)
 *   TELEMATICA   → tags top del pool (wifi, ble, esp-now, wireless, lora)
 *
 * Click en cada item: /blog/categoria/{slug} si type=category,
 * /blog/tag/{slug} si type=tag.
 */
export interface MacroSubmenuItem {
  slug: string;
  label: string;
  count: number;
  type: "category" | "tag";
}

/**
 * Pablo 26-may-2026: expandido cada macro con MAS items (mix categorias +
 * tags) para que los dropdowns no se vean vacios. Los items con count=0
 * se filtran al final. Se incluyen items con generosa selectividad
 * porque la lista crece naturalmente con mas tutoriales.
 */
type SubmenuItemConfig = {
  slug: string;
  label: string;
  source: "category" | "tag";
};

const MACRO_SUBMENU_CONFIG: Record<string, SubmenuItemConfig[]> = {
  electronica: [
    // Sub-categorias DB
    { slug: "arduino", label: "Arduino", source: "category" },
    { slug: "esp32", label: "ESP32", source: "category" },
    { slug: "rpi", label: "Raspberry Pi", source: "category" },
    { slug: "sensores", label: "Sensores", source: "category" },
    { slug: "otros", label: "Otros", source: "category" },
    // Plataformas y dialectos (tags)
    { slug: "esp32-s3", label: "ESP32-S3", source: "tag" },
    { slug: "rp2040", label: "RP2040", source: "tag" },
    { slug: "micropython", label: "MicroPython", source: "tag" },
    { slug: "circuitpython", label: "CircuitPython", source: "tag" },
  ],
  robotica: [
    { slug: "robotica", label: "Robotica", source: "category" },
    { slug: "wearable", label: "Wearables", source: "tag" },
    { slug: "audio", label: "Audio", source: "tag" },
    { slug: "display", label: "Display", source: "tag" },
    { slug: "oled", label: "OLED", source: "tag" },
    { slug: "matriz-led", label: "Matriz LED", source: "tag" },
    { slug: "led-matrix", label: "LED Matrix", source: "tag" },
    { slug: "neopixel", label: "NeoPixel", source: "tag" },
    { slug: "tm1637", label: "TM1637", source: "tag" },
    { slug: "7-segmentos", label: "7 Segmentos", source: "tag" },
    { slug: "led", label: "LED", source: "tag" },
    { slug: "rgb", label: "RGB", source: "tag" },
  ],
  domotica: [
    { slug: "homekit", label: "HomeKit", source: "tag" },
    { slug: "iot", label: "IoT", source: "tag" },
    { slug: "mqtt", label: "MQTT", source: "tag" },
    { slug: "home-assistant", label: "Home Assistant", source: "tag" },
    { slug: "alexa", label: "Alexa", source: "tag" },
    { slug: "ota", label: "OTA", source: "tag" },
    { slug: "lifecycle-manager", label: "Lifecycle Mgr", source: "tag" },
    { slug: "datalogger", label: "Datalogger", source: "tag" },
    { slug: "bme280", label: "BME280", source: "tag" },
    { slug: "microsd", label: "MicroSD", source: "tag" },
    { slug: "domotica", label: "Domotica", source: "tag" },
  ],
  telematica: [
    { slug: "wifi", label: "WiFi", source: "tag" },
    { slug: "ble", label: "Bluetooth LE", source: "tag" },
    { slug: "bluetooth", label: "Bluetooth", source: "tag" },
    { slug: "esp-now", label: "ESP-NOW", source: "tag" },
    { slug: "wireless", label: "Wireless", source: "tag" },
    { slug: "web-server", label: "Web Server", source: "tag" },
    { slug: "lora", label: "LoRa", source: "tag" },
    { slug: "http", label: "HTTP", source: "tag" },
    { slug: "api", label: "API", source: "tag" },
    { slug: "radio", label: "Radio", source: "tag" },
    { slug: "sdr", label: "SDR", source: "tag" },
    { slug: "walkie-talkie", label: "Walkie Talkie", source: "tag" },
  ],
};

export async function getMacroSubmenus(): Promise<
  Record<string, MacroSubmenuItem[]>
> {
  // 1 query para conteos por categoria
  const catRes = await client.execute({
    sql: `
      SELECT category, COUNT(*) AS cnt
        FROM tutorials
       WHERE status = 'published' AND category IS NOT NULL
       GROUP BY category
    `,
    args: [],
  });
  const categoryCounts: Record<string, number> = {};
  for (const r of catRes.rows) {
    categoryCounts[String(r.category)] = Number(r.cnt);
  }

  // 1 query para conteos por tag (lowercase)
  const tagRes = await client.execute({
    sql: `
      SELECT lower(je.value) AS tag, COUNT(*) AS cnt
        FROM tutorials t, json_each(t.tags_json) je
       WHERE t.status = 'published'
         AND t.tags_json IS NOT NULL
         AND t.tags_json != ''
       GROUP BY lower(je.value)
    `,
    args: [],
  });
  const tagCounts: Record<string, number> = {};
  for (const r of tagRes.rows) {
    tagCounts[String(r.tag)] = Number(r.cnt);
  }

  const out: Record<string, MacroSubmenuItem[]> = {};
  for (const [macroSlug, items] of Object.entries(MACRO_SUBMENU_CONFIG)) {
    const filled: MacroSubmenuItem[] = [];
    for (const it of items) {
      // Pablo 26-may-2026: source declarado por item (no por macro) para
      // mezclar categorias DB + tags en la misma macro - mas items potenciales.
      const count =
        it.source === "category"
          ? categoryCounts[it.slug] || 0
          : tagCounts[it.slug.toLowerCase()] || 0;
      if (count > 0) {
        filled.push({
          slug: it.slug,
          label: it.label,
          count,
          type: it.source,
        });
      }
    }
    // Ordenar por count desc para que los items mas poblados aparezcan
    // arriba (mejor jerarquia visual).
    filled.sort((a, b) => b.count - a.count);
    out[macroSlug] = filled;
  }
  return out;
}

/**
 * Top N tags por categoría (para mega-menu).
 */
export async function getTagsPerCategory(
  cats: readonly string[],
  perCat = 6,
): Promise<Record<string, Tag[]>> {
  const out: Record<string, Tag[]> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT je.value AS name, COUNT(*) AS cnt
          FROM tutorials t, json_each(t.tags_json) je
         WHERE t.status = 'published' AND t.category = ?
           AND t.tags_json IS NOT NULL
           AND t.tags_json != ''
         GROUP BY je.value
         ORDER BY cnt DESC
         LIMIT ?
      `,
      args: [cat, perCat],
    });
    out[cat] = res.rows.map((r) => {
      const name = String(r.name || "").trim();
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return { slug, name, count: Number(r.cnt) };
    });
  }
  return out;
}
