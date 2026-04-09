import React from "react";
import { Platform } from "react-native";

import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const settingsList = [
  {
    pageName: "Account",
    iconName: "UserIcon",
    navToPage: "./settings/account",
  },
  {
    pageName: "Customization",
    iconName: "PencilEdit01Icon",
    navToPage: "./settings/customization",
  },
  {
    pageName: "Storage",
    iconName: "Folder01Icon",
    navToPage: "./settings/storage",
  },
  {
    pageName: "Security",
    iconName: "BlockedIcon",
    navToPage: "./settings/security",
  },
  {
    pageName: "Comms",
    iconName: "VolumeHighIcon",
    navToPage: "./settings/comms",
  },
  ...(Platform.OS === "android"
    ? [
        {
          pageName: "QR Scanner",
          iconName: "QrCode01Icon",
          navToPage: "./settings/qrscanner",
        },
      ]
    : []),
  ...(Platform.OS === "web"
    ? [
        {
          pageName: "Shortcuts",
          iconName: "KeyboardIcon",
          navToPage: "./settings/shortcuts",
        },
      ]
    : []),
  {
    pageName: "Language & Time",
    iconName: "GlobalIcon",
    navToPage: "./settings/language",
  },
  {
    pageName: "Info",
    iconName: "InformationCircleIcon",
    navToPage: "./settings/info",
  },
];

const SettingsList = () => {
  return (
    <SettingsPageScrollview isMenu={true} paddingTop={0}>
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
