import { describe, expect, it } from "vitest";
import { runMigrations } from "./sqlite";
import { createTestDatabase } from "./test-database";

const createItemsTable = { name: "0001-create-items.sql", sql: "CREATE TABLE items (id INTEGER)" };
const addLabelColumn = {
  name: "0002-add-label.sql",
  sql: "ALTER TABLE items ADD COLUMN label TEXT",
};
const migrationThatFailsHalfway = {
  name: "0001-broken.sql",
  sql: "CREATE TABLE half_done (id INTEGER); CREATE TABLE half_done (id INTEGER)",
};

describe("runMigrations", () => {
  it("aplica as migrações em ordem de nome, mesmo recebidas fora de ordem", async () => {
    const database = await createTestDatabase([addLabelColumn, createItemsTable]);

    const columns = await database.queryAll<{ name: string }>("PRAGMA table_info(items)");

    expect(columns.map((column) => column.name)).toEqual(["id", "label"]);
  });

  it("não aplica de novo uma migração já registrada", async () => {
    const database = await createTestDatabase([createItemsTable]);

    await runMigrations(database, [createItemsTable]);

    const applied = await database.queryAll<{ name: string }>("SELECT name FROM schema_migrations");
    expect(applied).toEqual([{ name: "0001-create-items.sql" }]);
  });

  it("não deixa nada no banco quando a migração falha no meio", async () => {
    const database = await createTestDatabase([]);

    await expect(runMigrations(database, [migrationThatFailsHalfway])).rejects.toThrow();

    const leftoverTables = await database.queryAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name = 'half_done'",
    );
    const applied = await database.queryAll<{ name: string }>("SELECT name FROM schema_migrations");
    expect([...leftoverTables, ...applied]).toEqual([]);
  });
});
