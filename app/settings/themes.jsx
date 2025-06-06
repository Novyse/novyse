import React, { useContext, useEffect } from "react";
import { StyleSheet, Pressable, Text, View } from "react-native";
import SmartBackground from "../components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { Colors } from "../../constants/Colors";

const Themes = () => {
  const { setColorScheme, theme, colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Ottieni la lista dei temi disponibili
  const availableThemes = Object.keys(Colors);

  // Se nessun tema è selezionato, seleziona "Default"
  useEffect(() => {
    if (!colorScheme || !availableThemes.includes(colorScheme)) {
      setColorScheme("Default");
    }
  }, [colorScheme, setColorScheme]);

  return (
    <SmartBackground
      colors={theme.settingPagesGradient}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="./SettingsMenu" />

      {availableThemes.map((themeName) => (
        <Pressable
          key={themeName}
          onPress={() => setColorScheme(themeName)}
          style={[
            styles.themeButton,
            colorScheme === themeName && styles.activeThemeButton
          ]}
        >
          <View style={styles.themeButtonContent}>
            <Text style={styles.themeText}>
              {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
            </Text>
            {colorScheme === themeName && (
              <View style={styles.activeIndicator} />
            )}
          </View>
        </Pressable>
      ))}
    </SmartBackground>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
    themeButton: {
      padding: 10,
      marginVertical: 5,
      backgroundColor: theme.buttonBackground || theme.backgroundChatInsideList,
      borderRadius: 8,
    },
    activeThemeButton: {
      borderWidth: 2,
      borderColor: theme.primary || theme.text,
    },
    themeButtonContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeText: {
      color: theme.text,
      fontSize: 16,
    },
    activeIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary || theme.text,
    },
  });

export default Themes;
