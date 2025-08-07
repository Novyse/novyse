import React, { useContext } from "react";
import { StyleSheet, View, Text, Switch, ScrollView } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";
import AudioDropdown from "../components/settings/vocal-chat/AudioDropdown";
import ThresholdSlider from "../components/settings/vocal-chat/ThresholdSlider";

const VocalChatPage = () => {
  const { theme } = useContext(ThemeContext);
  const { audioSettings, updateSetting, isLoading } = {}; // need the json method
  const styles = createStyle(theme);

  // Dropdown options
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

  return (
    <ScreenLayout>
      <ScrollView style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />
        
        {/* Main switch to enable/disable audio processing */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Audio Processing</Text>
          <Switch
            trackColor={{ false: "#767577", true: theme.primary || "#81b0ff" }}
            thumbColor={
              audioSettings.isAudioProcessingEnabled 
                ? theme.accent || "#f5dd4b" 
                : "#f4f3f4"
            }
            ios_backgroundColor="#3e3e3e"
            onValueChange={(value) => updateSetting('isAudioProcessingEnabled', value)}
            value={audioSettings.isAudioProcessingEnabled}
          />
        </View>

        {/* Detailed settings section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          
          <AudioDropdown
            label="Noise Suppression"
            value={audioSettings.noiseSuppressionLevel}
            options={noiseSuppressionOptions}
            onValueChange={(value) => updateSetting('noiseSuppressionLevel', value)}
            theme={theme}
            disabled={!audioSettings.isAudioProcessingEnabled}
          />

          <AudioDropdown
            label="Expander"
            value={audioSettings.expanderLevel}
            options={expanderOptions}
            onValueChange={(value) => updateSetting('expanderLevel', value)}
            theme={theme}
            disabled={!audioSettings.isAudioProcessingEnabled}
          />

          <AudioDropdown
            label="Noise Gate"
            value={audioSettings.noiseGateType}
            options={noiseGateOptions}
            onValueChange={(value) => updateSetting('noiseGateType', value)}
            theme={theme}
            disabled={!audioSettings.isAudioProcessingEnabled}
          />

          {/* Noise gate threshold slider - visible only for HYBRID and MANUAL */}
          {(audioSettings.noiseGateType === 'HYBRID' || audioSettings.noiseGateType === 'MANUAL') && 
           audioSettings.isAudioProcessingEnabled && (
            <ThresholdSlider
              label="Noise Gate Threshold"
              value={audioSettings.noiseGateThreshold}
              onValueChange={(value) => updateSetting('noiseGateThreshold', Math.round(value))}
              theme={theme}
              min={-60}
              max={0}
              step={1}
              unit="dB"
            />
          )}

          <AudioDropdown
            label="Typing Attenuation"
            value={audioSettings.typingAttenuationLevel}
            options={typingAttenuationOptions}
            onValueChange={(value) => updateSetting('typingAttenuationLevel', value)}
            theme={theme}
            disabled={!audioSettings.isAudioProcessingEnabled}
          />
        </View>
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
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 50,
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
      fontWeight: '600',
    },
    settingsSection: {
      marginTop: 10,
      paddingHorizontal: 5,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 15,
      marginTop: 10,
    },
  });

export default VocalChatPage;