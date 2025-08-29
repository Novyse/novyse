import React, { useContext } from "react";
import { StyleSheet, View, Text } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";

const ShortcutsPage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <View style={styles.container}>
        <Text style={styles.textTemp}>
          Implementate per ora solo su VocalContentBottomBar
        </Text>
        <Text style={styles.text}>Work in progress</Text>
        <Text style={styles.text}>Mute: ctrl + F12</Text>
        <HeaderWithBackArrow goBackTo="./" />
        
        <View style={styles.wipContainer}>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>Currently only implemented in VocalContentBottomBar</Text>
        </View>
        
        <View style={styles.shortcutsContainer}>
          <Text style={styles.shortcutItem}>Mute: ctrl + F12</Text>
        </View>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
<<<<<<< HEAD
    text: {
      color: theme.text,
    },
    textTemp: {
      color: "red",
      marginVertical: 10,
      fontSize: 15,
    },
=======
    wipContainer: {
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: "#FFA500",
      alignItems: "center",
    },
    wipText: {
      color: "#FFA500",
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 5,
    },
    wipSubtext: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 14,
      fontStyle: "italic",
    },
    shortcutsContainer: {
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 12,
      padding: 16,
    },
    shortcutItem: {
      color: theme.text,
      fontSize: 16,
      marginVertical: 4,
    },
>>>>>>> d77a796765c5833a85b34c0f4474b5862957b7da
  });

export default ShortcutsPage;
