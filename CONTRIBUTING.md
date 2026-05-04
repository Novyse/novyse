# Contributing to Novyse

First off, thank you for considering contributing to Novyse! It's people like you that make Novyse such a great tool for everyone.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Developer Setup](#developer-setup)
- [Build Instructions](#build-instructions)
- [Security Policy](#security-policy)

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
2. Make sure your code lints.
3. Issue that pull request!

---

## Developer Setup

To start the local development environment, ensure you have the necessary dependencies installed (Node.js, Expo CLI).

Run one of the following commands to start the development server:

- `npx expo start -c` (clears the cache before starting)
- `npx expo start` (starts the server normally)

For more detailed information on React Native development with Expo, refer to the [official Expo documentation](https://docs.expo.dev/).

---

## Build Instructions

> [!NOTE]  
> The build process described here is likely to be automated in the future. This documentation ensures transparency for developers to understand and verify the steps.

### Environment Configuration

> [!IMPORTANT]  
> Before building, update the `app.config.ts` file to switch the environment from `development` to `preview` or `production`.

Ensure you also update:

- Version numbers (e.g., 1.0.0)
- Build number (incremental integer)
- Build date

### Web Build

Run the following command to export the web build:

```bash
npx expo export -p web
```

This generates a `/dist` directory containing production-ready assets.

### Android Build

#### Development Build

1. Clean and prepare: `npx expo prebuild --clean`
2. Create `android/local.properties` with your SDK path:
   ```properties
   sdk.dir=/path/to/your/android/sdk
   ```
3. Run: `npx expo run:android --no-build-cache`

#### Preview Build

1. Clean and prepare: `npx expo prebuild --clean`
2. Build local APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

#### Production Build

1. Clean and prepare: `npx expo prebuild --clean`
2. Build via EAS:
   ```bash
   npx eas build --platform android --profile=production
   ```

### iOS / Windows / macOS / Linux

> [!WARNING]  
> Building for these platforms is currently not fully supported or documented. We are working on expanding compatibility.

---

## Security Policy

Please refer to our [SECURITY.md](SECURITY.md) for instructions on how to report vulnerabilities.
