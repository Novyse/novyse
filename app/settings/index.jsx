import React, { useContext } from "react";
import { Text, StyleSheet, ScrollView, View, Platform } from "react-native"; // Aggiungi ScrollView
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../components/SettingsMenuItem";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";

const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="/chat" />
      <View style={styles.container}>
        {/* Avvolgi i menu items in uno ScrollView */}
        <ScrollView contentstyle={styles.scrollContent}>
          <SettingsMenuItem
            navToPage="/settings/account"
            pageName="Account"
            iconName={"UserIcon"}
          />
          <SettingsMenuItem
            navToPage="/settings/customization"
            pageName="Customization"
            iconName={"PencilEdit01Icon"}
          />
          <SettingsMenuItem
            navToPage="/settings/storage"
            pageName="Storage"
            iconName={"Folder01Icon"}
          />
          <SettingsMenuItem
            navToPage="/settings/privacy-and-security"
            pageName="Privacy and Security"
            iconName={"BlockedIcon"}
          />
          <SettingsMenuItem
            navToPage="/settings/comms"
            pageName="Comms"
            iconName={"VolumeHighIcon"}
          />
          {Platform.OS === "android" && (
            <SettingsMenuItem
              navToPage="/settings/qrscanner"
              pageName="QR Scanner"
              iconName={"QrCode01Icon"}
            />
          )}
          {Platform.OS === "web" && (
            <SettingsMenuItem
              navToPage="/settings/shortcuts"
              pageName="Shortcuts"
              iconName={"KeyboardIcon"}
            />
          )}
          <SettingsMenuItem
            navToPage="/settings/info"
            pageName="Info"
            iconName={"InformationCircleIcon"}
          />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
  });

export default SettingsMenu;
