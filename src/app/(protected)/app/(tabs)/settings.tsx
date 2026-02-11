import React from "react";
import { Platform, StyleSheet } from "react-native";

import { useScreen } from "@/context/ScreenContext";

import SmartBackground from "@/src/components/SmartBackground";
import BlurredView from "@/src/components/BlurredView";

import SettingsMenuItem from "@/src/components/SettingsMenuItem";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const settingsList = [
  {
    pageName: "Account",
    iconName: "UserIcon",
    navToPage: "./account",
  },
  {
    pageName: "Customization",
    iconName: "PencilEdit01Icon",
    navToPage: "./customization",
  },
  {
    pageName: "Storage",
    iconName: "Folder01Icon",
    navToPage: "./storage",
  },
  {
    pageName: "Privacy and Security",
    iconName: "BlockedIcon",
    navToPage: "./privacy-and-security",
  },
  {
    pageName: "Comms",
    iconName: "VolumeHighIcon",
    navToPage: "./comms",
  },
  ...(Platform.OS === "android"
    ? [
        {
          pageName: "QR Scanner",
          iconName: "QrCode01Icon",
          navToPage: "./qrscanner",
        },
      ]
    : []),
  ...(Platform.OS === "web"
    ? [
        {
          pageName: "Shortcuts",
          iconName: "KeyboardIcon",
          navToPage: "./shortcuts",
        },
      ]
    : []),
  {
    pageName: "Info",
    iconName: "InformationCircleIcon",
    navToPage: "./info",
  },
];

const SettingsList = () => {
  return (
    <SettingsPageScrollview isMenu={true}>
      {settingsList.map((setting) => (
        <SettingsMenuItem
          key={setting.pageName}
          pageName={setting.pageName}
          iconName={setting.iconName}
          navToPage={setting.navToPage}
        />
      ))}
    </SettingsPageScrollview>
  );
};

const Settings = () => {
  const { isSmallScreen } = useScreen();

  const styles = createStyles(isSmallScreen);

  return (
    <SmartBackground style={styles.container}>
      {!isSmallScreen ? (
        <BlurredView style={styles.blurredContainer}>
          <SettingsList />
        </BlurredView>
      ) : (
        <SettingsList />
      )}
    </SmartBackground>
  );
};

const createStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: "relative",
      padding: isSmallScreen ? 0 : 10,
    },
    blurredContainer: {
      flex: 1,
      position: "relative",

      borderRadius: isSmallScreen ? 0 : 15,
      overflow: "hidden",
    },
  });

export default Settings;
