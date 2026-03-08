import React from "react";
import { router } from "expo-router";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

export default function PrivacyAndSecurityRoute() {
  const onBack = () => router.back();

  return (
    <>
      <HeaderWithBackArrow title={"Privacy and Security"} onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/privacy-and-security/change-password"
          pageName="Change Password"
          iconName={"Key01Icon"}
        />
        <SettingsMenuItem
          navToPage="./settings/privacy-and-security/twofa-methods"
          pageName="2FA Methods"
          iconName={"TwoFactorAccessIcon"}
        />
      </SettingsPageScrollview>
    </>
  );
}
