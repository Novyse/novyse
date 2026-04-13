import React, { useContext } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SettingsPageScrollviewProps {
  children: React.ReactNode;
  isMenu?: boolean;
  paddingTop?: number;
}

const SettingsPageScrollview = ({
  children,
  isMenu = false,
  paddingTop = 90,
}: SettingsPageScrollviewProps) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const styles = createStyle(theme, isMenu, insets, paddingTop);

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
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      height: "100%",
      maxWidth: 768,
      alignSelf: "center",

      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    contentContainer: {
      gap: isMenu ? 0 : 20,
      paddingTop: paddingTop + insets.top,
      paddingBottom: (isMenu ? 0 : 20) + insets.bottom,
      paddingHorizontal: isMenu ? 0 : 20,
    },
  });
}

export default SettingsPageScrollview;
