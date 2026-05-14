import React from "react";
import { router } from "expo-router";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

export default function CustomizationMenuRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.customization.title" onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/customization/themes"
          translationKey="settings.customization.themes"
          iconName={"PaintBoardIcon"}
        />
      </SettingsPageScrollview>
    </>
  );
}
