import { NextResponse } from "next/server";
import {
  getTopBlogTags,
  getMacroSubmenus,
  type Tag,
  type MacroSubmenuItem,
} from "@/lib/queries/trending-tags";

export const dynamic = "force-static";
export const revalidate = 1800; // 30 min

/**
 * Pablo 25-may-2026 audit: simplificacion de la API tras feedback "los
 * mega-menus no tienen sentido, estan vacios".
 *
 * Antes: { topTags, categories: { [macroSlug]: { topTags: [], featured: null } } }
 *   → los mega-menus 2-col mostraban dropdown vacio para macro-cats
 *     (electronica/robotica/domotica/telematica) porque consultaban
 *     `WHERE category = 'electronica'` literal que no existe en DB.
 *
 * Ahora: { topTags, macroSubmenus: { [macroSlug]: MacroSubmenuItem[] } }
 *   → cada macro tiene su lista real de sub-categorias o tags relevantes
 *     con conteo. Dropdown SIMPLE 1-col, util y visible.
 */
export interface BlogHeaderData {
  topTags: Tag[];
  macroSubmenus: Record<string, MacroSubmenuItem[]>;
}

export async function GET() {
  try {
    const [topTags, macroSubmenus] = await Promise.all([
      getTopBlogTags(20),
      getMacroSubmenus(),
    ]);

    const payload: BlogHeaderData = { topTags, macroSubmenus };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("[blog-header-data] error:", e);
    return NextResponse.json(
      { topTags: [], macroSubmenus: {} } satisfies BlogHeaderData,
      { status: 200 },
    );
  }
}
