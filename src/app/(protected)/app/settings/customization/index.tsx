import React from "react";
import { router } from "expo-router";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

export default function CustomizationMenuRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow title={"Customization"} onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/customization/themes"
          pageName="Themes"
          iconName={"PaintBoardIcon"}
        />
      </SettingsPageScrollview>
    </>
  );
}
