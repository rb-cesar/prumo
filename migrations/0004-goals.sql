-- Metas de guardar (doc/business-rules/goals.md). O guardado é calculado: valor inicial + aportes.
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_in_cents INTEGER NOT NULL CHECK (target_in_cents > 0),
  initial_saved_in_cents INTEGER NOT NULL CHECK (initial_saved_in_cents >= 0),
  due_date TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- O aporte guarda de qual meta é. Excluir a meta só marca `deleted_at`: o aporte continua no
-- financeiro (BR-M07).
ALTER TABLE transactions ADD COLUMN goal_id TEXT REFERENCES goals (id);

CREATE INDEX transactions_goal_id ON transactions (goal_id);
