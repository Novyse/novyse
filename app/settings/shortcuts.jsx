import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";
import SettingsPageScrollview from "../components/settings/SettingsPageScrollview";
import SettingsCard from "../components/settings/SettingsCard";

const ShortcutsPage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="../" />
      <SettingsPageScrollview>
        <SettingsCard>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>
            Currently only implemented in VocalContentBottomBar
          </Text>
        </SettingsCard>

        <SettingsCard>
          <Text style={styles.shortcutItem}>Mute: ctrl + F12</Text>
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    wipText: {
      color: "#FFA500",
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 5,
    },
    wipSubtext: {
      color: theme.text,
      fontSize: 14,
      fontStyle: "italic",
    },
    shortcutItem: {
      color: theme.text,
      fontSize: 16,
      marginVertical: 4,
    },
  });

export default ShortcutsPage;
