import React, { useContext } from "react";
import { Text, StyleSheet, ScrollView, View, Platform } from "react-native"; // Aggiungi ScrollView
import SmartBackground from "../components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../components/SettingsMenuItem";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  PaintBoardIcon,
  Folder01Icon,
  QrCode01Icon,
  BlockedIcon
} from "@hugeicons/core-free-icons";
import { APP_VERSION } from "../../app.config.js";
import ScreenLayout from "../components/ScreenLayout";

const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Accedi alla versione tramite Constants
  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="/messages" />

        {/* Avvolgi i menu items in uno ScrollView */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SettingsMenuItem
            navToPage="/settings/themes"
            pageName="Themes"
            iconName={PaintBoardIcon}
          />
          <SettingsMenuItem
            navToPage="/settings/storage"
            pageName="Storage"
            iconName={Folder01Icon}
          />
          <SettingsMenuItem
            navToPage="/settings/privacy-and-security"
            pageName="Privacy and Security"
            iconName={BlockedIcon}
          />
          {Platform.OS === "android" && (
            <SettingsMenuItem
              navToPage="/settings/qrscanner"
              pageName="QR Scanner"
              iconName={QrCode01Icon}
            />
          )}
        </ScrollView>

        {/* Testo della versione fuori dallo ScrollView per mantenerlo fisso */}
        <Text
          style={{
            fontSize: 12,
            color: theme.placeholderText,
            textAlign: "center",
          }}
        >
          Versione: {APP_VERSION}
        </Text>
      </View>
    </ScreenLayout>
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
