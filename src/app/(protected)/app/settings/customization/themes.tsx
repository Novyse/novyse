import React, { useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import { Colors } from "@/constants/Colors";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Section from "@/src/components/settings/Section";
import SettingSelectGroup from "@/src/components/settings/SettingSelectGroup";

export default function ThemesRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
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
    <>
      <HeaderWithBackArrow translationKey="settings.customization.themes" onBack={onBack} />
      <SettingsPageScrollview>
        <Section titleKey="settings.customization.themesSubtitle">
          <SettingSelectGroup
            options={availableThemes.map((themeName) => ({
              value: themeName,
              labelText: themeName.charAt(0).toUpperCase() + themeName.slice(1),
              leftElement: (
                <View style={styles.iconContainer}>
                  <View
                    style={[
                      styles.themePreview,
                      {
                        backgroundColor: (Colors as any)[themeName]?.primary,
                      },
                    ]}
                  />
                </View>
              ),
            }))}
            value={colorScheme}
            onChange={setColorScheme}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    iconContainer: {
      width: 35,
      height: 35,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    themePreview: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.borderColor,
    },
  });
