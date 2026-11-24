-- Lançamento criado ao concluir uma pendência com valor guarda de qual veio. Reabrir a pendência
-- remove o lançamento que ela gerou; excluir o lançamento só desfaz o vínculo.
ALTER TABLE transactions ADD COLUMN task_id TEXT REFERENCES tasks (id);

CREATE INDEX transactions_task_id ON transactions (task_id);
