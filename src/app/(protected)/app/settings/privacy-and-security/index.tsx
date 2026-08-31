import React from "react";
import { router } from "expo-router";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingsRow";

export default function SecurityRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.privacyAndSecurity"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section>
          <SettingRow
            iconName="LockPasswordIcon"
            labelKey="settings.privacyAndSecurity.password"
            onPress={() => router.push("/app/settings/privacy-and-security/password")}
          />
          <SettingRow
            iconName="TwoFactorAccessIcon"
            labelKey="settings.privacyAndSecurity.mfa"
            onPress={() => router.push("/app/settings/privacy-and-security/mfa")}
          />
          <SettingRow
            iconName="ComputerIcon"
            labelKey="settings.privacyAndSecurity.sessionsLabel"
            onPress={() => router.push("/app/settings/privacy-and-security/sessions")}
          />
          <SettingRow
            iconName="Key01Icon"
            labelKey="settings.privacyAndSecurity.apiKeysLabel"
            onPress={() => router.push("/app/settings/privacy-and-security/api-keys")}
          />
          <SettingRow
            iconName="Notification01Icon"
            labelKey="settings.privacyAndSecurity.notifications"
            onPress={() => router.push("/app/settings/privacy-and-security/notifications")}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}
