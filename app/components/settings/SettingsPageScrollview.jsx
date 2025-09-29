import React, { useContext } from "react";
import { StyleSheet, ScrollView } from "react-native";
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
      alignSelf: "center",
      paddingHorizontal: isMenu ? 0 : 20,
    },
    contentContainer: {
      gap: isMenu ? 0 : 20,
    },
  });
}

export default SettingsPageScrollview;
