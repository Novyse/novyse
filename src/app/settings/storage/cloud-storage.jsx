import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";
import ScreenLayout from "@/src/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";

const CloudStoragePage = () => {
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
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="../" />
      <SettingsPageScrollview>
        <SettingsCard>
          <StorageBreakdown storage={cloudData} />
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    // Styles if needed, but using the breakdown's styles
  });

export default CloudStoragePage;