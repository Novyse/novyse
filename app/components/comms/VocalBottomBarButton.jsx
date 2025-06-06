import React, { useContext } from "react";
import { StyleSheet, Pressable } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  ComputerScreenShareIcon,
  ComputerRemoveIcon,
  Call02Icon,
  Close02Icon,
} from "@hugeicons/core-free-icons";

const VocalBottomBarButton = ({ onPress, iconName, iconColor }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable style={styles.iconButton} onPress={onPress}>
      <HugeiconsIcon
        icon={iconName}
        size={24}
        color={iconColor}
        strokeWidth={1.5}
      />
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
