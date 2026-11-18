import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SqlDatabase } from "./sqlite";
import { openWebDatabase } from "./web-database";

const DATABASE_NAME = "prumo";

/** Abre o banco do aparelho: SQLite nativo no Android; no navegador, o sql.js com o banco no IndexedDB. */
export async function openDeviceDatabase(): Promise<SqlDatabase> {
  if (Capacitor.getPlatform() === "web") return openWebDatabase();

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const connection = await sqlite.createConnection(DATABASE_NAME, false, "no-encryption", 1, false);
  await connection.open();

  // `false` no argumento de transação: o executor de migrações abre e fecha as suas próprias.
  return {
    async runScript(sql) {
      await connection.execute(sql, false);
    },
    async run(sql, parameters = []) {
      await connection.run(sql, parameters, false);
    },
    async queryAll<Row>(sql: string, parameters = []) {
      const result = await connection.query(sql, parameters);
      return (result.values ?? []) as Row[];
    },
  };
}
