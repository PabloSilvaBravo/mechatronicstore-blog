#!/usr/bin/env node
/**
 * scripts/deploy-worker.mjs
 *
 * Deploy el worker `proxy-blog` a Cloudflare via REST API + crea las
 * routes mechatronicstore.cl/blog* → proxy-blog (y variantes).
 *
 * Lee credenciales de .env.local:
 *   CLOUDFLARE_API_TOKEN (con scopes Workers Scripts:Edit + Workers Routes:Edit)
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_ZONE_ID (mechatronicstore.cl)
 *
 * Idempotente — re-ejecutable.
 *
 * Pablo 16-may-2026.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Carga manual de .env.local (sin dotenv para evitar dep extra)
const envPath = resolve(ROOT, ".env.local");
const envText = readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const TOKEN = env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = env.CLOUDFLARE_ACCOUNT_ID;
const ZONE = env.CLOUDFLARE_ZONE_ID;
const WORKER_NAME = "proxy-blog";

if (!TOKEN || !ACCOUNT || !ZONE) {
  console.error("ERROR: faltan CLOUDFLARE_* vars en .env.local");
  process.exit(1);
}

const workerSource = readFileSync(
  resolve(ROOT, "src/workers/proxy-blog.js"),
  "utf8",
);

// ─────────────────────────────────────────────────────
// 1. Upload script
// ─────────────────────────────────────────────────────
console.log(`\n[1/3] Uploading worker ${WORKER_NAME}...`);

const metadata = {
  main_module: "index.js",
};

const boundary = "----formdata-" + Math.random().toString(36).slice(2);
const body =
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="metadata"\r\n` +
  `Content-Type: application/json\r\n\r\n` +
  JSON.stringify(metadata) +
  `\r\n--${boundary}\r\n` +
  `Content-Disposition: form-data; name="index.js"; filename="index.js"\r\n` +
  `Content-Type: application/javascript+module\r\n\r\n` +
  workerSource +
  `\r\n--${boundary}--\r\n`;

const uploadResp = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER_NAME}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  },
);

const uploadJson = await uploadResp.json();
if (!uploadJson.success) {
  console.error("✗ Upload failed:", JSON.stringify(uploadJson.errors, null, 2));
  process.exit(1);
}
console.log("✓ Worker uploaded:", uploadJson.result.id);

// ─────────────────────────────────────────────────────
// 2. Crear/verificar routes
// ─────────────────────────────────────────────────────
const PATTERNS = [
  "mechatronicstore.cl/blog*",
  "www.mechatronicstore.cl/blog*",
  "mechatronicstore.cl/api/blog*",
  "www.mechatronicstore.cl/api/blog*",
  "mechatronicstore.cl/admin/blog*",
  "www.mechatronicstore.cl/admin/blog*",
];

console.log(`\n[2/3] Verificando ${PATTERNS.length} routes...`);

const listResp = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes`,
  { headers: { Authorization: `Bearer ${TOKEN}` } },
);
const listJson = await listResp.json();
const existing = new Map(
  (listJson.result || []).map((r) => [r.pattern, r]),
);

for (const pattern of PATTERNS) {
  if (existing.has(pattern)) {
    const r = existing.get(pattern);
    if (r.script === WORKER_NAME) {
      console.log(`  ✓ ${pattern} → ${WORKER_NAME} (exists)`);
    } else {
      const updResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes/${r.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pattern, script: WORKER_NAME }),
        },
      );
      const updJson = await updResp.json();
      if (updJson.success) {
        console.log(`  ✓ ${pattern} → ${WORKER_NAME} (updated from ${r.script})`);
      } else {
        console.error(`  ✗ Failed to update ${pattern}:`, updJson.errors);
      }
    }
  } else {
    const createResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pattern, script: WORKER_NAME }),
      },
    );
    const createJson = await createResp.json();
    if (createJson.success) {
      console.log(`  ✓ ${pattern} → ${WORKER_NAME} (created)`);
    } else {
      console.error(`  ✗ Failed to create ${pattern}:`, createJson.errors);
    }
  }
}

// ─────────────────────────────────────────────────────
// 3. Summary
// ─────────────────────────────────────────────────────
console.log(`\n[3/3] ✓ Deploy completo`);
console.log(`Worker: ${WORKER_NAME}`);
console.log(`Routes: ${PATTERNS.length} configuradas en mechatronicstore.cl`);
console.log(`\nTest:`);
console.log(`  curl -I https://www.mechatronicstore.cl/blog`);
console.log(`  curl -I https://www.mechatronicstore.cl/api/blog/health`);
