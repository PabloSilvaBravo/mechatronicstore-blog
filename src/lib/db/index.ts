import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

/**
 * Pablo 16-may: lazy init para no romper build cuando TURSO_DATABASE_URL
 * no está en el env (e.g., Vercel build inicial sin env vars). El error
 * solo se tira al primer uso del client, no al import.
 *
 * IMPORTANTE: NO usamos Proxy aquí porque rompe el binding del `this`
 * en el cliente libsql (tiene private members con #). Usar las funciones
 * `getClient()` / `getDb()` directamente en el código.
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

export * from "./schema";
