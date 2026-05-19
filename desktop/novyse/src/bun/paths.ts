import { join } from "path";
import { platform, homedir } from "os";
import { mkdir } from "fs/promises";

const OS_PLATFORM = platform();

function getAppDir(): string {
  if (OS_PLATFORM === "darwin") {
    return join(homedir(), "Library", "Application Support", "novyse");
  } else if (OS_PLATFORM === "win32") {
    return join(
      process.env["APPDATA"] || join(homedir(), "AppData", "Roaming"),
      "novyse",
    );
  } else {
    return join(
      process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config"),
      "novyse",
    );
  }
}

export const APP_DIR = getAppDir();
export const DB_PATH = join(APP_DIR, "novyse.db");
export const FILES_DIR = join(APP_DIR, "files");
export { OS_PLATFORM };

export async function ensureDirectoriesExist() {
  try {
    await mkdir(APP_DIR, { recursive: true });
    await mkdir(FILES_DIR, { recursive: true });
  } catch (e) {
    // Ignore
  }
}
