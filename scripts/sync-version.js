const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const rootPkgPath = path.join(rootDir, "package.json");
const desktopPkgPath = path.join(rootDir, "desktop", "package.json");

try {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf8"));

  if (desktopPkg.version !== rootPkg.version) {
    console.log(
      `[SCRIPT] Syncing desktop/package.json version from ${desktopPkg.version} to ${rootPkg.version}`,
    );
    desktopPkg.version = rootPkg.version;
    fs.writeFileSync(
      desktopPkgPath,
      JSON.stringify(desktopPkg, null, 2) + "\n",
      "utf8",
    );
  }
} catch (error) {
  console.error("[SCRIPT] Failed to sync version:", error);
  process.exit(1);
}
