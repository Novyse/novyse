import React, { useContext } from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "./Icon";

const SidebarItem = (props) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable style={styles.menuItem} onPress={props.onPress}>
      <Icon name={props.iconName} />
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
      paddingHorizontal: 15,
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
