import { NextResponse } from "next/server";

/**
 * Manifest PWA del blog. Se sirve en /blog/manifest.webmanifest (el blog Next
 * app vive bajo /blog/* via Cloudflare Worker route — todos los paths de la
 * PWA deben estar bajo /blog/* para que el worker los enrute correctamente).
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      name: "MechatronicStore Blog",
      short_name: "MechaBlog",
      description:
        "Tutoriales tecnicos de electronica, robotica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
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
        { src: "/blog/icons/icon-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/blog/icons/icon-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/blog/icons/icon-maskable-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/blog/icons/icon-maskable-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Inicio", short_name: "Inicio", description: "Ultimos tutoriales", url: "/blog" },
        { name: "Buscar", short_name: "Buscar", description: "Buscar tutoriales", url: "/blog/tutoriales" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
