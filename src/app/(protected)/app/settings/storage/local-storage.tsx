import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";
import useStorage from "@/src/hooks/settings/useStorage";

export default function LocalStorageRoute() {
  const onBack = () => router.back();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { usedStorage } = useStorage();

  const localData = {
    type: "local",
    title: "Local Storage",
    iconName: "Folder01Icon",
    totalUsed: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
    totalCapacity: 0,
    categories: [
      {
        name: "File",
        size: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
        color: "#0EA5E9",
      },
    ],
  };

  return (
    <>
      <HeaderWithBackArrow title={"Local Storage"} onBack={onBack} />
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
