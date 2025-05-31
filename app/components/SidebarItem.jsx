import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { User03Icon, Settings02Icon, UserGroup03Icon, Logout03Icon } from "@hugeicons/core-free-icons";

const SidebarItem = (props) => {
  return (
    <Pressable style={styles.menuItem} onPress={props.onPress}>
      <HugeiconsIcon
        icon={props.iconName}
        size={24}
        color="#fff"
        strokeWidth={1.5}
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
  sidebarText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
});

export default SidebarItem;
