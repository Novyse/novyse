import React from "react";
import { router } from "expo-router";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

export default function SecurityRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow title={"Security"} onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/security/password"
          pageName="Password"
          iconName={"LockPasswordIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/passkeys"
          pageName="Passkeys"
          iconName={"FingerPrintIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/mfa"
          pageName="MFA (WIP)"
          iconName={"TwoFactorAccessIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/sessions"
          pageName="Sessions"
          iconName={"ComputerIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/api-keys"
          pageName="API Keys"
          iconName={"Key01Icon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/notifications"
          pageName="Notifications (WIP)"
          iconName={"Notification03Icon"}
        />
      </SettingsPageScrollview>
    </>
  );
}
