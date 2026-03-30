import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";

import ToggleSelector from "@/src/components/ToggleSelector";
import InputDeviceDropdown from "@/src/components/DropdownMenu";
import settingsManager from "@/src/utils/global/SettingsManager";

import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";

export default function CommsRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
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
    { label: "OFF", value: "OFF" },
    { label: "Audio Only", value: "AUDIO_ONLY" },
    { label: "Video Only", value: "VIDEO_ONLY" },
    { label: "Both", value: "BOTH" },
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
    { label: "OFF", value: "OFF" },
    { label: "ON", value: "ON" },
  ];

  const noiseSuppressionOptions = [
    { label: "Off", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  const expanderOptions = [
    { label: "Off", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  const noiseGateOptions = [
    { label: "Off", value: "OFF" },
    { label: "Adaptive", value: "ADAPTIVE" },
    { label: "Hybrid", value: "HYBRID" },
    { label: "Manual", value: "MANUAL" },
  ];

  // Threshold expressed as string options (dB steps)
  const noiseGateThresholdOptions = [
    { label: "-60 dB", value: "-60" },
    { label: "-40 dB", value: "-40" },
    { label: "-20 dB", value: "-20" },
    { label: "0 dB", value: "0" },
  ];

  const typingAttenuationOptions = [
    { label: "Off", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  if (isLoading) {
    return (
      <>
        <HeaderWithBackArrow title={"Comms"} onBack={onBack} />
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </>
    );
  }

  if (!audioSettings) {
    return (
      <>
        <HeaderWithBackArrow title={"Comms"} onBack={onBack} />
        <View style={styles.container}>
          <Text style={styles.errorText}>Error loading settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <HeaderWithBackArrow title={"Comms"} onBack={onBack} />
      <SettingsPageScrollview>
        <SettingsCard>
          <Text style={styles.sectionTitle}>Input Devices</Text>
          <View style={styles.warningContainer}>
            <Text style={[styles.warningText, { color: "yellow" }]}>
              ⚠️ Warning: Changes to input devices will not affect chat
              functionality at the moment.
            </Text>
          </View>

          {devicesLoading ? (
            <View style={styles.disabledField}>
              <Text style={styles.label}>Loading devices...</Text>
            </View>
          ) : (
            <>
              <InputDeviceDropdown
                label="Microphone"
                value={
                  audioSettings.microphoneDeviceId ||
                  (audioDeviceOptions.length > 0
                    ? audioDeviceOptions[0].value
                    : "")
                }
                options={
                  audioDeviceOptions.length > 0
                    ? audioDeviceOptions
                    : [{ label: "No microphones found", value: "" }]
                }
                onValueChange={(value) =>
                  updateSetting("microphoneDeviceId", value)
                }
                theme={theme}
                disabled={audioDeviceOptions.length === 0}
              />

              <InputDeviceDropdown
                label="Webcam"
                value={
                  audioSettings.webcamDeviceId ||
                  (videoDeviceOptions.length > 0
                    ? videoDeviceOptions[0].value
                    : "")
                }
                options={
                  videoDeviceOptions.length > 0
                    ? videoDeviceOptions
                    : [{ label: "No cameras found", value: "" }]
                }
                onValueChange={(value) =>
                  updateSetting("webcamDeviceId", value)
                }
                theme={theme}
                disabled={videoDeviceOptions.length === 0}
              />
            </>
          )}

          <Text style={styles.fieldLabel}>Entry Mode</Text>
          <ToggleSelector
            options={entryModeOptions}
            value={audioSettings.entryMode || "AUDIO_ONLY"}
            onChange={(value) => updateSetting("entryMode", value)}
          />
        </SettingsCard>

        <SettingsCard>
          <Text style={styles.sectionTitle}>Video Settings</Text>
          <Text style={styles.fieldLabel}>Webcam Quality</Text>
          <ToggleSelector
            options={qualityOptions}
            value={audioSettings.webcamQuality || "HD"}
            onChange={(value) => updateSetting("webcamQuality", value)}
          />
          <Text style={styles.fieldLabel}>Webcam FPS</Text>
          <ToggleSelector
            options={fpsOptions}
            value={String(audioSettings.webcamFPS || 30)}
            onChange={(value) => updateSetting("webcamFPS", Number(value))}
          />
        </SettingsCard>

        <SettingsCard>
          <Text style={styles.sectionTitle}>Screen Share Settings</Text>
          <Text style={styles.fieldLabel}>Screen Share Quality</Text>
          <ToggleSelector
            options={qualityOptions}
            value={audioSettings.screenShareQuality || "HD"}
            onChange={(value) => updateSetting("screenShareQuality", value)}
          />
          <Text style={styles.fieldLabel}>Screen Share FPS</Text>
          <ToggleSelector
            options={fpsOptions}
            value={String(audioSettings.screenShareFPS || 30)}
            onChange={(value) => updateSetting("screenShareFPS", Number(value))}
          />
          <Text style={styles.fieldLabel}>Screen Share Audio</Text>
          <ToggleSelector
            options={audioOptions}
            value={audioSettings.screenShareAudio ? "ON" : "OFF"}
            onChange={(value) =>
              updateSetting("screenShareAudio", value === "ON")
            }
          />
        </SettingsCard>

        <SettingsCard>
          <Text style={styles.sectionTitle}>Audio Processing</Text>
          <Text style={styles.fieldLabel}>Noise Suppression</Text>
          <ToggleSelector
            options={noiseSuppressionOptions}
            value={audioSettings.noiseSuppressionLevel || "MEDIUM"}
            onChange={(value) =>
              updateSetting("noiseSuppressionLevel", value)
            }
          />

          <Text style={styles.fieldLabel}>Expander</Text>
          <ToggleSelector
            options={expanderOptions}
            value={audioSettings.expanderLevel || "MEDIUM"}
            onChange={(value) => updateSetting("expanderLevel", value)}
          />

          <Text style={styles.fieldLabel}>Noise Gate</Text>
          <ToggleSelector
            options={noiseGateOptions}
            value={audioSettings.noiseGateType || "ADAPTIVE"}
            onChange={(value) => updateSetting("noiseGateType", value)}
          />

          {(audioSettings.noiseGateType === "HYBRID" ||
            audioSettings.noiseGateType === "MANUAL") && (
            <>
              <Text style={styles.fieldLabel}>Noise Gate Threshold</Text>
              <ToggleSelector
                options={noiseGateThresholdOptions}
                value={String(audioSettings.noiseGateThreshold || -20)}
                onChange={(value) =>
                  updateSetting("noiseGateThreshold", Number(value))
                }
              />
            </>
          )}

          <Text style={styles.fieldLabel}>Typing Attenuation</Text>
          <ToggleSelector
            options={typingAttenuationOptions}
            value={audioSettings.typingAttenuationLevel || "MEDIUM"}
            onChange={(value) =>
              updateSetting("typingAttenuationLevel", value)
            }
          />
        </SettingsCard>

        {__DEV__ && (
          <SettingsCard>
            <Text style={styles.debugTitle}>Current Settings:</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(audioSettings, null, 2)}
            </Text>
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
      backgroundColor: theme.backgroundCard,
      borderRadius: 10,
      opacity: 0.6,
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
  });