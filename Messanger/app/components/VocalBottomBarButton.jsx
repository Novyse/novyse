import React from "react";
import { StyleSheet, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const VocalBottomBarButton = ({ onPress, iconName, iconColor }) => {
  return (
    <Pressable style={styles.iconButton} onPress={onPress}>
      <MaterialIcons
        name={iconName}
        size={24}
        color={iconColor}
        style={styles.menuIcon}
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
