import React, { useContext } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/features/settings/SettingsCard";
import StorageBreakdown from "@/src/components/features/settings/storage/StorageBreakdown";

export default function CloudStorageRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);

  const cloudData = {
    type: "cloud",
    title: t("settings.storage.cloudStorage"),
    iconName: "CloudIcon",
    totalUsed: 10,
    totalCapacity: 15,
    categories: [
      { name: t("settings.storage.videos"), size: 1, color: "#007AFF" },
      { name: t("settings.storage.images"), size: 2, color: "#A855F7" },
      { name: t("settings.storage.documents"), size: 3, color: "#10B981" },
      { name: t("settings.storage.others"), size: 4, color: "#F59E0B" },
    ],
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.storage.cloudStorage"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <SettingsCard>
          <StorageBreakdown storage={cloudData as any} />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}
