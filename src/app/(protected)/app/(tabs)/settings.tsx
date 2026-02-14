import React from "react";
import { Platform } from "react-native";

import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
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
  return <SettingsList />;
};

export default Settings;
