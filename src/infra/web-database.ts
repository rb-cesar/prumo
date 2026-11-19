import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url";
import type { SqlDatabase } from "./sqlite";

/**
 * Banco para o navegador (desenvolvimento e plano B), com o sql.js direto: o código e o `.wasm` vêm do
 * mesmo pacote, então não divergem. O banco inteiro fica guardado no IndexedDB, regravado depois de
 * cada escrita fora de uma transação.
 */
const STORE_NAME = "prumo-web-database";
const STORE_KEY = "database-bytes";

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSavedBytes(): Promise<Uint8Array | null> {
  const store = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const request = store.transaction("files").objectStore("files").get(STORE_KEY);
    request.onsuccess = () => resolve((request.result as Uint8Array | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const store = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const transaction = store.transaction("files", "readwrite");
    transaction.objectStore("files").put(bytes, STORE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function openWebDatabase(): Promise<SqlDatabase> {
  const sqlJs = await initSqlJs({ locateFile: () => wasmUrl });
  const savedBytes = await readSavedBytes();
  const database = savedBytes === null ? new sqlJs.Database() : new sqlJs.Database(savedBytes);

  // Exportar o banco encerra a transação em andamento, então só salva fora de uma.
  let isInTransaction = false;
  async function persist(): Promise<void> {
    if (!isInTransaction) await saveBytes(database.export());
  }

  return {
    async runScript(sql) {
      const command = sql.trim().toUpperCase();
      if (command === "BEGIN") isInTransaction = true;
      database.exec(sql);
      if (command === "COMMIT" || command === "ROLLBACK") isInTransaction = false;
      await persist();
    },
    async run(sql, parameters = []) {
      database.run(sql, parameters);
      await persist();
    },
    async queryAll<Row>(sql: string, parameters = []) {
      const statement = database.prepare(sql, parameters);
      const rows: Row[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as Row);
      statement.free();
      return rows;
    },
  };
}
