import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

val globalConfigFile = rootProject.file("../lib/core/config/global.dart")
val globalConfigText = if (globalConfigFile.exists()) globalConfigFile.readText().replace("\r", " ").replace("\n", " ") else ""

fun getBranchFromGlobalConfig(): String {
    val match = Regex("""const\s+String\s+branch\s*=\s*['"]([^'"]+)['"]""").find(globalConfigText)
    return match?.groupValues?.get(1) ?: "development"
}

fun getAppVersionFromGlobalConfig(): String {
    val match = Regex("""const\s+String\s+appVersion\s*=\s*['"]([^'"]+)['"]""").find(globalConfigText)
    return match?.groupValues?.get(1) ?: throw IllegalStateException("appVersion must be defined in lib/core/config/global.dart")
}

fun getMetadataFromGlobalConfig(varName: String, branch: String): String {
    val pattern = when (branch) {
        "production" -> Regex("""const\s+String\s+${varName}\s*=\s*branch\s*==\s*['"]production['"]\s*\?\s*['"]([^'"]+)['"]""")
        else -> Regex("""const\s+String\s+${varName}\s*=\s*[^;]*:\s*['"]([^'"]+)['"]""")
    }
    val match = pattern.find(globalConfigText)
    if (match != null) {
        return match.groupValues[1]
    }
    val simple = Regex("""const\s+String\s+${varName}\s*=\s*['"]([^'"]+)['"]""").find(globalConfigText)
    return simple?.groupValues?.get(1) ?: ""
}

val currentBranch = getBranchFromGlobalConfig()
val currentAppVersion = getAppVersionFromGlobalConfig()
val currentAppName = getMetadataFromGlobalConfig("appName", currentBranch)
val currentAppDescription = getMetadataFromGlobalConfig("appDescription", currentBranch)
val currentApplicationId = getMetadataFromGlobalConfig("appId", currentBranch).ifEmpty { "com.${currentAppName.lowercase()}" }
val currentScheme = getMetadataFromGlobalConfig("appScheme", currentBranch).ifEmpty { currentAppName.lowercase() }

val currentHostSuffix = when (currentBranch) {
    "production" -> ""
    else -> ".dev"
}

val currentAppHost = "app${currentHostSuffix}.novyse.com"
val currentWebHost = "web${currentHostSuffix}.novyse.com"
val currentAuthHost = "auth${currentHostSuffix}.novyse.com"

android {
    namespace = "com.novyse.novyse"
    compileSdk = 37
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        resValues = true
    }

    defaultConfig {
        applicationId = currentApplicationId
        manifestPlaceholders["appName"] = currentAppName
        manifestPlaceholders["appDescription"] = currentAppDescription
        manifestPlaceholders["appScheme"] = currentScheme
        manifestPlaceholders["appHost"] = currentAppHost
        manifestPlaceholders["webHost"] = currentWebHost
        manifestPlaceholders["authHost"] = currentAuthHost
        resValue("string", "app_name", currentAppName)
        resValue("string", "app_description", currentAppDescription)
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = currentAppVersion
    }

    signingConfigs {
        create("release") {
            val keyPropsFile = rootProject.file("key.properties")
            val keyProps = Properties()
            if (keyPropsFile.exists()) {
                FileInputStream(keyPropsFile).use { keyProps.load(it) }
            }

            val keystorePath = keyProps.getProperty("storeFile")
                ?: System.getenv("ANDROID_KEYSTORE_FILE")
            val keystoreFile = if (keystorePath != null) file(keystorePath) else rootProject.file("../novyse-release.keystore")

            val sPassword = keyProps.getProperty("storePassword")
                ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
            val kAlias = keyProps.getProperty("keyAlias")
                ?: System.getenv("ANDROID_KEY_ALIAS")
            val kPassword = keyProps.getProperty("keyPassword")
                ?: System.getenv("ANDROID_KEY_PASSWORD")

            if (keystoreFile.exists() && !sPassword.isNullOrBlank() && !kAlias.isNullOrBlank() && !kPassword.isNullOrBlank()) {
                storeFile = keystoreFile
                storePassword = sPassword
                keyAlias = kAlias
                keyPassword = kPassword
            }
        }
    }

    buildTypes {
        release {
            val releaseSigning = signingConfigs.getByName("release")
            signingConfig = if (releaseSigning.storeFile != null) {
                releaseSigning
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

tasks.register("printApplicationId") {
    doLast {
        println("CONFIG_BRANCH: $currentBranch")
        println("CONFIG_VERSION: $currentAppVersion")
        println("RESOLVED_APPLICATION_ID: $currentApplicationId")
        println("CONFIG_APP_NAME: $currentAppName")
        println("CONFIG_APP_DESCRIPTION: $currentAppDescription")
    }
}

// Regenerates the launcher icons by compositing the glyph + background
// sources (see tool/gen_launcher_icons.dart). Runs automatically before
// every build; up-to-date checks make it a no-op when the sources have
// not changed. `dart` is resolved from the Flutter SDK (it is not on
// PATH for the Gradle daemon).
tasks.register<Exec>("genLauncherIcons") {
    val localProps = Properties().apply {
        rootProject.file("local.properties").takeIf { it.exists() }
            ?.inputStream()?.use(::load)
    }
    val flutterSdk = System.getenv("FLUTTER_ROOT")
        ?: localProps.getProperty("flutter.sdk")
        ?: throw GradleException(
            "Flutter SDK not found: build with `flutter build`/`flutter run`",
        )
    val dartBin = if (System.getProperty("os.name").contains(
            "windows",
            ignoreCase = true,
        )) {
        "$flutterSdk\\bin\\dart.bat"
    } else {
        "$flutterSdk/bin/dart"
    }
    workingDir = projectDir.resolve("../..")
    commandLine(dartBin, "tool/gen_launcher_icons.dart")
    inputs.dir("../../assets/images/icons")
    inputs.dir("../../assets/images/icons_backgrounds")
    inputs.file("../../assets/images/tray_icon.png")
    inputs.file("../../tool/gen_launcher_icons.dart")
    outputs.dir("src/main/res/mipmap-xxxhdpi")
    outputs.dir("src/main/res/mipmap-anydpi-v26")
    outputs.dir("../../assets/images/icons/generated")
}

afterEvaluate {
    // The generator emits files consumed all over the build (Flutter
    // assets, Android res, the manifest). Gradle 9 fails validation on
    // every consumer without an explicit edge, so the generator is
    // ordered before everything: up-to-date checks make it a no-op when
    // the sources have not changed.
    val gen = tasks.named("genLauncherIcons")
    tasks.configureEach {
        if (name != "genLauncherIcons") dependsOn(gen)
    }
}
