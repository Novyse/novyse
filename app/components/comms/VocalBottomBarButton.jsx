import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
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

const styles = StyleSheet.create({
  iconButton: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 100,
    height: 45,
    width: 45,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VocalBottomBarButton;
