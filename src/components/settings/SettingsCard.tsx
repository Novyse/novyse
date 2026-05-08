import React, { useContext } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

interface SettingsCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SettingsCard = ({ children, style }: SettingsCardProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return <View style={[styles.card, style]}>{children}</View>;
};

function createStyle(theme) {
  return StyleSheet.create({
    card: {
      padding: 24,
      elevation: 2,
      width: "100%",
      shadowRadius: 4,
      borderRadius: 16,
      shadowOpacity: 0.1,
      overflow: "hidden",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      backgroundColor: theme.backgroundMain,
    },
  });
}

export default SettingsCard;
