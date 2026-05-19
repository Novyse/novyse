import { join } from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { OS_PLATFORM } from "../db";
import type {
  SecureStoreSetRequest,
  SecureStoreSetResponse,
  SecureStoreGetRequest,
  SecureStoreGetResponse,
  SecureStoreDeleteRequest,
  SecureStoreDeleteResponse,
} from "../../../../../src/types/rpc";

async function setSecureItem(key: string, value: string): Promise<void> {
  if (OS_PLATFORM === "darwin") {
    await Bun.spawn([
      "security",
      "add-generic-password",
      "-a",
      key,
      "-s",
      "novyse",
      "-w",
      value,
      "-U",
    ]).exited;
  } else if (OS_PLATFORM === "linux") {
    try {
      const proc = Bun.spawn({
        cmd: [
          "secret-tool",
          "store",
          "--label=Novyse Session",
          "service",
          "novyse",
          "account",
          key,
        ],
        stdin: "pipe",
        stderr: "pipe",
      });
      proc.stdin.write(value);
      proc.stdin.end();
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        throw new Error("secret-tool exited with non-zero code");
      }
    } catch (e) {
      const fallbackDir = join(process.env["HOME"] || "", ".config", "novyse");
      await mkdir(fallbackDir, { recursive: true });
      const fallbackPath = join(fallbackDir, `.${key}`);
      await writeFile(fallbackPath, value);
      await Bun.spawn(["chmod", "600", fallbackPath]).exited;
    }
  } else if (OS_PLATFORM === "win32") {
    const script = `
      $secValue = ConvertTo-SecureString "${value}" -AsPlainText -Force
      $cred = New-Object System.Management.Automation.PSCredential ("novyse\\${key}", $secValue)
      [void][Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType = WindowsRuntime]
      $vault = New-Object Windows.Security.Credentials.PasswordVault
      $credObj = New-Object Windows.Security.Credentials.PasswordCredential ("novyse", $key, $value)
      $vault.Add($credObj)
    `;
    await Bun.spawn(["powershell", "-Command", script]).exited;
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (OS_PLATFORM === "darwin") {
    const proc = Bun.spawn(
      ["security", "find-generic-password", "-a", key, "-s", "novyse", "-w"],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    return stdout.trim() || null;
  } else if (OS_PLATFORM === "linux") {
    try {
      const proc = Bun.spawn(
        ["secret-tool", "lookup", "service", "novyse", "account", key],
        {
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      if (exitCode === 0 && stdout.trim()) {
        return stdout.trim();
      }
      throw new Error("secret-tool lookup failed");
    } catch (e) {
      try {
        const fallbackPath = join(
          process.env["HOME"] || "",
          ".config",
          "novyse",
          `.${key}`,
        );
        const file = Bun.file(fallbackPath);
        if (await file.exists()) {
          return (await file.text()).trim();
        }
      } catch {}
      return null;
    }
  } else if (OS_PLATFORM === "win32") {
    try {
      const script = `
        [void][Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType = WindowsRuntime]
        $vault = New-Object Windows.Security.Credentials.PasswordVault
        try {
          $cred = $vault.Retrieve("novyse", "${key}")
          $cred.RetrievePassword()
          Write-Output $cred.Password
        } catch {
          exit 1
        }
      `;
      const proc = Bun.spawn(["powershell", "-Command", script], {
        stdout: "pipe",
      });
      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      if (exitCode === 0 && stdout.trim()) {
        return stdout.trim();
      }
    } catch {}
    return null;
  }
  return null;
}

async function deleteSecureItem(key: string): Promise<void> {
  if (OS_PLATFORM === "darwin") {
    await Bun.spawn([
      "security",
      "delete-generic-password",
      "-a",
      key,
      "-s",
      "novyse",
    ]).exited;
  } else if (OS_PLATFORM === "linux") {
    try {
      await Bun.spawn([
        "secret-tool",
        "clear",
        "service",
        "novyse",
        "account",
        key,
      ]).exited;
    } catch (e) {}
    try {
      const fallbackPath = join(
        process.env["HOME"] || "",
        ".config",
        "novyse",
        `.${key}`,
      );
      await unlink(fallbackPath);
    } catch {}
  } else if (OS_PLATFORM === "win32") {
    const script = `
      [void][Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType = WindowsRuntime]
      $vault = New-Object Windows.Security.Credentials.PasswordVault
      try {
        $cred = $vault.Retrieve("novyse", "${key}")
        $vault.Remove($cred)
      } catch {}
    `;
    await Bun.spawn(["powershell", "-Command", script]).exited;
  }
}

export async function handleSecureStoreSet(
  request: SecureStoreSetRequest,
): Promise<SecureStoreSetResponse> {
  try {
    await setSecureItem(request.key, request.value);
    return { success: true };
  } catch (error: any) {
    console.error("bun:secureStoreSet error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function handleSecureStoreGet(
  request: SecureStoreGetRequest,
): Promise<SecureStoreGetResponse> {
  try {
    const value = await getSecureItem(request.key);
    return { success: true, value: value || undefined };
  } catch (error: any) {
    console.error("bun:secureStoreGet error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function handleSecureStoreDelete(
  request: SecureStoreDeleteRequest,
): Promise<SecureStoreDeleteResponse> {
  try {
    await deleteSecureItem(request.key);
    return { success: true };
  } catch (error: any) {
    console.error("bun:secureStoreDelete error:", error.message);
    return { success: false, error: error.message };
  }
}
