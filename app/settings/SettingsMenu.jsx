import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native"; // Aggiungi ScrollView
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
    <View style={styles.container}>
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
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
    },
  });

export default SettingsMenu;
