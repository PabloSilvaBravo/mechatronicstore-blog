import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

/**
 * Pablo 16-may: lazy init para no romper build cuando TURSO_DATABASE_URL
 * no está en el env (e.g., Vercel build inicial sin env vars). El error
 * solo se tira al primer uso del client, no al import.
 */
let _client: Client | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

// Backwards-compat exports (preferir getClient() / getDb() en código nuevo)
export const client = new Proxy({} as Client, {
  get(_, prop) {
    return getClient()[prop as keyof Client];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export * from "./schema";
