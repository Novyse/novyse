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
      style={styles.menuItem}
      onPress={() => router.push(navToPage)}
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
    },
    menuItemText: {
      color: theme.text,
      fontSize: 16,
      marginLeft: 15,
    },
  });

export default SettingsMenuItem;
