import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";

import { ThemeContext } from "@/src/context/ThemeContext";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import { router } from "expo-router";

interface SettingsMenuItemProps {
  navToPage?: string;
  pageName?: string;
  translationKey?: string;
  iconName: string;
  nameColor?: string;
  iconColor?: string;
  disabled?: boolean;
  onPress?: () => void | Promise<void>;
}

const SettingsMenuItem = ({
  navToPage,
  pageName,
  translationKey,
  iconName,
  nameColor,
  iconColor,
  disabled = false,
  onPress,
}: SettingsMenuItemProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, nameColor);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navToPage) {
      if (navToPage.startsWith("./")) {
        const page = navToPage.replace("./", "");
        router.push(("/app/" + page) as any);
      }
    }
  };

  return (
    <HoverAndPressedButton onPress={handlePress} style={styles.menuItem} disabled={disabled}>
      <View style={styles.menuItemIcon}>
        <Icon name={iconName} color={iconColor || theme.text} />
      </View>
      {translationKey ? (
        <AppText style={styles.menuItemText} translationKey={translationKey} />
      ) : (
        <AppText style={styles.menuItemText} text={pageName} />
      )}
    </HoverAndPressedButton>
  );
};

const createStyle = (theme: any, nameColor?: string) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
      borderRadius: 0,
      height: 60,
    },
    menuItemText: {
      color: nameColor || theme.text,
      fontSize: 16,
    },
    menuItemIcon: {
      marginHorizontal: 15,
    },
  });

export default SettingsMenuItem;
