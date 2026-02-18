import React, { useContext } from "react";
import { StyleSheet } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import Icon from "@/src/components/Icon";

const CommsBottomBarButton = ({ onPress, iconName, iconColor, hoverColor }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Icon
      name={iconName}
      color={iconColor}
      style={styles.iconButton}
      onPress={onPress}
      hoverColor={hoverColor}
    />
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    iconButton: {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CommsBottomBarButton;
