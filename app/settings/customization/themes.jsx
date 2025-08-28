import React, { useContext, useEffect } from "react";
import { StyleSheet, Pressable, Text, View, ScrollView } from "react-native";
import ScreenLayout from "../../components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import { Colors } from "../../../constants/Colors";

const Themes = () => {
  const { setColorScheme, theme, colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Ottieni la lista dei temi disponibili
  const availableThemes = Object.keys(Colors);

  // Se nessun tema è selezionato, seleziona "default"
  useEffect(() => {
    if (!colorScheme || !availableThemes.includes(colorScheme)) {
      setColorScheme("default");
    }
  }, [colorScheme, setColorScheme]);

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <HeaderWithBackArrow goBackTo="./" />
        
        <View style={styles.content}>
          <Text style={styles.title}>Themes</Text>
          <Text style={styles.subtitle}>Choose your preferred color scheme</Text>

          <View style={styles.themesContainer}>
            {availableThemes.map((themeName) => (
              <Pressable
                key={themeName}
                onPress={() => setColorScheme(themeName)}
                style={[
                  styles.themeButton,
                  colorScheme === themeName && styles.activeThemeButton,
                ]}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <View style={styles.themeButtonContent}>
                  <View style={styles.themeInfo}>
                    <View style={[
                      styles.themePreview,
                      { backgroundColor: Colors[themeName]?.primary || "#4f8cff" }
                    ]} />
                    <Text style={styles.themeText}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </Text>
                  </View>
                  {colorScheme === themeName && (
                    <View style={styles.activeIndicator}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    content: {
      paddingTop: 20,
      paddingBottom: 40,
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      color: theme.textTime || "#b0b0b0",
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
    },
    themesContainer: {
      gap: 12,
    },
    themeButton: {
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: "transparent",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    activeThemeButton: {
      borderColor: theme.primary || "#4f8cff",
      backgroundColor: theme.cardBackground || "#23232b",
      elevation: 4,
      shadowOpacity: 0.2,
    },
    themeButtonContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    themeInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    themePreview: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.borderColor || "#333",
    },
    themeText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "600",
    },
    activeIndicator: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary || "#4f8cff",
      justifyContent: "center",
      alignItems: "center",
    },
    checkmark: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export default Themes;