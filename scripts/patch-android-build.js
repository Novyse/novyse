const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const gradlePropsPath = path.join(rootDir, "android", "gradle.properties");
const buildGradlePath = path.join(rootDir, "android", "app", "build.gradle");

try {
  if (fs.existsSync(gradlePropsPath)) {
    let props = fs.readFileSync(gradlePropsPath, "utf8");
    let updated = false;

    if (!props.includes("android.enableMinifyInReleaseBuilds")) {
      props += "\nandroid.enableMinifyInReleaseBuilds=true";
      updated = true;
    }
    if (!props.includes("android.enableShrinkResourcesInReleaseBuilds")) {
      props += "\nandroid.enableShrinkResourcesInReleaseBuilds=true";
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(gradlePropsPath, props, "utf8");
      console.log(
        "[PATCH] Successfully updated gradle.properties with minification flags.",
      );
    }
  } else {
    console.error("[PATCH] android/gradle.properties not found!");
    process.exit(1);
  }

  // 2. Modify android/app/build.gradle
  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, "utf8");

    const targetBlock = `    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }`;

    const splitsConfig = `    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }
    applicationVariants.all { variant ->
        variant.outputs.each { output ->
            def versionCodes = ["armeabi-v7a": 1, "arm64-v8a": 2, "x86": 3, "x86_64": 4]
            def abi = output.getFilter(com.android.build.OutputFile.ABI)
            if (abi != null) {
                output.versionCodeOverride =
                        defaultConfig.versionCode * 1000 + versionCodes.get(abi)
            }
        }
    }`;

    if (content.includes(targetBlock)) {
      content = content.replace(targetBlock, splitsConfig);
      fs.writeFileSync(buildGradlePath, content, "utf8");
      console.log(
        "[PATCH] Successfully updated build.gradle with ABI splits configuration.",
      );
    } else {
      console.error(
        "[PATCH] Could not find the androidResources block in build.gradle!",
      );
      process.exit(1);
    }
  } else {
    console.error("[PATCH] android/app/build.gradle not found!");
    process.exit(1);
  }
} catch (error) {
  console.error("[PATCH] Failed to patch Android build configuration:", error);
  process.exit(1);
}
