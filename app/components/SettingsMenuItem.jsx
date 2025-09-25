import React, { useContext } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Icon from "./Icon";
import { ThemeContext } from "../../context/ThemeContext";
import HoverAndPressedButton from "./HoverAndPressedButton";

const SettingsMenuItem = ({ navToPage, pageName, iconName }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    // <Pressable
    //   style={({ pressed, hovered }) => [
    //     styles.menuItem,
    //     hovered && styles.menuItemHovered,
    //     pressed && styles.menuItemPressed,
    //   ]}
    //   onPress={() => router.push(navToPage)}
    //   android_ripple={{ color: theme.rippleColor }}
    // >
    <HoverAndPressedButton
      onPress={() => router.push(navToPage)}
      style={styles.menuItem}
    >
      <View style={styles.menuItemIcon}>
        <Icon name={iconName} />
      </View>
      <Text style={styles.menuItemText}>{pageName}</Text>
    </HoverAndPressedButton>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSettingsDivider,
      transition: "background-color 0.2s ease",
      borderRadius: 0
    },
    menuItemText: {
      color: theme.text,
      fontSize: 16,
    },
    menuItemIcon: {
      marginHorizontal: 15,
    },
  });

export default SettingsMenuItem;
