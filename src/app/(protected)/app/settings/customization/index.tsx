import React from "react";
import { router } from "expo-router";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingRow";

export default function CustomizationMenuRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.customization.title"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section>
          <SettingRow
            iconName="PaintBoardIcon"
            labelKey="settings.customization.themes"
            onPress={() => router.push("/app/settings/customization/themes")}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}
