import React, { useContext, useEffect } from "react";
import { StyleSheet, Pressable, Text, View } from "react-native";
import ScreenLayout from "@/src/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import { Colors } from "@/constants/Colors";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const Themes = ({ navigation }) => {
  const onBack = () => navigation.goBack();
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
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Themes"} onBack={onBack} />
      <SettingsPageScrollview>
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
              android_ripple={{ color: "rgba(255,255,255,0.1)" }}
            >
              <View style={styles.themeButtonContent}>
                <View style={styles.themeInfo}>
                  <View
                    style={[
                      styles.themePreview,
                      {
                        backgroundColor: Colors[themeName]?.primary,
                      },
                    ]}
                  />
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
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      color: theme.textTime,
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
    },
    themesContainer: {
      gap: 12,
    },
    themeButton: {
      backgroundColor: theme.backgroundSettingsCards,
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
      borderColor: theme.primary,
      backgroundColor: theme.backgroundSettingsCards,
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
      borderColor: theme.borderColor,
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
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    checkmark: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export default Themes;
