import { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Linking,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

import { useThemeContext, type Theme } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import LinkTypography from "@/src/components/ui/typography/LinkTypography";
import Button from "@/src/components/ui/button/Button";

import { APP_VERSION, BRANCH } from "../../app.config";
import Platform, {
  getInstallSource,
  supportsAutoUpdate,
  type InstallSource,
} from "@/src/utils/device/type";
import { updaterRpc } from "@/src/utils/electron/system";
import logoNovyse from "@/assets/images/logo-novyse.png";


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
        }

        setUpdaterStatus("checking");
        setUpdaterError(null);
        updaterRpc.check();
        return;
      }
      return;
    }
    // Not auto-updatable: open the correct store or GitHub
    Linking.openURL(STORE_URLS[installSource] ?? GITHUB_URL);
  }, [installSource, canAutoUpdate, updaterStatus]);

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
            BUTTON_KEYS[installSource] ??
            "layout.updateRequired.downloadLatestVersion"
          );
        default:
          return "layout.updateRequired.updateNow";
      }
    }
    return (
      BUTTON_KEYS[installSource] ??
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
      <Image source={logoNovyse} style={styles.logo} resizeMode="contain" />

      <Typography
        size="xxl"
        weight="bold"
        style={styles.centered}
        translationKey="layout.updateRequired.title"
      />
      <Typography
        size="sm"
        variant="subtitle"
        style={styles.subtitle}
        translationKey="layout.updateRequired.subtitle"
      />

      <View style={styles.versions}>
        <Typography
          size="xs"
          weight="semibold"
          translationKey="layout.updateRequired.currentVersion"
          translationOptions={{ version: APP_VERSION }}
        />
        {minVersion ? (
          <Typography
            size="xs"
            weight="semibold"
            translationKey="layout.updateRequired.requiredVersion"
            translationOptions={{ version: minVersion }}
          />
        ) : null}
      </View>

      {canAutoUpdate && updaterStatus === "downloading" ? (
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${downloadPercent}%` }]}
          />
        </View>
      ) : null}

      {updaterError ? (
        <Typography
          size="sm"
          variant="danger"
          style={styles.error}
          translationKey="layout.updateRequired.autoUpdateError"
        />
      ) : null}

      <Button
        translationKey={getPrimaryButtonKey()}
        translationOptions={{ percent: Math.round(downloadPercent) }}
        onPress={handlePrimaryPress}
        disabled={isPrimaryDisabled}
        weight="bold"
        style={styles.cta}
        textStyle={{ color: theme.text }}
      />

      {canAutoUpdate && updaterStatus === "error" ? (
        <LinkTypography
          size="sm"
          weight="semibold"
          href={GITHUB_URL}
          translationKey="layout.updateRequired.openGitHub"
        />
      ) : null}
    </View>
  );
}

const createStyle = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 16,
    },
    logo: {
      width: 72,
      height: 72,
      marginBottom: 8,
    },
    centered: {
      textAlign: "center",
    },
    subtitle: {
      textAlign: "center",
      maxWidth: 320,
    },
    versions: {
      flexDirection: "row",
      gap: 16,
      backgroundColor: theme.backgroundMain,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    progressTrack: {
      width: "80%",
      maxWidth: 300,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundCard,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    error: {
      textAlign: "center",
    },
    cta: {
      alignSelf: "center",
      backgroundColor: theme.primary,
    },
  });
