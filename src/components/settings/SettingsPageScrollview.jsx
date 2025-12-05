import React, { useContext } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import { ThemeContext } from "../../../context/ThemeContext";

const SettingsPageScrollview = ({ children, isMenu = false }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isMenu);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {children}
    </ScrollView>
  );
};

function createStyle(theme, isMenu) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      maxWidth: 768,
      paddingBottom: isMenu ? 0 : 20,
      paddingTop: 60,
      alignSelf: "center",
      paddingHorizontal: isMenu ? 0 : 20,
      ...(Platform.OS === "web" && {
        // Standard per Firefox (fisso, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    contentContainer: {
      gap: isMenu ? 0 : 20,
    },
  });
}

export default SettingsPageScrollview;
