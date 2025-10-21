import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "./Icon";
import HoverAndPressedButton from "./HoverAndPressedButton";

const SidebarItem = (props) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <HoverAndPressedButton style={styles.menuItem} onPress={props.onPress}>
      <Icon name={props.iconName} />
      <Text style={styles.sidebarText}>{props.text}</Text>
    </HoverAndPressedButton>
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
      borderBottomColor: theme.backgroundSettingsDivider,
      borderRadius: 0,
    },
    sidebarText: {
      color: theme.text,
      fontSize: 16,
      marginLeft: 15,
    },
  });

export default SidebarItem;
