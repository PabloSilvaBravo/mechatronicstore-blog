import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
  getClient: () => ({
    execute: async ({ args }: { sql: string; args: unknown[] }) => {
      if (args[0] === "D-517") {
        return {
          rows: [
            {
              slug: "esp32-cyd-pantalla-touchscreen-microsd-simultaneo",
              title_es: "ESP32 CYD: pantalla, touchscreen y microSD",
              subtitle_es: "Aprende a usar pantalla touchscreen...",
              hero_image_url: "https://r2/cyd.jpg",
              published_at: "2026-05-17 15:05:00",
              category: "esp32",
            },
          ],
        };
      }
      return { rows: [] };
    },
  }),
  tutorials: {},
}));

const { tutorialsByProductId } = await import("@/lib/db/queries");

describe("tutorialsByProductId", () => {
  it("returns tutorials matching a product_id", async () => {
    const r = await tutorialsByProductId("D-517", 5);
    expect(r).toHaveLength(1);
    expect(r[0].slug).toBe("esp32-cyd-pantalla-touchscreen-microsd-simultaneo");
    expect(r[0].category).toBe("esp32");
    expect(r[0].title_es).toContain("ESP32 CYD");
  });

  it("returns empty array for product without tutorials", async () => {
    const r = await tutorialsByProductId("NON-EXISTENT", 5);
    expect(r).toEqual([]);
  });

  it("respects limit param", async () => {
    const r = await tutorialsByProductId("D-517", 1);
    expect(r.length).toBeLessThanOrEqual(1);
  });
});
