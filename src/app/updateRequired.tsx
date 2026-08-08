import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

import { useThemeContext } from "@/src/context/ThemeContext";

import Typography from "@/src/components/ui/typography/Typography";

import { APP_VERSION, BRANCH } from "../../app.config";
import Platform, {
  getInstallSource,
  supportsAutoUpdate,
  type InstallSource,
} from "@/src/utils/device/type";
import { updaterRpc } from "@/src/utils/electron/system";

// --- Store URLs ---
// TODO: Replace placeholder IDs with actual store listing IDs
const STORE_URLS: Partial<Record<InstallSource, string>> = {
  "play-store": "https://play.google.com/store/apps/details?id=com.novyse",
  "app-store": "https://apps.apple.com/app/novyse/idXXXXXXXXXX",
  "windows-store": "ms-windows-store://pdp/?productid=XXXXXXXXXXX",
  "macos-store": "macappstore://apps.apple.com/app/novyse/idXXXXXXXXXX",
  "linux-snap": "snap://novyse",
  "linux-flatpak": "https://flathub.org/apps/com.novyse.Novyse",
};

const GITHUB_URL =
  BRANCH === "production"
    ? "https://github.com/Novyse/novyse/releases/latest"
    : "https://github.com/Novyse/novyse/releases";

// --- Button label translation keys by install source ---
const BUTTON_KEYS: Partial<Record<InstallSource, string>> = {
  "play-store": "layout.updateRequired.openPlayStore",
  "app-store": "layout.updateRequired.openAppStore",
  "android-apk": "layout.updateRequired.updateNow",
  "windows-nsis": "layout.updateRequired.updateNow",
  "windows-portable": "layout.updateRequired.openGitHub",
  "windows-store": "layout.updateRequired.openMicrosoftStore",
  "linux-appimage": "layout.updateRequired.updateNow",
  "linux-deb-rpm": "layout.updateRequired.updateNow",
  "linux-snap": "layout.updateRequired.updateViaSnap",
  "linux-flatpak": "layout.updateRequired.updateViaFlatpak",
  "macos-dmg": "layout.updateRequired.updateNow",
  "macos-store": "layout.updateRequired.openAppStore",
  web: "layout.updateRequired.refreshPage",
};

type UpdaterStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "downloaded"
  | "error";

