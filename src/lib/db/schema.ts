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
