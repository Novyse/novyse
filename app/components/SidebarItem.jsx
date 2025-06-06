import React, { useContext } from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/context/ThemeContext";
import {
  User03Icon,
  Settings02Icon,
  UserGroup03Icon,
  Logout03Icon,
} from "@hugeicons/core-free-icons";

const SidebarItem = (props) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable style={styles.menuItem} onPress={props.onPress}>
      <HugeiconsIcon
        icon={props.iconName}
        size={24}
        color={theme.icon}
        strokeWidth={1.5}
      />
      <Text style={styles.sidebarText}>{props.text}</Text>
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
    sidebarText: {
      color: theme.text,
      fontSize: 16,
      marginLeft: 15,
    },
  });

export default SidebarItem;
