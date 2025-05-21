import React from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

const SettingsMenuItem = ({ navToPage, pageName, iconName }) => {

  const router = useRouter();

  return (
      <Pressable
        style={styles.menuItem}
        onPress={() => router.navigate(`/settings/${navToPage}`)}
        
      >
        <MaterialIcons
          name={iconName}
          size={24}
          color="white"
          style={styles.menuIcon}
        />
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
  menuIcon: {
    marginRight: 15,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default SettingsMenuItem;
