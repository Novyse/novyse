import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native"; // Aggiungi ScrollView
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../components/SettingsMenuItem";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { PaintBoardIcon, Folder01Icon } from "@hugeicons/core-free-icons";
import appJson from "../../app.json";


const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  return (
    <LinearGradient
      colors={theme.settingPagesGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="/messages"/>

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
      <Text style={{ fontSize: 12, color: "#426080", textAlign: "center" }}>
        Versione: {appJson.expo.version}
      </Text>
    </LinearGradient>
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
