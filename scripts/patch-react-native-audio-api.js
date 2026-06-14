const fs = require("fs");
const path = require("path");

const buildGradlePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-audio-api",
  "android",
  "build.gradle",
);

if (!fs.existsSync(buildGradlePath)) {
  console.log("[patch-react-native-audio-api] Skipped: package not installed");
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, "utf8");

const originalTask = `task downloadPrebuiltBinaries(type: Exec) {
  commandLine 'chmod', '+x', '../scripts/download-prebuilt-binaries.sh'
  commandLine 'bash', '../scripts/download-prebuilt-binaries.sh'
  args 'android', isFFmpegDisabled() ? 'skipffmpeg' : ''
}`;

const patchedTask = `task downloadPrebuiltBinaries {
  def androidLibs = file("\${projectDir}/../common/cpp/audioapi/external/android")
  def jniLibs = file("\${projectDir}/src/main/jniLibs")
  onlyIf {
    !androidLibs.exists() || !jniLibs.exists()
  }
  doLast {
    if (Os.isFamily(Os.FAMILY_WINDOWS)) {
      throw new GradleException("[AudioAPI] Missing prebuilt binaries on Windows. Run: node scripts/download-react-native-audio-api-binaries.js")
    }
    exec {
      workingDir file("\${projectDir}/../scripts")
      commandLine 'bash', 'download-prebuilt-binaries.sh', 'android', isFFmpegDisabled() ? 'skipffmpeg' : ''
    }
  }
}`;

if (content.includes("Missing prebuilt binaries on Windows")) {
  console.log("[patch-react-native-audio-api] build.gradle already patched");
  process.exit(0);
}

if (!content.includes(originalTask)) {
  console.warn(
    "[patch-react-native-audio-api] Unexpected build.gradle format; skipping patch",
  );
  process.exit(0);
}

content = content.replace(originalTask, patchedTask);
fs.writeFileSync(buildGradlePath, content, "utf8");
console.log(
  "[patch-react-native-audio-api] Patched downloadPrebuiltBinaries to skip bash when binaries exist",
);
