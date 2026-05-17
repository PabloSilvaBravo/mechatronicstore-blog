import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Tabla `tutorials` — datos editoriales completos de cada tutorial.
 * Refleja el spec sec 3.4: extracción estructurada del LLM.
 *
 * Status flow:
 *   draft → ranked → translating → published | rejected
 */
export const tutorials = sqliteTable("tutorials", {
  // Identidad
  id: text("id").primaryKey(),                              // 12-char hex hash
  slug: text("slug").notNull().unique(),                    // url-safe slug ES
  source_id: text("source_id").notNull(),                   // FK a sources.id
  source_url: text("source_url").notNull(),                 // URL original

  // Contenido original (EN)
  title_en: text("title_en"),
  subtitle_en: text("subtitle_en"),
  body_en: text("body_en"),

  // Contenido traducido/reescrito (ES-CL)
  title_es: text("title_es"),
  subtitle_es: text("subtitle_es"),
  body_es: text("body_es"),

  // Estructura extraída por LLM
  materials_list_json: text("materials_list_json"),         // JSON: [{name, qty, role, product_id?}]
  steps_json: text("steps_json"),                           // JSON: [{position, name, text, image_url?}]
  code_blocks_json: text("code_blocks_json"),               // JSON: [{lang, code, caption?}]
  linked_products_json: text("linked_products_json"),       // JSON: [{name, product_id, url, price_clp, stock}]
  github_url: text("github_url"),                           // Si el tutorial linkea GitHub
  download_urls_json: text("download_urls_json"),           // JSON: [{label, url, kind}]

  // Imagen
  hero_image_url: text("hero_image_url"),                   // R2 URL

  // Metadata editorial
  category: text("category"),                                // arduino|esp32|rpi|robotica|sensores|3d|otros
  difficulty: text("difficulty"),                           // beginner|intermediate|advanced
  estimated_time_minutes: integer("estimated_time_minutes"),
  estimated_cost_clp: integer("estimated_cost_clp"),
  tags_json: text("tags_json"),                             // JSON string array

  // Scoring editorial (7 dimensiones + combinado)
  cs_pedagogy: real("cs_pedagogy"),
  cs_code_quality: real("cs_code_quality"),
  cs_materials_clarity: real("cs_materials_clarity"),
  cs_step_completeness: real("cs_step_completeness"),
  cs_image_quality: real("cs_image_quality"),
  cs_relevance_to_store_catalog: real("cs_relevance_to_store_catalog"),
  cs_novelty: real("cs_novelty"),
  combined_score: real("combined_score"),                   // weighted avg, threshold 0.78

  // Flags
  is_blocked: integer("is_blocked", { mode: "boolean" }).default(false),
  blocked_reason: text("blocked_reason"),

  // Status
  status: text("status").notNull().default("draft"),        // draft|ranked|translating|published|rejected
  rejected_reason: text("rejected_reason"),

  // Editor humano (E-E-A-T)
  editor_id: text("editor_id"),                             // FK editors.id
  editor_byline: text("editor_byline"),

  // Timestamps (formato SQLite "YYYY-MM-DD HH:MM:SS" UTC — lección de mechanews)
  ingested_at: text("ingested_at").default(sql`(datetime('now'))`),
  ranked_at: text("ranked_at"),
  translated_at: text("translated_at"),
  published_at: text("published_at"),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export type Tutorial = typeof tutorials.$inferSelect;
export type NewTutorial = typeof tutorials.$inferInsert;

/**
 * Tabla `sources` — configuración de cada feed RSS/HTML que ingesta tutoriales.
 *
 * `parser_id` indica qué módulo Python procesa esta fuente:
 *   - "generic_rss"        → scripts/sources/generic_rss.py
 *   - "instructables"      → scripts/sources/instructables.py
 *   - "adafruit_learn"     → scripts/sources/adafruit_learn.py
 *   - "sparkfun"           → scripts/sources/sparkfun.py
 *   - "all_about_circuits" → scripts/sources/all_about_circuits.py
 */
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),                              // slug: "instructables", "hackaday-howto"
  name: text("name").notNull(),                             // display name
  feed_url: text("feed_url").notNull(),                     // RSS feed o página listing
  homepage: text("homepage").notNull(),                     // landing URL para atribución
  parser_id: text("parser_id").notNull(),                   // qué parser Python aplica
  tier: integer("tier").notNull().default(1),               // 1 (top) o 2 (secondary)

  // Operación
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  last_polled_at: text("last_polled_at"),
  last_success_at: text("last_success_at"),
  consecutive_failures: integer("consecutive_failures").default(0),

  // Metadatos
  created_at: text("created_at").default(sql`(datetime('now'))`),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

/**
 * Tabla `tutorial_product_clicks` — fire-and-forget tracking de clicks
 * desde MaterialsList / BuyAllButton hacia páginas de producto de la tienda.
 *
 * Spec sec 4.4: data anonimizada. No guardamos IP ni user agent — solo
 * registramos el evento para construir el funnel tutorial→tienda.
 *
 * Source values:
 *   - "material_list" → click en botón individual "Agregar al carrito"
 *   - "buy_all"       → click en CTA "Comprar todo"
 *   - "inline"        → click en link de paso (reservado, no usado en MVP)
 */
export const tutorialProductClicks = sqliteTable("tutorial_product_clicks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tutorial_slug: text("tutorial_slug").notNull(),
  product_id: text("product_id"),                            // SKU si conocido, NULL si link general
  product_name: text("product_name"),                        // display name del material
  source: text("source").notNull(),                          // material_list | buy_all | inline
  ref_url: text("ref_url"),                                  // URL destino con UTMs
  clicked_at: text("clicked_at").default(sql`(datetime('now'))`).notNull(),
});

export type TutorialProductClick = typeof tutorialProductClicks.$inferSelect;
export type NewTutorialProductClick = typeof tutorialProductClicks.$inferInsert;
