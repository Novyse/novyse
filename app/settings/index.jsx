import React, { useContext } from "react";
import { Text, StyleSheet, ScrollView, View, Platform } from "react-native"; // Aggiungi ScrollView
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../components/SettingsMenuItem";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import {
  UserIcon,
  PencilEdit01Icon,
  Folder01Icon,
  QrCode01Icon,
  BlockedIcon,
  InformationCircleIcon,
  KeyboardIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { APP_VERSION } from "../../app.config.js";
import ScreenLayout from "../components/ScreenLayout";

const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="/messages" />

        {/* Avvolgi i menu items in uno ScrollView */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SettingsMenuItem
            navToPage="/settings/account"
            pageName="Account"
            iconName={UserIcon}
          />
          <SettingsMenuItem
            navToPage="/settings/customization"
            pageName="Customization"
            iconName={PencilEdit01Icon}
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
          <SettingsMenuItem
            navToPage="/settings/comms"
            pageName="Comms"
            iconName={VolumeHighIcon}
          />
          {Platform.OS === "android" && (
            <SettingsMenuItem
              navToPage="/settings/qrscanner"
              pageName="QR Scanner"
              iconName={QrCode01Icon}
            />
          )}
          {Platform.OS === "web" && (
            <SettingsMenuItem
              navToPage="/settings/shortcuts"
              pageName="Shortcuts"
              iconName={KeyboardIcon}
            />
          )}
          <SettingsMenuItem
            navToPage="/settings/info"
            pageName="Info"
            iconName={InformationCircleIcon}
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
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
  });

export default SettingsMenu;
