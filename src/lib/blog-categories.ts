/**
 * Categorias visibles en el header del blog. Pablo 25-may-2026:
 * curadas a 4 verticales que matchean el catalogo del store y el publico
 * tecnico chileno: Electronica, Robotica, Domotica, Telematica.
 *
 * Las strings SON el valor literal de `tutorials.category` en la DB.
 * Si un tutorial usa otra categoria (legacy: "Microcontrollers", "Sensors",
 * "IoT", "3D Printing", "Maker"), no aparece en mega-menu pero sigue siendo
 * accesible via /blog/tag/{slug} y home feed.
 */
export const BLOG_CATEGORIES = [
  "Electronica",
  "Robotica",
  "Domotica",
  "Telematica",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  Electronica: "Electronica",
  Robotica: "Robotica",
  Domotica: "Domotica",
  Telematica: "Telematica",
};

export const BLOG_CATEGORY_SLUGS: Record<string, string> = {
  Electronica: "electronica",
  Robotica: "robotica",
  Domotica: "domotica",
  Telematica: "telematica",
};
