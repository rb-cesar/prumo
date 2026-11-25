-- Fechamento do ciclo (doc/business-rules/history.md, BR-H08): quantas pendências o ciclo tinha quando
-- acabou. Sem isso o histórico esquece o que voltou ao backlog. `planned_count` nulo = desconhecido.
CREATE TABLE cycle_closings (
  cycle_start TEXT PRIMARY KEY,
  planned_count INTEGER CHECK (planned_count IS NULL OR planned_count >= 0),
  updated_at TEXT NOT NULL
);

-- Ciclos que já tinham acabado antes desta fatia: não se sabe quantas pendências planejaram.
INSERT INTO cycle_closings (cycle_start, planned_count, updated_at)
SELECT DISTINCT cycle_start, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM tasks
 WHERE cycle_start IS NOT NULL
   AND cycle_start < date('now', 'localtime', '-6 days', 'weekday 0');

-- Revisão do ciclo (BR-H06): uma por ciclo, sem edição depois de salva.
CREATE TABLE cycle_reviews (
  cycle_start TEXT PRIMARY KEY,
  worked TEXT NOT NULL,
  hindered TEXT NOT NULL,
  change_next TEXT NOT NULL,
  saved_on TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
