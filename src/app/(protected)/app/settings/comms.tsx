import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";

import ToggleSelector from "@/src/components/ToggleSelector";
import InputDeviceDropdown from "@/src/components/DropdownMenu";
import settingsManager from "@/src/utils/global/SettingsManager";

import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";

export default function CommsRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const [audioSettings, setAudioSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<any[]>([]);
  const [videoDevices, setVideoDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const styles = createStyle(theme);

  useEffect(() => {
    loadSettings();
    loadDevices();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings =
        await settingsManager.getPageParameters("settings.comms");
      setAudioSettings(settings);
    } catch (error) {
      console.error("Error loading vocal chat settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const success = await settingsManager.setSingleParameter(
        `settings.comms.${key}`,
        value,
      );
      if (success) {
        setAudioSettings((prev: any) => ({
          ...prev,
          [key]: value,
        }));
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      await loadSettings();
    }
  };

  const loadDevices = async () => {
    try {
      setDevicesLoading(true);
      return;
    } catch (error) {
      console.error("Error loading devices:", error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const audioDeviceOptions = audioDevices.map((device) => ({
    label: device.label || `Default ${device.deviceId.substring(0, 8)}`,
    value: device.deviceId,
  }));

  const videoDeviceOptions = videoDevices.map((device) => ({
    label: device.label || `Default ${device.deviceId.substring(0, 8)}`,
    value: device.deviceId,
  }));

  const entryModeOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.audioOnly"), value: "AUDIO_ONLY" },
    { label: t("settings.comms.videoOnly"), value: "VIDEO_ONLY" },
    { label: t("settings.comms.both"), value: "BOTH" },
  ];

  const qualityOptions = [
    { label: "HD", value: "HD" },
    { label: "Full HD", value: "FULL_HD" },
    { label: "2K", value: "2K" },
    { label: "4K", value: "4K" },
  ];

  const fpsOptions = [
    { label: "15", value: "15" },
    { label: "24", value: "24" },
    { label: "30", value: "30" },
    { label: "60", value: "60" },
    { label: "120", value: "120" },
  ];

  const audioOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.on"), value: "ON" },
  ];

  const noiseSuppressionOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.low"), value: "LOW" },
    { label: t("settings.comms.medium"), value: "MEDIUM" },
    { label: t("settings.comms.high"), value: "HIGH" },
  ];

  const expanderOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.low"), value: "LOW" },
    { label: t("settings.comms.medium"), value: "MEDIUM" },
    { label: t("settings.comms.high"), value: "HIGH" },
  ];

  const noiseGateOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.adaptive"), value: "ADAPTIVE" },
    { label: t("settings.comms.hybrid"), value: "HYBRID" },
    { label: t("settings.comms.manual"), value: "MANUAL" },
  ];

  // Threshold expressed as string options (dB steps)
  const noiseGateThresholdOptions = [
    { label: "-60 dB", value: "-60" },
    { label: "-40 dB", value: "-40" },
    { label: "-20 dB", value: "-20" },
    { label: "0 dB", value: "0" },
  ];

  const typingAttenuationOptions = [
    { label: t("settings.comms.off"), value: "OFF" },
    { label: t("settings.comms.low"), value: "LOW" },
    { label: t("settings.comms.medium"), value: "MEDIUM" },
    { label: t("settings.comms.high"), value: "HIGH" },
  ];

  if (isLoading) {
    return (
      <>
        <HeaderWithBackArrow
          translationKey="settings.menu.comms"
          onBack={onBack}
        />
        <View style={styles.container}>
          <AppText
            style={styles.loadingText}
            translationKey="settings.comms.loadingSettings"
          />
        </View>
      </>
    );
  }

  if (!audioSettings) {
    return (
      <>
        <HeaderWithBackArrow
          translationKey="settings.menu.comms"
          onBack={onBack}
        />
        <View style={styles.container}>
          <AppText
            style={styles.errorText}
            translationKey="settings.comms.errorLoadingSettings"
          />
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <AppText
              style={styles.retryButtonText}
              translationKey="settings.comms.retry"
            />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.comms"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.bannerContainer}>
          <AppText
            style={styles.bannerText}
            translationKey="common.developerNote"
          />
        </View>
        <SettingsCard>
          <AppText
            style={styles.sectionTitle}
            translationKey="settings.comms.inputDevices"
          />
          <View style={styles.warningContainer}>
            <AppText
              style={[styles.warningText, { color: "yellow" }]}
              translationKey="settings.comms.inputDevicesWarning"
            />
          </View>

          {!devicesLoading ? (
            <View style={styles.disabledField}>
              <AppText
                style={styles.label}
                translationKey="settings.comms.loadingDevices"
              />
            </View>
          ) : (
            <>
              <InputDeviceDropdown
                label={t("settings.comms.microphone")}
                value={
                  audioSettings.microphoneDeviceId ||
                  (audioDeviceOptions.length > 0
                    ? audioDeviceOptions[0].value
                    : "")
                }
                options={
                  audioDeviceOptions.length > 0
                    ? audioDeviceOptions
                    : [
                        {
                          label: t("settings.comms.noMicrophonesFound"),
                          value: "",
                        },
                      ]
                }
                onValueChange={(value) =>
                  updateSetting("microphoneDeviceId", value)
                }
                theme={theme}
                disabled={audioDeviceOptions.length === 0}
              />

              <InputDeviceDropdown
                label={t("settings.comms.webcam")}
                value={
                  audioSettings.webcamDeviceId ||
                  (videoDeviceOptions.length > 0
                    ? videoDeviceOptions[0].value
                    : "")
                }
                options={
                  videoDeviceOptions.length > 0
                    ? videoDeviceOptions
                    : [{ label: t("settings.comms.noCamerasFound"), value: "" }]
                }
                onValueChange={(value) =>
                  updateSetting("webcamDeviceId", value)
                }
                theme={theme}
                disabled={videoDeviceOptions.length === 0}
              />
            </>
          )}

          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.entryMode"
          />
          <ToggleSelector
            options={entryModeOptions}
            value={audioSettings.entryMode || "AUDIO_ONLY"}
            onChange={(value) => updateSetting("entryMode", value)}
          />
        </SettingsCard>

        <SettingsCard>
          <AppText
            style={styles.sectionTitle}
            translationKey="settings.comms.videoSettings"
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.webcamQuality"
          />
          <ToggleSelector
            options={qualityOptions}
            value={audioSettings.webcamQuality || "HD"}
            onChange={(value) => updateSetting("webcamQuality", value)}
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.webcamFPS"
          />
          <ToggleSelector
            options={fpsOptions}
            value={String(audioSettings.webcamFPS || 30)}
            onChange={(value) => updateSetting("webcamFPS", Number(value))}
          />
        </SettingsCard>

        <SettingsCard>
          <AppText
            style={styles.sectionTitle}
            translationKey="settings.comms.screenShareSettings"
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.screenShareQuality"
          />
          <ToggleSelector
            options={qualityOptions}
            value={audioSettings.screenShareQuality || "HD"}
            onChange={(value) => updateSetting("screenShareQuality", value)}
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.screenShareFPS"
          />
          <ToggleSelector
            options={fpsOptions}
            value={String(audioSettings.screenShareFPS || 30)}
            onChange={(value) => updateSetting("screenShareFPS", Number(value))}
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.screenShareAudio"
          />
          <ToggleSelector
            options={audioOptions}
            value={audioSettings.screenShareAudio ? "ON" : "OFF"}
            onChange={(value) =>
              updateSetting("screenShareAudio", value === "ON")
            }
          />
        </SettingsCard>

        <SettingsCard>
          <AppText
            style={styles.sectionTitle}
            translationKey="settings.comms.audioProcessing"
          />
          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.noiseSuppression"
          />
          <ToggleSelector
            options={noiseSuppressionOptions}
            value={audioSettings.noiseSuppressionLevel || "MEDIUM"}
            onChange={(value) => updateSetting("noiseSuppressionLevel", value)}
          />

          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.expander"
          />
          <ToggleSelector
            options={expanderOptions}
            value={audioSettings.expanderLevel || "MEDIUM"}
            onChange={(value) => updateSetting("expanderLevel", value)}
          />

          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.noiseGate"
          />
          <ToggleSelector
            options={noiseGateOptions}
            value={audioSettings.noiseGateType || "ADAPTIVE"}
            onChange={(value) => updateSetting("noiseGateType", value)}
          />

          {(audioSettings.noiseGateType === "HYBRID" ||
            audioSettings.noiseGateType === "MANUAL") && (
            <>
              <AppText
                style={styles.fieldLabel}
                translationKey="settings.comms.noiseGateThreshold"
              />
              <ToggleSelector
                options={noiseGateThresholdOptions}
                value={String(audioSettings.noiseGateThreshold || -20)}
                onChange={(value) =>
                  updateSetting("noiseGateThreshold", Number(value))
                }
              />
            </>
          )}

          <AppText
            style={styles.fieldLabel}
            translationKey="settings.comms.typingAttenuation"
          />
          <ToggleSelector
            options={typingAttenuationOptions}
            value={audioSettings.typingAttenuationLevel || "MEDIUM"}
            onChange={(value) => updateSetting("typingAttenuationLevel", value)}
          />
        </SettingsCard>

        {__DEV__ && (
          <SettingsCard>
            <AppText
              style={styles.debugTitle}
              translationKey="settings.comms.currentSettings"
            />
            <AppText style={styles.debugText}>
              {JSON.stringify(audioSettings, null, 2)}
            </AppText>
          </SettingsCard>
        )}
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
    errorText: {
      color: theme.danger,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 5,
      alignSelf: "center",
      marginTop: 20,
    },
    retryButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    label: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    fieldLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 15,
      marginTop: 10,
    },
    disabledField: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
      paddingHorizontal: 15,
      marginVertical: 5,
      backgroundColor: theme.primary,
      borderRadius: 10,
    },
    debugTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 5,
    },
    debugText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontFamily: "monospace",
    },
    warningContainer: {
      backgroundColor: "rgba(255, 193, 7, 0.1)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      borderLeftWidth: 4,
      borderLeftColor: "#ffc107",
    },
    warningText: {
      fontSize: 14,
      lineHeight: 20,
    },
    bannerContainer: {
      backgroundColor: "#d32f2f",
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#b71c1c",
    },
    bannerText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 20,
    },
  });
