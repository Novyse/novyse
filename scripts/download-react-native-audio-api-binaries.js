const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TAG = "v3.1.0";
const BASE_URL = `https://github.com/software-mansion-labs/rn-audio-libs/releases/download/${TAG}`;

const packageRoot = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-audio-api",
);

if (!fs.existsSync(packageRoot)) {
  console.log(
    "[download-react-native-audio-api-binaries] Skipped: package not installed",
  );
  process.exit(0);
}

const ANDROID_ARCHIVES = [
  {
    name: "android.zip",
    destination: path.join(packageRoot, "common", "cpp", "audioapi", "external"),
    checkPath: path.join(
      packageRoot,
      "common",
      "cpp",
      "audioapi",
      "external",
      "android",
    ),
  },
  {
    name: "jniLibs.zip",
    destination: path.join(packageRoot, "android", "src", "main"),
    checkPath: path.join(packageRoot, "android", "src", "main", "jniLibs"),
  },
];

async function downloadFile(url, destination) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, buffer);
}

function extractZip(zipPath, destination) {
  fs.mkdirSync(destination, { recursive: true });

  if (process.platform === "win32") {
    const command = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`;
    execSync(`powershell -NoProfile -Command "${command}"`, {
      stdio: "inherit",
    });
    return;
  }

  execSync(`unzip -o "${zipPath}" -d "${destination}"`, { stdio: "inherit" });
}

async function main() {
  const tempDir = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "rn-audio-api-"),
  );

  try {
    for (const archive of ANDROID_ARCHIVES) {
      if (fs.existsSync(archive.checkPath)) {
        console.log(
          `[download-react-native-audio-api-binaries] Already present: ${path.basename(archive.checkPath)}`,
        );
        continue;
      }

      const url = `${BASE_URL}/${archive.name}`;
      const zipPath = path.join(tempDir, archive.name);

      console.log(`[download-react-native-audio-api-binaries] Downloading ${url}`);
      await downloadFile(url, zipPath);

      console.log(
        `[download-react-native-audio-api-binaries] Extracting ${archive.name}`,
      );
      extractZip(zipPath, archive.destination);

      const macOsxDir = path.join(archive.destination, "__MACOSX");
      if (fs.existsSync(macOsxDir)) {
        fs.rmSync(macOsxDir, { recursive: true, force: true });
      }
    }

    console.log(
      "[download-react-native-audio-api-binaries] Android prebuilt binaries ready",
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[download-react-native-audio-api-binaries] Failed:", error);
  process.exit(1);
});
