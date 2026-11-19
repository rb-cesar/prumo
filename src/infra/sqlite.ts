export type SqlValue = string | number | null;

/** A parte do banco que o app usa. O banco do aparelho e o banco dos testes implementam esta interface. */
export type SqlDatabase = {
  runScript(sql: string): Promise<void>;
  run(sql: string, parameters?: SqlValue[]): Promise<void>;
  queryAll<Row>(sql: string, parameters?: SqlValue[]): Promise<Row[]>;
};

export type Migration = { name: string; sql: string };

const migrationFiles = import.meta.glob<string>("../../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** Migrações da pasta `migrations/`, as mesmas no app e nos testes. */
export const bundledMigrations: Migration[] = Object.entries(migrationFiles).map(
  ([filePath, sql]) => ({ name: filePath.split("/").pop() ?? filePath, sql }),
);

function compareByName(first: Migration, second: Migration): number {
  return first.name.localeCompare(second.name);
}

/**
 * Aplica, em ordem de nome, as migrações que ainda não foram aplicadas.
 * Cada migração roda numa transação: se falhar, nada dela fica no banco.
 */
export async function runMigrations(database: SqlDatabase, migrations: Migration[]): Promise<void> {
  await database.runScript("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)");
  const appliedRows = await database.queryAll<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const appliedNames = new Set(appliedRows.map((row) => row.name));
  const pendingMigrations = [...migrations]
    .sort(compareByName)
    .filter((migration) => !appliedNames.has(migration.name));

  for (const migration of pendingMigrations) {
    await database.runScript("BEGIN");
    try {
      await database.runScript(migration.sql);
      await database.run("INSERT INTO schema_migrations (name) VALUES (?)", [migration.name]);
      await database.runScript("COMMIT");
    } catch (error) {
      try {
        await database.runScript("ROLLBACK");
      } catch {
        // o que importa é o erro original, não a falha ao desfazer
      }
      throw error;
    }
  }
}
