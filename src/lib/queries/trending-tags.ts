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

const MACRO_SUBMENU_CONFIG: Record<
  string,
  { type: "category" | "tag"; items: { slug: string; label: string }[] }
> = {
  electronica: {
    type: "category",
    items: [
      { slug: "arduino", label: "Arduino" },
      { slug: "esp32", label: "ESP32" },
      { slug: "rpi", label: "Raspberry Pi" },
      { slug: "sensores", label: "Sensores" },
      { slug: "otros", label: "Otros" },
    ],
  },
  robotica: {
    type: "category",
    items: [{ slug: "robotica", label: "Robotica" }],
  },
  domotica: {
    type: "tag",
    items: [
      { slug: "homekit", label: "HomeKit" },
      { slug: "iot", label: "IoT" },
      { slug: "mqtt", label: "MQTT" },
      { slug: "home-assistant", label: "Home Assistant" },
      { slug: "alexa", label: "Alexa" },
    ],
  },
  telematica: {
    type: "tag",
    items: [
      { slug: "wifi", label: "WiFi" },
      { slug: "ble", label: "Bluetooth LE" },
      { slug: "esp-now", label: "ESP-NOW" },
      { slug: "wireless", label: "Wireless" },
      { slug: "lora", label: "LoRa" },
    ],
  },
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
  for (const [macroSlug, config] of Object.entries(MACRO_SUBMENU_CONFIG)) {
    const items: MacroSubmenuItem[] = [];
    for (const it of config.items) {
      const count =
        config.type === "category"
          ? categoryCounts[it.slug] || 0
          : tagCounts[it.slug.toLowerCase()] || 0;
      if (count > 0) {
        items.push({
          slug: it.slug,
          label: it.label,
          count,
          type: config.type,
        });
      }
    }
    out[macroSlug] = items;
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
