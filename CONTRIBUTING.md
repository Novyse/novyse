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
   - [Running the App](#running-the-app)
   - [Testing & Code Coverage](#testing--code-coverage)
3. [Build Instructions](#build-instructions)
   - [Intro & Config](#intro--config)
   - [Web](#web)
   - [Android](#android)
   - [Other Platforms](#other-platforms)
4. [Security & Legal](#security--legal)

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
2. Make sure your code passes `dart format`, `flutter analyze` and `flutter test`.
3. Ensure your code follows the existing style and architecture.
4. Issue that pull request!

---

## Development Guide

### Environment Setup

To start local development, install the Flutter SDK by following the [official install guide](https://docs.flutter.dev/get-started/install).

```bash
flutter pub get
```

Localizations are generated automatically on `pub get` / build
(`flutter: generate: true` in `pubspec.yaml`).
To regenerate the OSS licenses file run:

```bash
./scripts/sync-licenses.sh
```

### Running the App

Use the `run.sh` script, it launches the app with the right flags per platform
and forwards any extra argument to `flutter run`:

```bash
./scripts/run.sh web
./scripts/run.sh linux
./scripts/run.sh windows
./scripts/run.sh macos
```

`web` runs on Chrome with port `8081`, `linux` disables Impeller.
Extra `flutter run` arguments can be appended, e.g.:

```bash
./scripts/run.sh linux --dart-define=API_URL=http://localhost:3000
```

Without the script you can always call `flutter run -d <device>` directly.

### Testing & Code Coverage

To run all unit and widget tests:

```bash
flutter test
```

To run tests with code coverage:

```bash
flutter test --coverage
```

Before pushing, also check formatting and static analysis:

```bash
dart format lib test
flutter analyze
```

---

## Build Instructions

> [!NOTE]
> Deploy automation is not set up yet. This document only covers local builds.

### Intro & Config

App metadata (branch, version, build date) lives in `lib/core/config/global.dart`
and is synced into platform files with:

```bash
./scripts/sync-version.sh
./scripts/sync-branch.sh
```

### Web

```bash
flutter build web
```

### Android

```bash
flutter build apk
# or for Play Store
flutter build appbundle
```

Create `android/local.properties` with your SDK path if needed:

```properties
sdk.dir=/home/user/Android/Sdk
```

### Other Platforms

#### iOS

```bash
flutter build ipa
```

#### Windows / macOS / Linux

```bash
flutter build windows
flutter build macos
flutter build linux
```

---

## Security & Legal

- **Security Policy**: Please refer to our [SECURITY.md](SECURITY.md) for instructions on how to report vulnerabilities.
- **Code of Conduct**: All contributors are expected to follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **License**: This project is licensed under the GPL-3.0 License. See [LICENSE](LICENSE) for details.
