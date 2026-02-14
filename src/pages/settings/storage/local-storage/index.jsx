import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import StorageBreakdown from "@/src/components/settings/storage/StorageBreakdown";
import useStorage from "@/src/hooks/settings/useStorage";

const LocalStoragePage = ({ navigation }) => {
  const onBack = () => navigation.goBack();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { usedStorage } = useStorage();

  const localData = {
    type: "local",
    title: "Local Storage",
    iconName: "Folder01Icon",
    totalUsed: (usedStorage / (1024 * 1024 * 1024)).toFixed(2),
    totalCapacity: null,
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
          <StorageBreakdown storage={localData} />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    // Styles if needed, but using the breakdown's styles
  });

export default LocalStoragePage;
