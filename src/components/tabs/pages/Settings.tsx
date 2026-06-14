import React from "react";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Platform from "@/src/utils/device/type";

const settingsList = [
  {
    translationKey: "settings.menu.account",
    iconName: "UserIcon",
    navToPage: "./settings/account",
  },
  {
    translationKey: "settings.menu.customization",
    iconName: "PencilEdit01Icon",
    navToPage: "./settings/customization",
  },
  {
    translationKey: "settings.menu.storage",
    iconName: "Folder01Icon",
    navToPage: "./settings/storage",
  },
  {
    translationKey: "settings.menu.security",
    iconName: "BlockedIcon",
    navToPage: "./settings/security",
  },
  {
    translationKey: "settings.menu.comms",
    iconName: "VolumeHighIcon",
    navToPage: "./settings/comms",
  },
  ...(Platform === "mobile"
    ? [
        {
          translationKey: "settings.menu.qrScanner",
          iconName: "QrCode01Icon",
          navToPage: "./settings/qrscanner",
        },
      ]
    : []),
  ...(Platform === "web" || Platform === "desktop"
    ? [
        {
          translationKey: "settings.menu.shortcuts",
          iconName: "KeyboardIcon",
          navToPage: "./settings/shortcuts",
        },
      ]
    : []),
  ...(Platform === "desktop"
    ? [
        {
          translationKey: "settings.menu.system",
          iconName: "ComputerIcon",
          navToPage: "./settings/system",
        },
      ]
    : []),
  {
    translationKey: "settings.languageAndTime",
    iconName: "GlobalIcon",
    navToPage: "./settings/language",
  },
  {
    translationKey: "settings.menu.info",
    iconName: "InformationCircleIcon",
    navToPage: "./settings/info",
  },
];

const SettingsList = () => {
  return (
    <SettingsPageScrollview isMenu={true} paddingTop={0}>
      {settingsList.map((setting) => (
        <SettingsMenuItem
          key={setting.translationKey}
          translationKey={setting.translationKey}
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
