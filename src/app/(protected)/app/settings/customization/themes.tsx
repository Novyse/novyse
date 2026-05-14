import React, { useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import { Colors, ThemeRegistry } from "@/constants/Colors";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Section from "@/src/components/settings/Section";
import SettingSelectGroup from "@/src/components/settings/SettingSelectGroup";

export default function ThemesRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const { setColorTheme, theme, colorTheme, appearanceMode, setAppearanceMode } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Ottieni la configurazione del tema attuale
  const themeConfig = ThemeRegistry[colorTheme];
  const supportsMultipleModes = themeConfig ? themeConfig.modes.length > 1 : true;

  // Ottieni la lista dei temi disponibili dal Registry
  const availableThemes = Object.keys(ThemeRegistry);

  // Se nessun tema è selezionato, seleziona "default"
  useEffect(() => {
    if (!colorTheme || !ThemeRegistry[colorTheme]) {
      setColorTheme("default");
    }
  }, [colorTheme, setColorTheme]);

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.customization.themes" onBack={onBack} />
      <SettingsPageScrollview>
        {supportsMultipleModes && (
          <Section titleKey="settings.modifyProfile.appearance">
            <SettingSelectGroup
              options={[
                { value: "system", labelKey: "settings.themeOptions.system", iconName: "Settings01Icon" },
                { value: "light", labelKey: "settings.themeOptions.light", iconName: "Sun03Icon" },
                { value: "dark", labelKey: "settings.themeOptions.dark", iconName: "Moon02Icon" },
              ]}
              value={appearanceMode}
              onChange={setAppearanceMode}
            />
          </Section>
        )}

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
                        backgroundColor: (Colors as any)[
                          ThemeRegistry[themeName]?.colors.light ||
                            ThemeRegistry[themeName]?.colors.dark ||
                            "default"
                        ]?.primary,
                      },
                    ]}
                  />
                </View>
              ),
            }))}
            value={colorTheme}
            onChange={setColorTheme}
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
