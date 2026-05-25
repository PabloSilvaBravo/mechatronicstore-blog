/**
 * Categorías visibles en el header del blog. El orden define qué
 * categorías aparecen como mega-menu en desktop (top 3 por defecto)
 * y como links en el drawer mobile.
 */
export const BLOG_CATEGORIES = [
  "Microcontrollers",
  "Sensors",
  "Robotics",
  "IoT",
  "3D Printing",
  "Maker",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  Microcontrollers: "Microcontroladores",
  Sensors: "Sensores",
  Robotics: "Robótica",
  IoT: "IoT",
  "3D Printing": "Impresión 3D",
  Maker: "Maker",
};

export const BLOG_CATEGORY_SLUGS: Record<string, string> = {
  Microcontrollers: "microcontroladores",
  Sensors: "sensores",
  Robotics: "robotica",
  IoT: "iot",
  "3D Printing": "impresion-3d",
  Maker: "maker",
};
