import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import { router } from "expo-router";

interface SettingsMenuItemProps {
  navToPage?: string;
  pageName: string;
  iconName: string;
  onPress?: () => void | Promise<void>;
}

const SettingsMenuItem = ({
  navToPage,
  pageName,
  iconName,
  onPress,
}: SettingsMenuItemProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navToPage) {
      // internal page (starts with ./) -> push into detail via expo-router
      if (navToPage.startsWith("./")) {
        const page = navToPage.replace("./", "");
        router.push(("/app/" + page) as any);
      }
    }
  };

  return (
    <HoverAndPressedButton onPress={handlePress} style={styles.menuItem}>
      <View style={styles.menuItemIcon}>
        <Icon name={iconName} />
      </View>
      <Text style={styles.menuItemText}>{pageName}</Text>
    </HoverAndPressedButton>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSettingsDivider,
      borderRadius: 0,
      height: 60,
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
