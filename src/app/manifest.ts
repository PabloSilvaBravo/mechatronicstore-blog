import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MechatronicStore Blog",
    short_name: "MechaBlog",
    description:
      "Tutoriales técnicos de electrónica, robótica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
    start_url: "/blog",
    scope: "/blog",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0E0F14",
    theme_color: "#0E0F14",
    lang: "es-CL",
    dir: "ltr",
    categories: ["education", "technology", "diy"],
    icons: [
      { src: "/icons/icon-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Inicio",       short_name: "Inicio",    description: "Últimos tutoriales",       url: "/blog" },
      { name: "Categorías",   short_name: "Cats",      description: "Explorar por categoría",   url: "/blog/categorias" },
      { name: "Buscar",       short_name: "Buscar",    description: "Buscar tutoriales",        url: "/blog/buscar" },
    ],
  };
}
