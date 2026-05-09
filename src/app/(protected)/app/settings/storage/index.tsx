import React, { useContext } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import auth from "@/src/utils/welcome/auth";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Section from "@/src/components/settings/Section";
import SettingRow from "@/src/components/settings/SettingRow";

import useStorage from "@/src/hooks/settings/useStorage";

export default function StorageRoute() {
  const { t } = useTranslation();
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);

  const handlePress = (navToPage: string) => {
    router.push(`/app/${navToPage}` as any);
  };

  const handleResetDatabase = () => {
    auth.initializeDatabase();
  };

  const handleNavigateToLocal = () => {
    handlePress("settings/storage/local-storage");
  };

  const handleNavigateToCloud = () => {
    // Current behavior: Do nothing, as the original button was disabled.
    // handlePress("settings/storage/cloud-storage");
  };

  const { usedStorage } = useStorage();

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.menu.storage" onBack={onBack} />
      <SettingsPageScrollview>
        <Section titleKey="settings.menu.storage">
          <SettingRow
            iconName="Database02Icon"
            labelKey="settings.storage.localStorage"
            value={`${(usedStorage / (1024 * 1024 * 1024)).toFixed(2)} ${t("settings.storage.gbUsed")}`}
            onPress={handleNavigateToLocal}
          />
          <SettingRow
            iconName="CloudIcon"
            labelKey="settings.storage.cloudStorageComingSoon"
            value="0 / 0 GB"
            onPress={handleNavigateToCloud}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
        
        <Section>
          <SettingRow
            iconName="Delete02Icon"
            labelKey="settings.storage.resetDatabase"
            onPress={handleResetDatabase}
            danger={true}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}


