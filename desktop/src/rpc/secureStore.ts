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

async function waitForEncryption(): Promise<void> {
  if (safeStorage.isEncryptionAvailable()) {
    return;
  }
  console.log(
    "safeStorage encryption is not available yet. Waiting for keyring/wallet unlock...",
  );
  while (!safeStorage.isEncryptionAvailable()) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("safeStorage encryption is now available.");
}

export async function handleSecureStoreSet(
  request: SecureStoreSetRequest,
): Promise<SecureStoreSetResponse> {
  try {
    await waitForEncryption();

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
    const filePath = await getFilePath(request.key);
    const buffer = await readFile(filePath).catch(() => null);

    if (!buffer) {
      return { success: true, value: undefined };
    }

    await waitForEncryption();
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
