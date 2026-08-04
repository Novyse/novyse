import React, { useEffect } from "react";
import { router } from "expo-router";

import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/features/settings/SettingsCard";
import ShortcutItem from "@/src/components/features/settings/shortcuts/ShortcutItem";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import AppText from "@/src/components/ui/text/AppText";

import { shortcutsRpc } from "@/src/utils/electron/shortcuts";
import { getPlatform } from "@/src/utils/device/type";

export const APP_SHORTCUTS = [
  {
    id: "cancelEditReply",
    translationKey: "settings.shortcuts.cancelEditReply",
    keys: ["esc"],
    global: false,
    section: "chat",
    disabled: true,
  },
  {
    id: "arrowUpChat",
    translationKey: "settings.shortcuts.arrowUpChat",
    keys: ["↑"],
    global: false,
    section: "chat",
    disabled: true,
  },
  {
    id: "muteUnmute",
    translationKey: "settings.shortcuts.muteUnmute",
    keys: ["ctrl", "f12"],
    global: true,
    section: "comms",
    disabled: false,
    onPress: () => console.log("Change mute shortcut"),
  },
];

export function registerGlobalShortcuts() {
  if (getPlatform() === "desktop") {
    // @SamueleOrazioDurante global shortcuts needs a settings overhaul before been implemented
    return;
    APP_SHORTCUTS.forEach((shortcut) => {
      if (shortcut.global) {
        shortcutsRpc.register(shortcut.keys, shortcut.global);
      }
    });
  }
}

export default function ShortcutsRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  useEffect(() => {
    registerGlobalShortcuts();

    const cleanup = shortcutsRpc.onTriggered((keys) => {
      console.log("Shortcut triggered globally:", keys);
    });

    return () => {
      cleanup();
    };
  }, []);

  const chatShortcuts = APP_SHORTCUTS.filter((s) => s.section === "chat");
  const commsShortcuts = APP_SHORTCUTS.filter((s) => s.section === "comms");

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.shortcuts"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <StatusMessage
          type="warning"
          translationKey="common.developerNote"
          closable={false}
        />

        <AppText
          style={{ marginVertical: 12, marginLeft: 16, fontSize: 16 }}
          translationKey="settings.shortcuts.chatTitle"
        />
        <SettingsCard>
          {chatShortcuts.map((shortcut) => (
            <ShortcutItem
              key={shortcut.id}
              translationKey={shortcut.translationKey}
              keys={shortcut.keys}
              disabled={shortcut.disabled}
              onPress={shortcut.onPress}
            />
          ))}
        </SettingsCard>
        <AppText
          style={{ marginVertical: 12, marginLeft: 16, fontSize: 16 }}
          translationKey="settings.shortcuts.commsTitle"
        />
        <SettingsCard>
          {commsShortcuts.map((shortcut) => (
            <ShortcutItem
              key={shortcut.id}
              translationKey={shortcut.translationKey}
              keys={shortcut.keys}
              disabled={shortcut.disabled}
              onPress={shortcut.onPress}
            />
          ))}
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}
