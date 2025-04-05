import React, { useContext } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { Colors } from "../../constants/Colors";

const Themes = () => {
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Ottieni la lista dei temi disponibili
  const availableThemes = Object.keys(Colors);

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow goBackTo="./SettingsMenu" />

      {availableThemes.map((themeName) => (
        <Pressable
          key={themeName}
          onPress={() => setColorScheme(themeName)}
          style={styles.themeButton}
        >
          <Text style={styles.themeText}>
            {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
    },
    themeButton: {
      padding: 10,
      marginVertical: 5,
      backgroundColor: theme.buttonBackground || "#e0e0e0", // Personalizzabile
    },
    themeText: {
      color: theme.text || "#000000",
      fontSize: 16,
    },
  });

export default Themes;