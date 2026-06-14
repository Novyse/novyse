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

    // Boost Gradle JVM Memory Args to avoid OutOfMemory / Metaspace exhaustion
    if (props.includes("org.gradle.jvmargs=")) {
      const currentJvmArgsMatch = props.match(/org\.gradle\.jvmargs=(.*)/);
      if (
        currentJvmArgsMatch &&
        !currentJvmArgsMatch[1].includes("-Xmx4096m")
      ) {
        props = props.replace(
          /org\.gradle\.jvmargs=.*/,
          "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m",
        );
        updated = true;
      }
    } else {
      props += "\norg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m";
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
            enable !project.gradle.startParameter.taskNames.any { it.toLowerCase().contains("bundle") }
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

      const excludeBlock = `\n\n// Configure the React Native bundling task to exclude desktop, android, and ios directories\ntasks.configureEach { task ->\n    if (task.name.contains("createBundle") && task.name.contains("JsAndAssets")) {\n        task.sources.exclude("desktop/**")\n        task.sources.exclude("android/**")\n        task.sources.exclude("ios/**")\n    }\n}\n`;

      if (!content.includes('exclude("desktop/**")')) {
        content += excludeBlock;
      }

      fs.writeFileSync(buildGradlePath, content, "utf8");
      console.log(
        "[PATCH] Successfully updated build.gradle with ABI splits configuration and task exclusions.",
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
