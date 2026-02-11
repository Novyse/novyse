import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemeContext } from "@/context//ThemeContext";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import { detailsNavigator } from "@/src/utils/navigation/ref";

const SettingsMenuItem = ({ navToPage, pageName, iconName }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handlePress = () => {
    // internal page (starts with ./) -> push into settings stack
    if (navToPage.startsWith("./")) {
      const page = navToPage.replace("./", "");
      detailsNavigator.navigate(page);
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

const createStyle = (theme) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSettingsDivider,
      transition: "background-color 0.2s ease",
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
