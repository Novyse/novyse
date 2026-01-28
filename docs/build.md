> [!NOTE]  
> The build process described in this documentation is likely to be automated in the future to streamline development and deployment. This document will remain available to ensure transparency, allowing developers to understand the underlying steps and verify the automation's correctness.

# Build Documentation

## Index

- [Intro](#intro)
- [Web](#web)
- [Android](#android)
- [iOS](#ios)
- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)

## Intro

> [!IMPORTANT]  
> Before building the application, ensure you update the `app.config.js` file to switch the environment from `development` to `preview` or `production`, depending on your target build. This configuration affects various aspects of the app, such as API endpoints, logging levels, and feature toggles.

Additionally, update related values in the config file accordingly, including:

- Version numbers (e.g., semantic versioning like 1.0.0)
- Build number (incremental integer for tracking builds)
- Build date (current timestamp or date string)

These changes ensure the build reflects the correct environment and metadata.

## Web

Building for production on the web is straightforward. Run the following command to export the web build:

```
npx expo export -p web
```

This command generates a `/dist` directory containing the production-ready web assets. You can serve these files using a web server like Nginx, Apache, or any static file host.

## Android

### Development Build

For a development build on Android, follow these steps:

1. Clean and prepare the native project:
   ```
   npx expo prebuild --clean
   ```
2. Create a `local.properties` file inside the `android/` folder with the following content (adjust the SDK path based on your system):
   ```
   # example
   sdk.dir=C:\\Users\\ISRaiken\\AppData\\Local\\Android\\Sdk
   ```
3. Run the Android build:
   ```
   npx expo run:android --no-build-cache
   ```
   Alternatively, you can use:
   ```
   npx expo run:android
   ```

> [!WARNING]  
> If you encounter a "path too long 260 char" error on Windows, you need to enable long paths support using the following PowerShell command (run as Administrator):
>
> ```
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```
>
> To ensure compatibility with the latest build tools, download the latest Ninja .exe from the [Ninja repository releases](https://github.com/ninja-build/ninja/releases). Replace the existing `ninja.exe` in the following path:  
> `C:\Users\{LOCAL_USER}\AppData\Local\Android\Sdk\cmake\{VERSION}\bin`  
> (For example, in my case was: `C:\Users\ISRaiken\AppData\Local\Android\Sdk\cmake\3.22.1\bin`)

### Production Build

For a production build on Android, follow these steps:

1. Clean and prepare the native project:
   ```
   npx expo prebuild --clean
   ```
2. Build the app:
   ```
   npx eas build --platform android
   ```

## iOS

> [!WARNING]  
> Building for iOS is not possible as of now, so there is no documentation available.

First test done, not working :(

## Windows

> [!WARNING]  
> Building for Windows is not possible as of now, so there is no documentation available.

## macOS

> [!WARNING]  
> Building for macOS is not possible as of now, so there is no documentation available.

## Linux

> [!WARNING]  
> Building for Linux is not possible as of now, so there is no documentation available.
