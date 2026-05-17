import { describe, it, expect, vi } from "vitest";

// Mock db ANTES de importar el route — el endpoint hace fire-and-forget
// y catchea errores, pero no queremos depender de TURSO_DATABASE_URL en tests.
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: async () => ({ rowsAffected: 1 }),
    }),
  }),
  tutorialProductClicks: {},
}));

const { POST } = await import("@/app/api/blog/track/click/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/blog/track/click", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/blog/track/click", () => {
  it("returns 204 on valid material_list click", async () => {
    const res = await POST(makeRequest({
      slug: "test-tutorial",
      source: "material_list",
      product_id: "PROD123",
      product_name: "ESP32 DevKit",
      ref_url: "https://www.mechatronicstore.cl/producto/esp32",
    }));
    expect(res.status).toBe(204);
  });

  it("returns 400 on missing slug", async () => {
    const res = await POST(makeRequest({ source: "buy_all" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid source", async () => {
    const res = await POST(makeRequest({
      slug: "x",
      source: "spam_value_not_allowed",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 204 on buy_all sin product_id", async () => {
    const res = await POST(makeRequest({
      slug: "test-tutorial",
      source: "buy_all",
    }));
    expect(res.status).toBe(204);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/blog/track/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("truncates extremely long values without throwing", async () => {
    const res = await POST(makeRequest({
      slug: "x".repeat(500),
      source: "material_list",
      product_id: "p".repeat(200),
      product_name: "n".repeat(500),
      ref_url: "https://x.com/?" + "a".repeat(3000),
    }));
    expect(res.status).toBe(204);
  });
});
