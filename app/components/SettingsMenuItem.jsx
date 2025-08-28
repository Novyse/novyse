import React, { useContext } from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "../../context/ThemeContext";

const SettingsMenuItem = ({ navToPage, pageName, iconName }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.menuItem,
        hovered && styles.menuItemHovered,
        pressed && styles.menuItemPressed,
      ]}
      onPress={() => router.push(navToPage)}
      android_ripple={{ color: theme.rippleColor }}
    >
      <HugeiconsIcon
        icon={iconName}
        size={24}
        color={theme.icon}
        strokeWidth={1.5}
      />
      <Text style={styles.menuItemText}>{pageName}</Text>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.settingsDivider,
      transition: "background-color 0.2s ease",
    },
    menuItemHovered: {
      backgroundColor: theme.hoveredItem || "rgba(0, 0, 0, 0.02)",
      cursor: "pointer",
    },
    menuItemPressed: {
      backgroundColor: theme.pressedItem || "rgba(0, 0, 0, 0.05)",
      opacity: 0.9,
    },
    menuItemText: {
      color: theme.text,
      fontSize: 16,
      marginLeft: 15,
    },
  });

export default SettingsMenuItem;
