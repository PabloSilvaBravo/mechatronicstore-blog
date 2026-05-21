-- Pablo 21-may-2026 Tier A: newsletter_subscribers
-- Captura emails desde el footer del blog para el weekly digest (Routine F).
-- Dedup por email (unique). `unsubscribed_at` permite soft delete sin
-- perder histórico.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  source          TEXT NOT NULL DEFAULT 'footer',
  subscribed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  user_agent      TEXT,
  ip_hash         TEXT
);

CREATE INDEX IF NOT EXISTS idx_newsletter_active
  ON newsletter_subscribers(email)
  WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at
  ON newsletter_subscribers(subscribed_at DESC);
