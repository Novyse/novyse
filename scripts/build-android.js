const { execSync } = require("child_process");
const path = require("path");
const process = require("process");

const args = process.argv.slice(2);

const buildApk = args.includes("--apk");
const buildAab = args.includes("--aab");
const buildAll = args.includes("--all");

let shouldBuildApk = false;
let shouldBuildAab = false;

if (buildAll || (!buildApk && !buildAab) || (buildApk && buildAab)) {
  shouldBuildApk = true;
  shouldBuildAab = true;
} else {
  if (buildApk) shouldBuildApk = true;
  if (buildAab) shouldBuildAab = true;
}

const rootDir = path.resolve(__dirname, "..");

function runCmd(cmd, cwd = rootDir) {
  console.log(`Running: ${cmd} in ${cwd}`);
  execSync(cmd, { stdio: "inherit", cwd });
}

try {
  const androidDir = path.join(rootDir, "android");

  if (shouldBuildAab) {
    console.log("Preparing environment for Android App Bundle (Play Store)...");
    runCmd("IS_PLAY_STORE=true bun run prebuild");
    runCmd("node scripts/patch-android-build.js");

    console.log("Building Android App Bundle (AAB)...");
    runCmd("./gradlew bundleRelease", androidDir);
  }

  if (shouldBuildApk) {
    console.log(
      "Preparing environment for Android Package (GitHub/Sideload)...",
    );
    runCmd("IS_PLAY_STORE=false bun run prebuild");
    runCmd("node scripts/patch-android-build.js");

    console.log("Building Android Package (APK)...");
    runCmd("./gradlew assembleRelease", androidDir);
  }

  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error.message);
  process.exit(1);
}
