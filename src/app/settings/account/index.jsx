import React from "react";
import SettingsMenuItem from "@/src/components/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const AccountMenu = () => {
  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Account"}/>
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./account/modify-profile"
          pageName="Modify Profile"
          iconName={"UserEdit01Icon"}
        />
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

export default AccountMenu;
