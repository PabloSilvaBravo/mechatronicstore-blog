-- Migración manual: tutorial_product_clicks (Week 6)
-- Aplicar via: turso db shell mechatronicstore-blog-db < src/lib/db/migrations/0001_tutorial_product_clicks.sql

CREATE TABLE IF NOT EXISTS tutorial_product_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutorial_slug TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  source TEXT NOT NULL,
  ref_url TEXT,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tpc_slug ON tutorial_product_clicks(tutorial_slug);
CREATE INDEX IF NOT EXISTS idx_tpc_clicked ON tutorial_product_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_tpc_product ON tutorial_product_clicks(product_id);
