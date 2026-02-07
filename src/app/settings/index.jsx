import React from "react";
import { Platform } from "react-native";
import SettingsMenuItem from "@/src/components/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const SettingsMenu = () => {
  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Settings"}/>
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="/settings/modify-profile"
          pageName="Modify profile"
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
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

export default SettingsMenu;
