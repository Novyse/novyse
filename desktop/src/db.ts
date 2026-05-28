import Database from "better-sqlite3";
import { DB_PATH, OS_PLATFORM, ensureDirectoriesExist } from "./paths";

let dbInstance: any = null;

export async function initDb() {
  await ensureDirectoriesExist();
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("foreign_keys = OFF");
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not yet initialized");
  }
  return dbInstance;
}

export { OS_PLATFORM };