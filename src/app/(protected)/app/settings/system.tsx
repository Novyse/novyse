import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import DropdownMenu from "@/src/components/DropdownMenu";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Section from "@/src/components/settings/Section";
import SettingRow from "@/src/components/settings/SettingRow";

import useChatStore from "@/src/context/ChatContext";
import useUserStore from "@/src/context/UserContext";

import settingsManager from "@/src/utils/global/SettingsManager";
import Platform from "@/src/utils/device/type";
import { systemRpc } from "@/src/utils/electron/system";

export default function SystemRoute() {
  useEffect(() => {
    if (Platform !== "desktop") {
      router.replace("/app");
    }
  }, []);

  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);

  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const chats = useChatStore((state) => state.chats);
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const users = useUserStore((state) => state.users);

  const styles = createStyle(theme);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings =
        await settingsManager.getPageParameters("settings.system");
      const startupData = await systemRpc.getOpenOnStartup();
      setSystemSettings({
        ...(settings || {}),
        openOnStartup: startupData.openAtLogin,
        openMinimized: startupData.openMinimized,
      });
    } catch (error) {
      console.error("Error loading system settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      if (key === "openOnStartup" || key === "openMinimized") {
        const newOpenOnStartup =
          key === "openOnStartup" ? value : !!systemSettings.openOnStartup;
        const newOpenMinimized =
          key === "openMinimized" ? value : !!systemSettings.openMinimized;

        await systemRpc.setOpenOnStartup(newOpenOnStartup, newOpenMinimized);
        await settingsManager.setSingleParameter(
          `settings.system.${key}`,
          value,
        );

        setSystemSettings((prev: any) => ({
          ...prev,
          [key]: value,
        }));
        return;
      }

      const success = await settingsManager.setSingleParameter(
        `settings.system.${key}`,
        value,
      );
      if (success) {
        setSystemSettings((prev: any) => ({
          ...prev,
          [key]: value,
        }));
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      await loadSettings();
    }
  };

  const chatOptions = [
    { label: t("settings.system.none") || "None", value: "" },
    ...chats.map((chat) => {
      let displayName = chat.name || "Unknown Chat";
      if (chat.type === "DM") {
        const otherMember = chat.members?.find(
          (m: any) => m.uuid !== localUserUUID,
        );
        const targetUUID = otherMember?.uuid || localUserUUID;
        const targetUser = users[targetUUID || ""];
        if (chat.members?.length === 1 || !otherMember) {
          displayName = "Saved Messages";
        } else if (targetUser) {
          displayName = targetUser.name || "User";
        }
      }
      return {
        label: displayName,
        value: chat.uuid,
      };
    }),
  ];

  const subOptions = [{ label: "0", value: "0" }];

  if (isLoading || !systemSettings) {
    return (
      <>
        <HeaderWithBackArrow
          translationKey="settings.menu.system"
          onBack={onBack}
        />
        <View style={styles.container}>
          <AppText
            style={styles.loadingText}
            translationKey="settings.comms.loadingSettings"
          />
        </View>
      </>
    );
  }

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.system"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section titleKey="settings.system.startupSection">
          <SettingRow
            iconName="ComputerIcon"
            labelKey="settings.system.openOnStartup"
            type="SWITCH"
            isEnabled={!!systemSettings.openOnStartup}
            onToggle={(value) => updateSetting("openOnStartup", value)}
            style={
              !systemSettings.openOnStartup
                ? { borderBottomWidth: 0 }
                : undefined
            }
          />
          {!!systemSettings.openOnStartup && (
            <SettingRow
              iconName="CollapseIcon"
              labelKey="settings.system.openMinimized"
              type="SWITCH"
              isEnabled={!!systemSettings.openMinimized}
              onToggle={(value) => updateSetting("openMinimized", value)}
              style={{ borderBottomWidth: 0 }}
            />
          )}
        </Section>

        <Section titleKey="settings.system.actionsSection">
          <View style={{ paddingHorizontal: 15 }}>
            <DropdownMenu
              label={t("settings.system.selectChat")}
              value={systemSettings.joinCommsChatId || ""}
              options={chatOptions}
              onValueChange={(value) => updateSetting("joinCommsChatId", value)}
              theme={theme}
            />

            <DropdownMenu
              label={t("settings.system.selectSub")}
              value={"0"}
              options={subOptions}
              onValueChange={() => {}}
              theme={theme}
              disabled={true}
            />
          </View>
        </Section>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
  });
