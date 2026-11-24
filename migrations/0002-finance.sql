CREATE TABLE envelopes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  budget_in_cents INTEGER NOT NULL CHECK (budget_in_cents > 0),
  is_fixed INTEGER NOT NULL CHECK (is_fixed IN (0, 1)),
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'saving')),
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents > 0),
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  envelope_id TEXT REFERENCES envelopes (id),
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK ((kind = 'expense') = (envelope_id IS NOT NULL))
);

CREATE INDEX transactions_date ON transactions (date);

-- Uma linha só (id 1). Sem a linha, o saldo inicial ainda não foi informado.
CREATE TABLE account_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  opening_balance_in_cents INTEGER NOT NULL CHECK (opening_balance_in_cents >= 0),
  updated_at TEXT NOT NULL
);

-- Envelopes que o app já traz (BR-F01); os valores são de exemplo.
INSERT INTO envelopes (id, name, budget_in_cents, is_fixed, updated_at) VALUES
  ('housing', 'Moradia', 220000, 1, '2026-11-23T00:00:00.000Z'),
  ('groceries', 'Mercado', 110000, 0, '2026-11-23T00:00:00.000Z'),
  ('transport', 'Transporte', 45000, 0, '2026-11-23T00:00:00.000Z'),
  ('leisure', 'Lazer', 40000, 0, '2026-11-23T00:00:00.000Z'),
  ('health', 'Saúde', 30000, 0, '2026-11-23T00:00:00.000Z'),
  ('subscriptions', 'Assinaturas', 15000, 0, '2026-11-23T00:00:00.000Z'),
  ('dining', 'Restaurantes', 45000, 0, '2026-11-23T00:00:00.000Z');
