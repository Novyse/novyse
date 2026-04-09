import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

export default function LanguageRoute() {
  const { t, i18n } = useTranslation();
  const onBack = () => (router.canGoBack() ? router.back() : router.push("/app"));
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [activeLanguage, setActiveLanguage] = useState(i18n.language);

  // Sync state if i18n changes externally somehow
  useEffect(() => {
    setActiveLanguage(i18n.language);
  }, [i18n.language]);

  const languages = [
    { code: "en", label: t("settings.language.english", "English") },
    { code: "it", label: t("settings.language.italian", "Italian") },
  ];

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    setActiveLanguage(code);
  };

  return (
    <>
      <HeaderWithBackArrow title={t("settings.languageAndTime", "Language & Time")} onBack={onBack} />
      <SettingsPageScrollview>
        <SettingsCard>
          <Text style={styles.sectionTitle}>{t("settings.language.select", "App Language")}</Text>
          <View style={styles.listContainer}>
            {languages.map((lang, index) => {
              const isSelected = activeLanguage.startsWith(lang.code);
              return (
                <HoverAndPressedButton
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  style={[
                    styles.menuItem,
                    index === languages.length - 1 ? styles.lastMenuItem : {},
                  ]}
                >
                  <Text style={styles.menuItemText}>{lang.label}</Text>
                  {isSelected && (
                    <View style={styles.iconContainer}>
                      <Icon name={"CheckmarkCircle02Icon"} color={theme.primary} />
                    </View>
                  )}
                </HoverAndPressedButton>
              );
            })}
          </View>
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    sectionTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 0,
      marginLeft: 4,
      opacity: 0.6,
      paddingVertical: 12,
    },
    listContainer: {
      marginTop: 4,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSettingsDivider,
      height: 60,
    },
    lastMenuItem: {
      borderBottomWidth: 0,
    },
    menuItemText: {
      color: theme.text,
      fontSize: 16,
      marginLeft: 10,
    },
    iconContainer: {
      marginRight: 15,
    },
  });
