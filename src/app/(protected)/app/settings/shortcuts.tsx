import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import ShortcutItem from "@/src/components/settings/shortcuts/ShortcutItem";

export default function ShortcutsRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <>
      <HeaderWithBackArrow title={"Keyboard Shortcuts"} onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            Developer Note: This page is currently a UI preview only. All
            functional features are under development and will be included in
            the version 1.2 release.
          </Text>
        </View>
        <SettingsCard>
          <ShortcutItem
            label="Mute / Unmute"
            keys={["ctrl", "f12"]}
            onPress={() => console.log("Change mute shortcut")}
          />
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    bannerContainer: {
      backgroundColor: "#d32f2f",
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#b71c1c",
    },
    bannerText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 20,
    },
  });
