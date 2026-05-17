import { describe, it, expect, vi } from "vitest";

// Mock libsql client — devuelve rows determinísticos
vi.mock("@/lib/db", () => ({
  getClient: () => ({
    execute: async ({ sql, args }: { sql: string; args: unknown[] }) => {
      // Devolver shape distinta según SQL para cubrir cada helper
      if (sql.includes("LEFT JOIN tutorials")) {
        return {
          rows: [
            { slug: "tut-a", title: "Tutorial A", clicks: 10 },
            { slug: "tut-b", title: null, clicks: 5 },
          ],
        };
      }
      if (sql.includes("MAX(product_name)") && sql.includes("LIMIT")) {
        return {
          rows: [
            { product_id: "P100", product_name: "ESP32", clicks: 7 },
          ],
        };
      }
      if (sql.includes("GROUP BY source")) {
        return {
          rows: [
            { source: "material_list", clicks: 14 },
            { source: "buy_all", clicks: 3 },
          ],
        };
      }
      if (sql.includes("ORDER BY clicked_at DESC")) {
        return {
          rows: [
            {
              id: 2,
              tutorial_slug: "tut-a",
              product_id: "P100",
              product_name: "ESP32",
              source: "material_list",
              ref_url: "https://x.com",
              clicked_at: "2026-05-17 12:00:00",
            },
            {
              id: 1,
              tutorial_slug: "tut-a",
              product_id: null,
              product_name: null,
              source: "buy_all",
              ref_url: null,
              clicked_at: "2026-05-17 11:00:00",
            },
          ],
        };
      }
      if (sql.includes("COUNT(*) AS total")) {
        return { rows: [{ total: 42 }] };
      }
      return { rows: [] };
    },
  }),
}));

const {
  topTutorialsByClicks,
  topProductsByClicks,
  clicksBySource,
  recentClicks,
  totalClicksBetween,
} = await import("@/lib/db/conversion-queries");

describe("conversion-queries", () => {
  it("topTutorialsByClicks maps slug+title+clicks correctly, including null title", async () => {
    const r = await topTutorialsByClicks(30, 10);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ slug: "tut-a", title: "Tutorial A", clicks: 10 });
    expect(r[1]).toEqual({ slug: "tut-b", title: null, clicks: 5 });
  });

  it("topProductsByClicks returns product shape", async () => {
    const r = await topProductsByClicks(30, 10);
    expect(r).toEqual([
      { product_id: "P100", product_name: "ESP32", clicks: 7 },
    ]);
  });

  it("clicksBySource groups by source", async () => {
    const r = await clicksBySource(30);
    expect(r).toEqual([
      { source: "material_list", clicks: 14 },
      { source: "buy_all", clicks: 3 },
    ]);
  });

  it("recentClicks returns ordered by clicked_at DESC with null product_id", async () => {
    const r = await recentClicks(50);
    expect(r).toHaveLength(2);
    expect(r[0].clicked_at >= r[1].clicked_at).toBe(true);
    expect(r[1].product_id).toBeNull();
  });

  it("totalClicksBetween returns numeric total", async () => {
    const r = await totalClicksBetween("2026-05-10 00:00:00", "2026-05-17 00:00:00");
    expect(r).toBe(42);
  });
});
