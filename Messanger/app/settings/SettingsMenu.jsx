import React, { useState, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";

const SettingsMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const navigateToSetting = (page) => {
    router.navigate(`/settings/${page}`);
  };

  const renderSettingsHeader = () => {
    return (
      <View style={styles.header}>
        <Pressable
          onPress={() => {router.navigate("/ChatList")}}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={theme.icon} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
        {renderSettingsHeader()}
      <Pressable
        style={styles.menuItem}
        onPress={() => navigateToSetting("themes")}
      >
        <Text style={styles.menuItemText}>Temi</Text>
      </Pressable>
      <Pressable
        style={styles.menuItem}
        onPress={() => navigateToSetting("storage")}
      >
        <Text style={styles.menuItemText}>Archiviazione</Text>
      </Pressable>
      {/* Aggiungi altre impostazioni qui */}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    floatingContainer: {
      width: 300,
      height: 400,
      position: "absolute",
      top: 50,
      right: 50,
      borderRadius: 10,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    menuItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuItemText: {
      color: theme.text,
      fontSize: 18,
    },
  });

export default SettingsMenu;
