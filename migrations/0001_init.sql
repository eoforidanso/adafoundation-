-- Content managed from the /admin dashboard.
CREATE TABLE directors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Director',
  photo TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',
  credit_url TEXT NOT NULL DEFAULT '',
  placement TEXT NOT NULL DEFAULT 'gallery', -- gallery | hero | hidden
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'target', -- target | achieved
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  item_date TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE volunteers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | archived
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX volunteers_ip ON volunteers (ip_hash, created_at);

CREATE TABLE donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL,
  gift_date TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'Zelle',
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE login_attempts (
  ip_hash TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX login_attempts_ip ON login_attempts (ip_hash, at);
