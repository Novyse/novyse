import React from "react";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const PrivacyAndSecurityMenu = ({ navigation }) => {
  const onBack = () => navigation.goBack();

  return (
    < >
      <HeaderWithBackArrow title={"Privacy and Security"} onBack={onBack} />
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
    </>
  );
};

export default PrivacyAndSecurityMenu;
