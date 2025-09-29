import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "../../../context/ThemeContext";

const SettingsCard = ({ children }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return <View style={styles.card}>{children}</View>;
};

function createStyle(theme) {
  return StyleSheet.create({
    card: {
      padding: 24,
      elevation: 2,
      shadowRadius: 4,
      borderRadius: 16,
      shadowOpacity: 0.1,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      backgroundColor: theme.backgroundSettingsCards,
    },
  });
}

export default SettingsCard;
