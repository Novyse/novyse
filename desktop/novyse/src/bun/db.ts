import { Database } from "bun:sqlite";
import { DB_PATH, OS_PLATFORM, ensureDirectoriesExist } from "./paths";

await ensureDirectoriesExist();

export const db = new Database(DB_PATH, { create: true });
export { OS_PLATFORM };
