import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";

const ShortcutsPage = ({ navigation }) => {
  const onBack = () => navigation.goBack();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    < >
      <HeaderWithBackArrow title={"Keyboard Shortcuts"} onBack={onBack} />
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
    </>
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