export default function UpdateRequiredScreen() {
  const { theme } = useThemeContext();
  const { minVersion } = useLocalSearchParams();
  const router = useRouter();
  const styles = createStyle(theme);

  const [installSource, setInstallSource] = useState<InstallSource>("unknown");
  const [isLoading, setIsLoading] = useState(true);

  // Auto-update state
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>("idle");
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [updaterError, setUpdaterError] = useState<string | null>(null);

  // Detect install source on mount
  useEffect(() => {
    (async () => {
      try {
        const source = await getInstallSource();
        setInstallSource(source);
      } catch (err) {
        console.error("[UpdateRequired] Failed to detect install source:", err);
        setInstallSource("unknown");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Subscribe to updater status events (desktop auto-update only)
  useEffect(() => {
    if (Platform !== "desktop" || !supportsAutoUpdate(installSource)) return;

    const unsubscribe = updaterRpc.onStatus((event: any) => {
      switch (event.status) {
        case "checking":
          setUpdaterStatus("checking");
          break;
        case "available":
          // Automatically start download when update is found
          updaterRpc.download();
          setUpdaterStatus("downloading");
          break;
        case "downloading":
          setUpdaterStatus("downloading");
          setDownloadPercent(event.percent || 0);
          break;
        case "downloaded":
          setUpdaterStatus("downloaded");
          break;
        case "error":
          setUpdaterStatus("error");
          setUpdaterError(event.message || "Unknown error");
          break;
        case "not-available":
          // Shouldn't happen if the API says update is required, but handle it
          setUpdaterStatus("idle");
          break;
      }
    });

    return unsubscribe;
  }, [installSource]);

  const canAutoUpdate = supportsAutoUpdate(installSource);

  const handlePrimaryPress = useCallback(async () => {
    if (installSource === "web") {
      // Web: just reload the page
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }

    if (canAutoUpdate) {
      if (updaterStatus === "downloaded") {
        if (installSource === "android-apk") {
          try {
            const apkFile = new FileSystem.File(
              FileSystem.Paths.document,
              "update.apk",
            );
            const contentUri = await FileSystemLegacy.getContentUriAsync(
              apkFile.uri,
            );
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                flags: 1,
                type: "application/vnd.android.package-archive",
              },
            );
          } catch (err) {
            console.error("Failed to install APK:", err);
            setUpdaterError("Failed to install APK");
          }
        } else {
          // Install & restart per desktop
          updaterRpc.install();
        }
        return;
      }

      if (updaterStatus === "idle" || updaterStatus === "error") {
        if (installSource === "android-apk") {
          setUpdaterStatus("checking");
          setUpdaterError(null);

          try {
            const architectures = Device.supportedCpuArchitectures;
            if (architectures && architectures.length > 0) {
              const isProd = BRANCH === "production";
              const suffix = isProd ? "" : "-preview";

              const response = await fetch(
                "https://api.github.com/repos/Novyse/novyse/releases",
              );
              if (response.ok) {
                const releases = await response.json();
                const targetRelease = releases.find(
                  (r: any) => r.prerelease === !isProd,
                );

                if (targetRelease) {
                  let foundAsset = null;
                  for (const arch of architectures) {
                    const expectedAssetName = `novyse${suffix}-${arch}.apk`;
                    foundAsset = targetRelease.assets.find(
                      (a: any) => a.name === expectedAssetName,
                    );
                    if (foundAsset) break;
                  }

                  if (foundAsset) {
                    const url = foundAsset.browser_download_url;
                    setUpdaterStatus("downloading");

                    const destination = new FileSystem.File(
                      FileSystem.Paths.document,
                      "update.apk",
                    );
                    const file = await FileSystem.File.downloadFileAsync(
                      url,
                      destination,
                      {
                        idempotent: true,
                        onProgress: (data) => {
                          if (data.totalBytes > 0) {
                            const progress =
                              data.bytesWritten / data.totalBytes;
                            setDownloadPercent(progress * 100);
                          }
                        },
                      },
                    );

                    if (file) {
                      setUpdaterStatus("downloaded");
                      const contentUri =
                        await FileSystemLegacy.getContentUriAsync(file.uri);
                      await IntentLauncher.startActivityAsync(
                        "android.intent.action.VIEW",
                        {
                          data: contentUri,
                          flags: 1,
                          type: "application/vnd.android.package-archive",
                        },
                      );
                      return;
                    }
                  } else {
                    setUpdaterError("No matching APK found");
                    setUpdaterStatus("error");
                  }
                } else {
                  setUpdaterError("Release not found");
                  setUpdaterStatus("error");
                }
              } else {
                setUpdaterError("Failed to fetch releases");
                setUpdaterStatus("error");
              }
            } else {
              setUpdaterError("No architectures detected");
              setUpdaterStatus("error");
            }
          } catch (err) {
            console.error("[UpdateRequired] Failed to download APK:", err);
            setUpdaterError("Download failed");
            setUpdaterStatus("error");
          }
          return;
        } else {
          // download flow per desktop
          setUpdaterStatus("checking");
          setUpdaterError(null);
          updaterRpc.check();
          return;
        }
      }
      // If currently checking or downloading, button is disabled (no-op)
      return;
    }

    // Not auto-updatable: open the correct store or GitHub
    let url = STORE_URLS[installSource] || GITHUB_URL;
    Linking.openURL(url);
  }, [installSource, canAutoUpdate, updaterStatus]);

  // Determine the primary button text
  const getPrimaryButtonKey = (): string => {
    if (canAutoUpdate) {
      switch (updaterStatus) {
        case "checking":
          return "layout.updateRequired.checking";
        case "downloading":
          return "layout.updateRequired.downloading";
        case "downloaded":
          return "layout.updateRequired.installing";
        case "error":
          return (
            BUTTON_KEYS[installSource] ||
            "layout.updateRequired.downloadLatestVersion"
          );
        default:
          return "layout.updateRequired.updateNow";
      }
    }
    return (
      BUTTON_KEYS[installSource] ||
      "layout.updateRequired.downloadLatestVersion"
    );
  };

  const isPrimaryDisabled =
    canAutoUpdate &&
    (updaterStatus === "checking" || updaterStatus === "downloading");

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      {/* Text content */}
      <Typography
        style={styles.title}
        translationKey="layout.updateRequired.title"
      />
      <Typography
        style={styles.subtitle}
        translationKey="layout.updateRequired.subtitle"
      />
      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Typography
          style={styles.versionText}
          translationKey="layout.updateRequired.currentVersion"
          translationOptions={{
            version: APP_VERSION,
          }}
        />
        {minVersion && (
          <Typography
            style={styles.versionText}
            translationKey="layout.updateRequired.requiredVersion"
            translationOptions={{
              version: minVersion,
            }}
          />
        )}
      </View>

      {/* Progress bar for auto-update download */}
      {canAutoUpdate && updaterStatus === "downloading" && (
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBarFill, { width: `${downloadPercent}%` }]}
          />
        </View>
      )}

      {/* Error message */}
      {updaterError && (
        <Typography
          style={styles.errorText}
          translationKey="layout.updateRequired.autoUpdateError"
        />
      )}

      {/* CTA Button — context-aware */}
      <TouchableOpacity
        style={[styles.button, isPrimaryDisabled && styles.buttonDisabled]}
        onPress={handlePrimaryPress}
        activeOpacity={0.85}
        disabled={isPrimaryDisabled}
      >
        {isPrimaryDisabled && (
          <ActivityIndicator
            size="small"
            color={theme.text}
            style={styles.buttonSpinner}
          />
        )}
        <Typography
          style={styles.buttonText}
          translationKey={getPrimaryButtonKey()}
          translationOptions={{
            percent: downloadPercent,
          }}
        />
      </TouchableOpacity>

      {/* Fallback GitHub link for auto-update errors */}
      {canAutoUpdate && updaterStatus === "error" && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => Linking.openURL(GITHUB_URL)}
          activeOpacity={0.7}
        >
          <Typography
            style={styles.secondaryButtonText}
            translationKey="layout.updateRequired.openGitHub"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    logoContainer: {
      marginBottom: 32,
    },
    logo: {
      width: 72,
      height: 72,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.backgroundCard,
      borderWidth: 1.5,
      borderColor: theme.borderColor,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    iconBadgeText: {
      fontSize: 24,
      color: theme.text,
      fontWeight: "700",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 14,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtitle,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 22,
      maxWidth: 320,
    },
    versionContainer: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 24,
      backgroundColor: theme.backgroundMain,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    versionText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "600",
    },
    progressBarContainer: {
      width: "80%",
      maxWidth: 300,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundCard,
      marginBottom: 20,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    errorText: {
      fontSize: 13,
      color: theme.error || "#e74c3c",
      textAlign: "center",
      marginBottom: 12,
      paddingHorizontal: 20,
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 15,
      paddingHorizontal: 36,
      borderRadius: 12,
      shadowColor: theme.shadowColor,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonSpinner: {
      marginRight: 4,
    },
    buttonText: {
      color: theme.text,
      fontWeight: "700",
      fontSize: 16,
      letterSpacing: 0.2,
    },
    secondaryButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    secondaryButtonText: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 14,
      textDecorationLine: "underline",
    },
    linkText: {
      color: theme.textLink,
      textDecorationLine: "underline",
    },
  });
