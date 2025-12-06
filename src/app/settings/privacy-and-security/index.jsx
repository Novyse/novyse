import React from "react";
import SettingsMenuItem from "@/src/components/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const PrivacyAndSecurityMenu = () => {
  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Privacy and Security"}/>
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./privacy-and-security/change-password"
          pageName="Change Password"
          iconName={"Key01Icon"}
        />
        <SettingsMenuItem
          navToPage="./privacy-and-security/twofa-methods"
          pageName="2FA Methods"
          iconName={"TwoFactorAccessIcon"}
        />
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

export default PrivacyAndSecurityMenu;
