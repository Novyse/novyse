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
