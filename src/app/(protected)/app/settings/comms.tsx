import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";

import SegmentedSwitch from "@/src/components/ui/switch/SegmentedSwitch";
import CameraSelector from "@/src/components/comms/bottomBar/CameraSelector";
import MicrophoneSelector from "@/src/components/comms/bottomBar/MicrophoneSelector";
import Button from "@/src/components/ui/button/Button";
import settingsManager from "@/src/utils/global/SettingsManager";
import Label from "@/src/components/ui/label/Label";
import { usesNativeAudioRouting } from "@/src/utils/comms/nativeAudio";

import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/features/settings/SettingsCard";
import StatusMessage from "@/src/components/features/status/StatusMessage";

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
  const [micModalVisible, setMicModalVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
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
          <Typography
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
          <Typography
            style={styles.dangerText}
            translationKey="settings.comms.errorLoadingSettings"
          />
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Typography
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
        <StatusMessage
          type="warning"
          translationKey="common.developerNote"
          closable={false}
        />
        <SettingsCard>
          <Typography
            style={styles.sectionTitle}
            translationKey="settings.comms.inputDevices"
          />
          <StatusMessage
            type="warning"
            translationKey="settings.comms.inputDevicesWarning"
            closable={false}
          />

          {devicesLoading ? (
            <View style={styles.disabledField}>
              <Typography translationKey="settings.comms.loadingDevices" />
            </View>
          ) : (
            <>
              {!usesNativeAudioRouting && (
                <>
                  <Label translationKey="settings.comms.microphone" />
                  <Button
                    text={
                      audioDeviceOptions.find(
                        (o) => o.value === audioSettings.microphoneDeviceId,
                      )?.label || t("settings.comms.microphone")
                    }
                    onPress={() => setMicModalVisible(true)}
                    style={{ width: "100%", marginBottom: 15 }}
                  />
                </>
              )}

              <Label translationKey="settings.comms.webcam" />
              <Button
                text={
                  videoDeviceOptions.find(
                    (o) => o.value === audioSettings.webcamDeviceId,
                  )?.label || t("settings.comms.webcam")
                }
                onPress={() => setCameraModalVisible(true)}
                style={{ width: "100%", marginBottom: 15 }}
              />

              {!usesNativeAudioRouting && (
                <MicrophoneSelector
                  visible={micModalVisible}
                  onClose={() => setMicModalVisible(false)}
                  currentDeviceId={
                    audioSettings.microphoneDeviceId || "default"
                  }
                  onMicrophoneSelected={(deviceId) =>
                    updateSetting("microphoneDeviceId", deviceId)
                  }
                />
              )}

              <CameraSelector
                visible={cameraModalVisible}
                onClose={() => setCameraModalVisible(false)}
                currentDeviceId={audioSettings.webcamDeviceId || "default"}
                onCameraSelected={(deviceId) =>
                  updateSetting("webcamDeviceId", deviceId)
                }
              />
            </>
          )}

          <SegmentedSwitch
            labelTranslationKey="settings.comms.entryMode"
            options={entryModeOptions}
            value={audioSettings.entryMode || "AUDIO_ONLY"}
            onChange={(value) => updateSetting("entryMode", value)}
          />
        </SettingsCard>

        <SettingsCard>
          <Typography
            style={styles.sectionTitle}
            translationKey="settings.comms.videoSettings"
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.webcamQuality"
            options={qualityOptions}
            value={audioSettings.webcamQuality || "HD"}
            onChange={(value) => updateSetting("webcamQuality", value)}
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.webcamFPS"
            options={fpsOptions}
            value={String(audioSettings.webcamFPS || 30)}
            onChange={(value) => updateSetting("webcamFPS", Number(value))}
          />
        </SettingsCard>

        <SettingsCard>
          <Typography
            style={styles.sectionTitle}
            translationKey="settings.comms.screenShareSettings"
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.screenShareQuality"
            options={qualityOptions}
            value={audioSettings.screenShareQuality || "HD"}
            onChange={(value) => updateSetting("screenShareQuality", value)}
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.screenShareFPS"
            options={fpsOptions}
            value={String(audioSettings.screenShareFPS || 30)}
            onChange={(value) => updateSetting("screenShareFPS", Number(value))}
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.screenShareAudio"
            options={audioOptions}
            value={audioSettings.screenShareAudio ? "ON" : "OFF"}
            onChange={(value) =>
              updateSetting("screenShareAudio", value === "ON")
            }
          />
        </SettingsCard>

        <SettingsCard>
          <Typography
            style={styles.sectionTitle}
            translationKey="settings.comms.audioProcessing"
          />
          <SegmentedSwitch
            labelTranslationKey="settings.comms.noiseSuppression"
            options={noiseSuppressionOptions}
            value={audioSettings.noiseSuppressionLevel || "MEDIUM"}
            onChange={(value) => updateSetting("noiseSuppressionLevel", value)}
          />

          <SegmentedSwitch
            labelTranslationKey="settings.comms.expander"
            options={expanderOptions}
            value={audioSettings.expanderLevel || "MEDIUM"}
            onChange={(value) => updateSetting("expanderLevel", value)}
          />

          <SegmentedSwitch
            labelTranslationKey="settings.comms.noiseGate"
            options={noiseGateOptions}
            value={audioSettings.noiseGateType || "ADAPTIVE"}
            onChange={(value) => updateSetting("noiseGateType", value)}
          />

          {(audioSettings.noiseGateType === "HYBRID" ||
            audioSettings.noiseGateType === "MANUAL") && (
            <>
              <SegmentedSwitch
                labelTranslationKey="settings.comms.noiseGateThreshold"
                options={noiseGateThresholdOptions}
                value={String(audioSettings.noiseGateThreshold || -20)}
                onChange={(value) =>
                  updateSetting("noiseGateThreshold", Number(value))
                }
              />
            </>
          )}

          <SegmentedSwitch
            labelTranslationKey="settings.comms.typingAttenuation"
            options={typingAttenuationOptions}
            value={audioSettings.typingAttenuationLevel || "MEDIUM"}
            onChange={(value) => updateSetting("typingAttenuationLevel", value)}
          />
        </SettingsCard>

        {__DEV__ && (
          <SettingsCard>
            <Typography
              style={styles.debugTitle}
              translationKey="settings.comms.currentSettings"
            />
            <Typography style={styles.debugText}>
              {JSON.stringify(audioSettings, null, 2)}
            </Typography>
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
    dangerText: {
      color: theme.dangerText,
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
      color: theme.subtitle,
      fontSize: 12,
      fontFamily: "monospace",
    },
  });
