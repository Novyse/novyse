import React from "react";
import { router } from "expo-router";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

export default function SecurityRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.security"
        onBack={onBack}
      />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/security/password"
          translationKey="settings.security.password"
          iconName={"LockPasswordIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/passkeys"
          translationKey="settings.security.passkeys"
          iconName={"FingerPrintIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/mfa"
          translationKey="settings.security.mfa"
          iconName={"TwoFactorAccessIcon"}
          disabled={true}
        />
        <SettingsMenuItem
          navToPage="./settings/security/sessions"
          translationKey="settings.security.sessionsLabel"
          iconName={"ComputerIcon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/api-keys"
          translationKey="settings.security.apiKeysLabel"
          iconName={"Key01Icon"}
        />
        <SettingsMenuItem
          navToPage="./settings/security/notifications"
          translationKey="settings.security.notifications"
          iconName={"Notification03Icon"}
          disabled={true}
        />
      </SettingsPageScrollview>
    </>
  );
}
