// Schema migrations, applied in order at first use (see lib/db.ts). SQLite / libSQL (Turso) dialect.
// Money is always integer cents. Times are ISO strings: UTC instants (created_at etc.) or local wall-clock
// 'YYYY-MM-DDTHH:mm' for event times (the event's timezone is stored next to it).
export const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: 'init',
    sql: `
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  starts_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  venue TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ticket_types (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 50),
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 1),
  max_per_order INTEGER NOT NULL DEFAULT 6 CHECK (max_per_order >= 1),
  sales_open TEXT,
  sales_close TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  sort INTEGER NOT NULL DEFAULT 0,
  CHECK (enabled = 0 OR (price_cents IS NOT NULL AND capacity IS NOT NULL))
);
CREATE INDEX ticket_types_event ON ticket_types(event_id);

CREATE TABLE deposit_offers (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 50),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  sort INTEGER NOT NULL DEFAULT 0,
  CHECK (enabled = 0 OR amount_cents IS NOT NULL)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('ticket','deposit','donation')),
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('held','paid','expired','refunded')),
  email TEXT,
  name TEXT,
  amount_cents INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX orders_status ON orders(status);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id TEXT REFERENCES ticket_types(id),
  deposit_offer_id TEXT REFERENCES deposit_offers(id),
  qty INTEGER NOT NULL CHECK (qty >= 1),
  unit_cents INTEGER NOT NULL
);
CREATE INDEX order_items_order ON order_items(order_id);
CREATE INDEX order_items_ticket_type ON order_items(ticket_type_id);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id TEXT NOT NULL REFERENCES ticket_types(id),
  code TEXT NOT NULL UNIQUE,
  holder_name TEXT,
  checked_in_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
  },
];
