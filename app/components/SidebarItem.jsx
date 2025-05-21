import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SidebarItem = (props) => {
  return (
    <Pressable style={styles.menuItem} onPress={props.onPress}>
      <MaterialIcons
        name={props.iconName}
        size={24}
        color="white"
        style={styles.menuIcon}
      />
      <Text style={styles.sidebarText}>{props.text}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)", // Subtle divider
  },
  menuIcon: {
    marginRight: 15,
  },
  sidebarText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default SidebarItem;
