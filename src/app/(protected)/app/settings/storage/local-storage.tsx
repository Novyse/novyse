import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";
import useStorage from "@/src/hooks/settings/useStorage";

export default function LocalStorageRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { usedStorage } = useStorage();

  const localData = {
    type: "local",
    title: t("settings.storage.localStorage"),
    iconName: "Folder01Icon",
    totalUsed: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
    totalCapacity: 0,
    categories: [
      {
        name: t("settings.storage.file"),
        size: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
        color: "#0EA5E9",
      },
    ],
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.storage.localStorage"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <SettingsCard style={{ marginTop: 30 }}>
          <StorageBreakdown storage={localData as any} />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    // Styles if needed
  });
