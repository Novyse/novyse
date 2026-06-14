import { join } from "path";
import { app } from "electron";
import { mkdir } from "fs/promises";
import config from "../electron-builder.config";

app.name = config.productName;
if (app.setAppUserModelId) {
  app.setAppUserModelId(config.appId);
}

export const OS_PLATFORM = process.platform;
export const APP_DIR = app.getPath("userData");
export const DB_PATH = join(APP_DIR, "novyse.db");
export const FILES_DIR = join(APP_DIR, "files");

export async function ensureDirectoriesExist() {
  try {
    await mkdir(APP_DIR, { recursive: true });
    await mkdir(FILES_DIR, { recursive: true });
  } catch (e) {
    // Ignore
  }
}
