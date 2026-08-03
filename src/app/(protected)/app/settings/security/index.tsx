import React from "react";
import { router } from "expo-router";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingsRow";

export default function SecurityRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.security"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section>
          <SettingRow
            iconName="LockPasswordIcon"
            labelKey="settings.security.password"
            onPress={() => router.push("/app/settings/security/password")}
          />
          <SettingRow
            iconName="TwoFactorAccessIcon"
            labelKey="settings.security.mfa"
            onPress={() => router.push("/app/settings/security/mfa")}
          />
          <SettingRow
            iconName="ComputerIcon"
            labelKey="settings.security.sessionsLabel"
            onPress={() => router.push("/app/settings/security/sessions")}
          />
          <SettingRow
            iconName="Key01Icon"
            labelKey="settings.security.apiKeysLabel"
            onPress={() => router.push("/app/settings/security/api-keys")}
          />
          <SettingRow
            iconName="Notification03Icon"
            labelKey="settings.security.notifications"
            onPress={() => router.push("/app/settings/security/notifications")}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}
