import React from "react";
import SettingsMenuItem from "@/src/components/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const PrivacyAndSecurityMenu = () => {
  return (
    <ScreenLayout>
      <HeaderWithBackArrow title={"Customization"}/>
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
