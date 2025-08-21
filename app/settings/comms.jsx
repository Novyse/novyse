import React, { useContext, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";
import SegmentedSelector from "../components/settings/vocal-chat/SegmentedSelector";
import ThresholdSlider from "../components/settings/vocal-chat/ThresholdSlider";
import settingsManager from "../utils/global/SettingsManager";

const CommsPage = () => {
  const { theme } = useContext(ThemeContext);
  const [audioSettings, setAudioSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const styles = createStyle(theme);

  // Carica le impostazioni al mount del componente
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsManager.getPageParameters(
        "settings.comms"
      );
      setAudioSettings(settings);
    } catch (error) {
      console.error("Error loading vocal chat settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const success = await settingsManager.setSingleParameter(
        `settings.comms.${key}`,
        value
      );
      if (success) {
        // Aggiorna lo stato locale immediatamente per UI reattiva
        setAudioSettings((prev) => ({
          ...prev,
          [key]: value,
        }));
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      // In caso di errore, ricarica le impostazioni
      await loadSettings();
    }
  };

  // Options for webcam and microphone settings
  const entryModeOptions = [
    { label: "OFF", value: "OFF" },
    { label: "Audio Only", value: "AUDIO_ONLY" },
    { label: "Video Only", value: "VIDEO_ONLY" },
    { label: "Both", value: "BOTH" },
  ];

  const qualityOptions = [
    { label: "HD (720p)", value: "HD" },
    { label: "Full HD (1080p)", value: "FULL_HD" },
    { label: "2K (1440p)", value: "2K" },
    { label: "4K (2160p)", value: "4K" },
  ];

  // FPS options (common values)
  const fpsOptions = [
    { label: "15 FPS", value: 15 },
    { label: "24 FPS", value: 24 },
    { label: "30 FPS", value: 30 },
    { label: "60 FPS", value: 60 },
    { label: "120 FPS", value: 120 },
  ];

  // Audio modifiers options
  const noiseSuppressionOptions = [
    { label: "Disabled", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  const expanderOptions = [
    { label: "Disabled", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  const noiseGateOptions = [
    { label: "Disabled", value: "OFF" },
    { label: "Adaptive", value: "ADAPTIVE" },
    { label: "Hybrid", value: "HYBRID" },
    { label: "Manual", value: "MANUAL" },
  ];

  const typingAttenuationOptions = [
    { label: "Disabled", value: "OFF" },
    { label: "Low", value: "LOW" },
    { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" },
  ];

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.container}>
          <HeaderWithBackArrow goBackTo="./" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Se audioSettings è null o undefined, mostra un messaggio di errore
  if (!audioSettings) {
    return (
      <ScreenLayout>
        <View style={styles.container}>
          <HeaderWithBackArrow goBackTo="./" />
          <Text style={styles.errorText}>Error loading settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />

        {/* Input Devices Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionTitle}>Input Devices</Text>
          <View style={styles.disabledField}>
            <Text style={styles.label}>Microphone</Text>
            <Text style={styles.disabledValue}>DEFAULT</Text>
          </View>
          <View style={styles.disabledField}>
            <Text style={styles.label}>Webcam</Text>
            <Text style={styles.disabledValue}>DEFAULT</Text>
          </View>
          <SegmentedSelector
            label="Entry Mode"
            value={audioSettings.entryMode || "AUDIO_ONLY"}
            options={entryModeOptions}
            onValueChange={(value) => updateSetting("entryMode", value)}
            theme={theme}
          />
        </View>

        {/* Video Settings Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionTitle}>Video Settings</Text>
          <SegmentedSelector
            label="Webcam Quality"
            value={audioSettings.webcamQuality || "HD"}
            options={qualityOptions}
            onValueChange={(value) => updateSetting("webcamQuality", value)}
            theme={theme}
          />
          <SegmentedSelector
            label="Webcam FPS"
            value={audioSettings.webcamFPS || 30}
            options={fpsOptions}
            onValueChange={(value) => updateSetting("webcamFPS", value)}
            theme={theme}
          />
        </View>

        {/* Screen Share Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionTitle}>Screen Share Settings</Text>
          <SegmentedSelector
            label="Screen Share Quality"
            value={audioSettings.screenShareQuality || "HD"}
            options={qualityOptions}
            onValueChange={(value) => updateSetting("screenShareQuality", value)}
            theme={theme}
          />
          <SegmentedSelector
            label="Screen Share FPS"
            value={audioSettings.screenShareFPS || 30}
            options={fpsOptions}
            onValueChange={(value) => updateSetting("screenShareFPS", value)}
            theme={theme}
          />
        </View>

        {/* Audio Processing Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionTitle}>Audio Processing</Text>
          <SegmentedSelector
            label="Noise Suppression"
            value={audioSettings.noiseSuppressionLevel || "MEDIUM"}
            options={noiseSuppressionOptions}
            onValueChange={(value) =>
              updateSetting("noiseSuppressionLevel", value)
            }
            theme={theme}
          />

          <SegmentedSelector
            label="Expander"
            value={audioSettings.expanderLevel || "MEDIUM"}
            options={expanderOptions}
            onValueChange={(value) => updateSetting("expanderLevel", value)}
            theme={theme}
          />

          <SegmentedSelector
            label="Noise Gate"
            value={audioSettings.noiseGateType || "ADAPTIVE"}
            options={noiseGateOptions}
            onValueChange={(value) => updateSetting("noiseGateType", value)}
            theme={theme}
          />

          {/* Noise gate threshold slider - visible only for HYBRID and MANUAL */}
          {(audioSettings.noiseGateType === "HYBRID" ||
            audioSettings.noiseGateType === "MANUAL") && (
            <ThresholdSlider
              label="Noise Gate Threshold"
              value={audioSettings.noiseGateThreshold || -20}
              onValueChange={(value) =>
                updateSetting("noiseGateThreshold", Math.round(value))
              }
              theme={theme}
              min={-60}
              max={0}
              step={1}
              unit="dB"
            />
          )}

          <SegmentedSelector
            label="Typing Attenuation"
            value={audioSettings.typingAttenuationLevel || "MEDIUM"}
            options={typingAttenuationOptions}
            onValueChange={(value) =>
              updateSetting("typingAttenuationLevel", value)
            }
            theme={theme}
          />
        </View>

        {/* Debug section */}
        {__DEV__ && (
          <View style={[styles.debugSection, styles.categoryContainer]}>
            <Text style={styles.debugTitle}>Current Settings:</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(audioSettings, null, 2)}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    pageTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "700",
    },
    resetButton: {
      backgroundColor: theme.danger || "#ff4444",
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 5,
    },
    resetButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
    errorText: {
      color: theme.danger || "#ff4444",
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
    retryButton: {
      backgroundColor: theme.primary || "#007AFF",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 5,
      alignSelf: "center",
      marginTop: 20,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
      paddingHorizontal: 15,
      marginVertical: 10,
      backgroundColor: theme.cardBackground || "gray",
      borderRadius: 10,
    },
    label: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    settingsSection: {
      marginTop: 10,
      paddingHorizontal: 5,
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
      backgroundColor: theme.cardBackground || "gray",
      borderRadius: 10,
      opacity: 0.6,
    },
    disabledValue: {
      color: theme.textSecondary || "#666",
      fontSize: 16,
      fontStyle: "italic",
    },
    debugSection: {
      marginTop: 20,
      padding: 10,
      backgroundColor: theme.cardBackground,
      borderRadius: 5,
    },
    debugTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 5,
    },
    debugText: {
      color: theme.textSecondary || "#666",
      fontSize: 12,
      fontFamily: "monospace",
    },
    categoryContainer: {
      backgroundColor: "#1c2539",
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
  });

export default CommsPage;
