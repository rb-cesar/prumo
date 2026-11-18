CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('todo', 'doing', 'done')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  due_date TEXT,
  cycle_start TEXT,
  amount_in_cents INTEGER,
  money_direction TEXT CHECK (money_direction IN ('expense', 'income')),
  envelope_id TEXT,
  done_date TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX tasks_cycle_start ON tasks (cycle_start);
