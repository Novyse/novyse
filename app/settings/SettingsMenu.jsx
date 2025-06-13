import React, { useContext } from "react";
import { Text, StyleSheet, ScrollView } from "react-native"; // Aggiungi ScrollView
import Constants from 'expo-constants'; 
import SmartBackground from "../components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../components/SettingsMenuItem";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { PaintBoardIcon, Folder01Icon } from "@hugeicons/core-free-icons";

const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Accedi alla versione tramite Constants
  const appVersion = Constants.expoConfig?.version || "Unknown";
  return (
    <SmartBackground
      colors={theme.settingPagesGradient}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="/messages" />

      {/* Avvolgi i menu items in uno ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsMenuItem
          navToPage="themes"
          pageName="Temi"
          iconName={PaintBoardIcon}
        />

        <SettingsMenuItem
          navToPage="storage"
          pageName="Archiviazione"
          iconName={Folder01Icon}
        />
      </ScrollView>

      {/* Testo della versione fuori dallo ScrollView per mantenerlo fisso */}
      <Text
        style={{
          fontSize: 12,
          color: theme.placeholderText,
          textAlign: "center",
        }}
      >
        Versione: {appVersion}
      </Text>
    </SmartBackground>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
  });

export default SettingsMenu;
