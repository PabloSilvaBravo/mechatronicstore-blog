import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getClient: () => ({
    execute: async ({ sql }: { sql: string }) => {
      if (sql.includes("FROM tutorials")) {
        return {
          rows: [
            {
              slug: "tut-a",
              title: "Tutorial A",
              subtitle: "subt a",
              hero_image_url: "https://r2/a.jpg",
              published_at: "2026-05-14 10:00:00",
            },
            {
              slug: "tut-b",
              title: "Tutorial B",
              subtitle: null,
              hero_image_url: null,
              published_at: "2026-05-12 10:00:00",
            },
          ],
        };
      }
      if (sql.includes("GROUP BY tutorial_slug")) {
        return {
          rows: [
            { slug: "tut-a", clicks: 5 },
            { slug: "tut-b", clicks: 1 },
          ],
        };
      }
      if (sql.includes("GROUP BY product_id")) {
        return {
          rows: [{ name: "ESP32", clicks: 4 }],
        };
      }
      return { rows: [] };
    },
  }),
}));

const {
  publishedInRange,
  clicksPerTutorialInRange,
  topProductInRange,
} = await import("@/lib/email/digest-queries");

describe("digest-queries", () => {
  const from = "2026-05-10 00:00:00";
  const to = "2026-05-17 00:00:00";

  it("publishedInRange maps title, nullable subtitle/hero", async () => {
    const r = await publishedInRange(from, to);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      slug: "tut-a",
      title: "Tutorial A",
      subtitle: "subt a",
      hero_image_url: "https://r2/a.jpg",
      published_at: "2026-05-14 10:00:00",
    });
    expect(r[1].subtitle).toBeNull();
    expect(r[1].hero_image_url).toBeNull();
  });

  it("clicksPerTutorialInRange returns Map<slug,count>", async () => {
    const r = await clicksPerTutorialInRange(from, to);
    expect(r.get("tut-a")).toBe(5);
    expect(r.get("tut-b")).toBe(1);
    expect(r.get("nonexistent")).toBeUndefined();
  });

  it("topProductInRange returns {name, clicks}", async () => {
    const r = await topProductInRange(from, to);
    expect(r).toEqual({ name: "ESP32", clicks: 4 });
  });
});
