import { DatabaseSync } from "node:sqlite";
import { bundledMigrations, type Migration, runMigrations, type SqlDatabase } from "./sqlite";

/** SQLite real, em memória, com as mesmas migrações do app. Só para testes. */
export async function createTestDatabase(
  migrations: Migration[] = bundledMigrations,
): Promise<SqlDatabase> {
  const memoryDatabase = new DatabaseSync(":memory:");

  const testDatabase: SqlDatabase = {
    async runScript(sql) {
      memoryDatabase.exec(sql);
    },
    async run(sql, parameters = []) {
      memoryDatabase.prepare(sql).run(...parameters);
    },
    async queryAll<Row>(sql: string, parameters = []) {
      return memoryDatabase.prepare(sql).all(...parameters) as Row[];
    },
  };

  await runMigrations(testDatabase, migrations);
  return testDatabase;
}
