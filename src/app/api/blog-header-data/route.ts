import { NextResponse } from "next/server";
import {
  getTopBlogTags,
  getFeaturedPerCategory,
  getTagsPerCategory,
  type Tag,
  type FeaturedTutorial,
} from "@/lib/queries/trending-tags";
import { BLOG_CATEGORIES } from "@/lib/blog-categories";

export const dynamic = "force-static";
export const revalidate = 1800; // 30 min

export interface BlogHeaderData {
  topTags: Tag[];
  categories: Record<
    string,
    { topTags: Tag[]; featured: FeaturedTutorial | null }
  >;
}

export async function GET() {
  try {
    const [topTags, perCatTags, featured] = await Promise.all([
      getTopBlogTags(20),
      getTagsPerCategory(BLOG_CATEGORIES, 6),
      getFeaturedPerCategory(BLOG_CATEGORIES),
    ]);

    const categories: BlogHeaderData["categories"] = {};
    for (const cat of BLOG_CATEGORIES) {
      categories[cat] = {
        topTags: perCatTags[cat] || [],
        featured: featured[cat] || null,
      };
    }

    const payload: BlogHeaderData = { topTags, categories };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("[blog-header-data] error:", e);
    return NextResponse.json(
      { topTags: [], categories: {} } satisfies BlogHeaderData,
      { status: 200 },
    );
  }
}
