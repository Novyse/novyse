import React from "react";
import { router } from "expo-router";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import ShortcutItem from "@/src/components/settings/shortcuts/ShortcutItem";
import StatusMessage from "@/src/components/StatusMessage";

export default function ShortcutsRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.shortcuts"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <StatusMessage type="warning" translationKey="common.developerNote" closable={false}/>
        <SettingsCard>
          <ShortcutItem
            translationKey="settings.shortcuts.muteUnmute"
            keys={["ctrl", "f12"]}
            onPress={() => console.log("Change mute shortcut")}
          />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}
