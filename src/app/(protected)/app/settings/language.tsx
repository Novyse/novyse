import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingSelectGroup from "@/src/components/features/settings/SettingsSelectGroup";

export default function LanguageRoute() {
  const { i18n } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [activeLanguage, setActiveLanguage] = useState(i18n.language);

  useEffect(() => {
    setActiveLanguage(i18n.language);
  }, [i18n.language]);

  const languages = [
    {
      value: "en",
      labelText: "English",
      leftElement: (
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>🇬🇧</Text>
        </View>
      ),
    },
    {
      value: "it",
      labelText: "Italiano",
      leftElement: (
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>🇮🇹</Text>
        </View>
      ),
    },
  ];

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    setActiveLanguage(code);
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.languageAndTime"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section titleKey="settings.language.select">
          <SettingSelectGroup
            options={languages}
            value={activeLanguage.split("-")[0]}
            onChange={handleLanguageSelect}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    emojiContainer: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor: theme.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    emoji: {
      fontSize: 20,
    },
  });
