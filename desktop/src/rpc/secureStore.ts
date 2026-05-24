import { safeStorage } from "electron";
import { join } from "path";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { APP_DIR } from "../paths";
import type {
  SecureStoreSetRequest,
  SecureStoreSetResponse,
  SecureStoreGetRequest,
  SecureStoreGetResponse,
  SecureStoreDeleteRequest,
  SecureStoreDeleteResponse,
} from "../../../src/types/rpc";

async function getFilePath(key: string) {
  const secureDir = join(APP_DIR, "secure");
  await mkdir(secureDir, { recursive: true });
  return join(secureDir, `.${key}`);
}

export async function handleSecureStoreSet(
  request: SecureStoreSetRequest,
): Promise<SecureStoreSetResponse> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this platform/session.");
    }

    const filePath = await getFilePath(request.key);
    const buffer = safeStorage.encryptString(request.value);

    await writeFile(filePath, buffer);
    return { success: true };
  } catch (error: any) {
    console.error("electron:secureStoreSet error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function handleSecureStoreGet(
  request: SecureStoreGetRequest,
): Promise<SecureStoreGetResponse> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this platform/session.");
    }

    const filePath = await getFilePath(request.key);
    const buffer = await readFile(filePath).catch(() => null);

    if (!buffer) {
      return { success: true, value: undefined };
    }

    const value = safeStorage.decryptString(buffer);
    return { success: true, value };
  } catch (error: any) {
    console.error("electron:secureStoreGet error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function handleSecureStoreDelete(
  request: SecureStoreDeleteRequest,
): Promise<SecureStoreDeleteResponse> {
  try {
    const filePath = await getFilePath(request.key);
    await unlink(filePath).catch(() => {});
    return { success: true };
  } catch (error: any) {
    console.error("electron:secureStoreDelete error:", error.message);
    return { success: false, error: error.message };
  }
}
