# Contributing to Novyse

First off, thank you for considering contributing to Novyse! It's people like you that make Novyse such a great tool for everyone. By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Table of Contents

1. [How Can I Contribute?](#how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Requests](#pull-requests)
2. [Development Guide](#development-guide)
   - [Environment Setup](#environment-setup)
   - [Build Instructions](#build-instructions)
     - [Intro & Config](#intro--config)
     - [Web Build](#web-build)
     - [Android Build](#android-build)
     - [Other Platforms](#other-platforms)
3. [Security & Legal](#security--legal)

---

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for Novyse. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related bugs.

Before creating bug reports, please check the [existing issues](https://github.com/Novyse/novyse/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible. Fill out the [bug report template](.github/ISSUE_TEMPLATE/bug-report.yml) for the best results.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Novyse, including completely new features and minor improvements to existing functionality.

Before creating enhancement suggestions, please check the [existing issues](https://github.com/Novyse/novyse/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.

### Pull Requests

The process which describes how to contribute to the repository:

1. Fork the repository and create your branch from `development`.
2. Make sure your code lints using `npm run lint`.
3. Ensure your code follows the existing style and architecture.
4. Issue that pull request!

---

## Development Guide

### Environment Setup

To start the local development environment, ensure you have the necessary dependencies installed (Node.js, Expo CLI).

Run one of the following commands to start the development server:

- `npx expo start -c` (clears the cache before starting)
- `npx expo start` (starts the server normally)

For more detailed information on React Native development with Expo, refer to the [official Expo documentation](https://docs.expo.dev/).

---

### Build Instructions

> [!NOTE]  
> The build process described in this documentation is likely to be automated in the future to streamline development and deployment. This document will remain available to ensure transparency, allowing developers to understand the underlying steps and verify the automation's correctness.

#### Intro & Config

> [!IMPORTANT]  
> Before building the application, ensure you update the `app.config.ts` file to switch the environment from `development` to `preview` or `production`, depending on your target build. This configuration affects various aspects of the app, such as API endpoints, logging levels, and feature toggles.

Additionally, update related values in the config file accordingly, including:

- **Version numbers**: (e.g., semantic versioning like 1.0.0)
- **Build number**: (incremental integer for tracking builds)
- **Build date**: (current timestamp or date string)

These changes ensure the build reflects the correct environment and metadata.

#### Web Build

Building for production on the web is straightforward. Run the following command to export the web build:

```bash
npx expo export -p web
```

This command generates a `/dist` directory containing the production-ready web assets. You can serve these files using a web server like Nginx, Apache, or any static file host.

#### Android Build

##### Development Build

For a development build on Android, follow these steps:

1. Clean and prepare the native project:
   ```bash
   npx expo prebuild --clean
   ```
2. Create a `local.properties` file inside the `android/` folder with the following content (adjust the SDK path based on your system):
   ```properties
   # example
   ## Windows
   sdk.dir=C:\\Users\\ISRaiken\\AppData\\Local\\Android\\Sdk
   ## Linux
   sdk.dir=/home/israiken/Android/Sdk
   ```
3. Run the Android build:
   ```bash
   npx expo run:android --no-build-cache
   ```
   Alternatively, you can use:
   ```bash
   npx expo run:android
   ```

> [!WARNING]  
> **Windows Long Path Error**: If you encounter a "path too long 260 char" error on Windows, enable long paths support using PowerShell (Admin):
>
> ```powershell
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```
>
> **Ninja Build Tools**: Download the latest Ninja .exe from the [Ninja repository releases](https://github.com/ninja-build/ninja/releases). Replace the existing `ninja.exe` in:  
> `C:\Users\{LOCAL_USER}\AppData\Local\Android\Sdk\cmake\{VERSION}\bin`

> [!WARNING]  
> **Audio API Error**: If you encounter a "react-native-audio-api: Restored missing prebuilt binaries" error on Windows:
>
> ```text
> react-native-audio-api: Restored missing prebuilt binaries (libopusfile.a, jniLibs, etc.) by executing the package's internal download script. This resolves the ninja: error.
> ```

##### Preview Build

For a preview build on Android, follow these steps:

1. Clean and prepare the native project:
   ```bash
   npx expo prebuild --clean
   ```
2. Build the app (local is advised):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

> [!TIP]
> **APK Splitting**: By default a single fat APK will be built. To build separately for various platforms, insert this script inside `android/app/build.gradle` inside the `android` object:

```gradle
    // APK splitting
    splits {
        abi {
            enable true
            reset()
            include 'x86', 'x86_64', 'armeabi-v7a', 'arm64-v8a'
            universalApk false
        }
    }

    project.ext.versionCodes = ['x86': 0, 'x86_64': 1, 'armeabi-v7a': 2, 'arm64-v8a': 3]

    android.applicationVariants.all { variant ->
        variant.outputs.each { output ->
            output.versionCodeOverride = project.ext.versionCodes.get(output.getFilter(com.android.build.OutputFile.ABI), 0) * 1 + android.defaultConfig.versionCode
        }
    }
```

##### Production Build

You can choose one of the following methods:

**Option 1: EAS Build**

1. Clean and prepare: `npx expo prebuild --clean`
2. Build: `npx eas build --platform android --profile=production`

**Option 2: Local Build (Manual Gradle)**

1. Clean and prepare: `npx expo prebuild --clean`
2. Build locally:
   ```bash
   cd android
   # For APK
   ./gradlew assembleRelease
   # For AAB (Google Play Store)
   ./gradlew bundleRelease
   ```

#### Other Platforms

##### iOS

> [!WARNING]  
> Building for iOS is not possible as of now. First test done, not working :(

##### Windows / macOS / Linux

> [!WARNING]  
> Building for these platforms is not possible as of now, so there is no documentation available. (Waiting for 1.1)

---

## Security & Legal

- **Security Policy**: Please refer to our [SECURITY.md](SECURITY.md) for instructions on how to report vulnerabilities.
- **Code of Conduct**: All contributors are expected to follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **License**: This project is licensed under the GPL-3.0 License. See [LICENSE](LICENSE) for details.
