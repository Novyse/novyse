import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";
import ScreenLayout from "@/src/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";

const LocalStoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const localData = {
    type: "local",
    title: "Local Storage",
    iconName: "Folder01Icon",
    totalUsed: 2.3,
    totalCapacity: null,
    categories: [
      { name: "Media", size: 1.15, color: "#0EA5E9" },
      { name: "Stickers", size: 0.69, color: "#F97316" },
      { name: "Cache", size: 0.46, color: "#EC4899" },
    ],
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow title={"Local Storage"}/>
      <SettingsPageScrollview>
        <SettingsCard>
          <StorageBreakdown storage={localData} />
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    // Styles if needed, but using the breakdown's styles
  });

export default LocalStoragePage;
