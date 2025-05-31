import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { PaintBoardIcon, Folder01Icon } from "@hugeicons/core-free-icons";

const SettingsMenuItem = ({ navToPage, pageName, iconName }) => {
  const router = useRouter();

  return (
    <Pressable
      style={styles.menuItem}
      onPress={() => router.navigate(`/settings/${navToPage}`)}
    >
      <HugeiconsIcon icon={iconName} size={24} color="#fff" strokeWidth={1.5} />
      <Text style={styles.menuItemText}>{pageName}</Text>
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
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
});

export default SettingsMenuItem;
