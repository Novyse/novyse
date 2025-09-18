import React, { useContext } from "react";
import { StyleSheet, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "../Icon";

const VocalBottomBarButton = ({ onPress, iconName, iconColor }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable style={styles.iconButton} onPress={onPress}>
      <Icon name={iconName} color={iconColor}/>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    iconButton: {
      backgroundColor:
        theme.floatingBarButtonBackground || "rgba(0, 0, 0, 0.65)",
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default VocalBottomBarButton;
