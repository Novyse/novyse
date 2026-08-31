import React, { useContext } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollBar } from "@/constants/ScrollBar";
import { SETTINGS_HEADER_SCROLL_PADDING } from "@/constants/headers";

interface SettingsPageScrollviewProps {
  children: React.ReactNode;
  isMenu?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
}

const SettingsPageScrollview = ({
  children,
  isMenu = false,
  paddingTop = SETTINGS_HEADER_SCROLL_PADDING,
  paddingBottom = 0,
}: SettingsPageScrollviewProps) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const styles = createStyle(theme, isMenu, insets, paddingTop, paddingBottom);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {children}
    </ScrollView>
  );
};

function createStyle(
  theme: any,
  isMenu: boolean,
  insets: { top: number; bottom: number },
  paddingTop: number,
  paddingBottom: number,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      height: "100%",
      ...ScrollBar(theme),
    },
    contentContainer: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
      gap: isMenu ? 0 : 20,
      paddingTop: paddingTop + insets.top,
      paddingBottom: (isMenu ? 0 : 20) + paddingBottom + insets.bottom,
      paddingHorizontal: isMenu ? 0 : 20,
    },
  });
}

export default SettingsPageScrollview;
