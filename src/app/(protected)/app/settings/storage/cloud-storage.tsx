import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";

export default function CloudStorageRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const cloudData = {
    type: "cloud",
    title: "Cloud Storage",
    iconName: "CloudIcon",
    totalUsed: 10,
    totalCapacity: 15,
    categories: [
      { name: "Videos", size: 1, color: "#007AFF" },
      { name: "Images", size: 2, color: "#A855F7" },
      { name: "Documents", size: 3, color: "#10B981" },
      { name: "Others", size: 4, color: "#F59E0B" },
    ],
  };

  return (
    <>
      <HeaderWithBackArrow title={"Cloud Storage"} onBack={onBack} />
      <SettingsPageScrollview>
        <SettingsCard>
          <StorageBreakdown storage={cloudData as any} />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    // Styles if needed
  });
