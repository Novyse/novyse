import React, { useContext } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import { ThemeContext } from "../../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 

const SettingsPageScrollview = ({ children, isMenu = false }) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets(); 

  const styles = createStyle(theme, isMenu, insets);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {children}
    </ScrollView>
  );
};

function createStyle(theme, isMenu, insets) {
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
      paddingTop: 90 + insets.top,
      paddingBottom: isMenu ? 0 : 20,
      paddingHorizontal: isMenu ? 0 : 20,
    },
  });
}

export default SettingsPageScrollview;