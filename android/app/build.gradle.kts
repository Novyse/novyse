plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

fun getBranchFromGlobalConfig(): String {
    val candidateFiles = listOf(
        rootProject.file("../lib/core/config/global.dart"),
        rootProject.file("../lib/config/global.dart")
    )
    for (file in candidateFiles) {
        if (file.exists()) {
            val match = Regex("""const\s+String\s+branch\s*=\s*['"]([^'"]+)['"]""").find(file.readText())
            if (match != null) {
                return match.groupValues[1]
            }
        }
    }
    return "development"
}

val currentBranch = getBranchFromGlobalConfig()

val currentApplicationId = when (currentBranch) {
    "production" -> "com.novyse"
    "preview" -> "com.novyse.preview"
    else -> "com.novyse.dev"
}

android {
    namespace = "com.novyse.novyse"
    compileSdk = 37
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = currentApplicationId
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

tasks.register("printApplicationId") {
    doLast {
        println("CONFIG_BRANCH: $currentBranch")
        println("RESOLVED_APPLICATION_ID: $currentApplicationId")
    }
}
