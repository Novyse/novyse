import React from "react";
import SettingsMenuItem from "../../components/SettingsMenuItem";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import ScreenLayout from "../../components/ScreenLayout";
import SettingsPageScrollview from "@/app/components/settings/SettingsPageScrollview";

const PrivacyAndSecurityMenu = () => {
  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./customization/themes"
          pageName="Themes"
          iconName={"PaintBoardIcon"}
        />
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

export default PrivacyAndSecurityMenu;
