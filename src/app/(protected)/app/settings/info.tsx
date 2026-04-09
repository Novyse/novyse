import React, { useContext } from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import InfoVersionCard from "@/src/components/settings/info/InfoVersionCard";
import InfoLinkItem from "@/src/components/settings/info/InfoLinkItem";

export default function InfoRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.menu.info" onBack={onBack} />
      <SettingsPageScrollview>
        <InfoVersionCard theme={theme} />

        <SettingsCard>
          <AppText style={styles.sectionTitle} translationKey="settings.info.connect" />
          <InfoLinkItem
            translationKey="settings.info.viewOnGithub"
            icon="GithubIcon"
            theme={theme}
            onPress={() => openLink("https://github.com/Novyse/novyse")}
          />
          <InfoLinkItem
            translationKey="settings.info.roadmap"
            icon="GlobalIcon"
            theme={theme}
            onPress={() => openLink("https://www.novyse.com/roadmap")}
          />
        </SettingsCard>

        <SettingsCard>
          <AppText style={styles.sectionTitle} translationKey="settings.info.legal" />
          <InfoLinkItem
            translationKey="settings.info.privacyPolicy"
            icon="Shield01Icon"
            theme={theme}
            onPress={() =>
              openLink("https://www.novyse.com/legal/privacy-policy")
            }
          />
          <InfoLinkItem
            translationKey="settings.info.termsOfService"
            icon="AlignBoxTopCenterIcon"
            theme={theme}
            onPress={() =>
              openLink("https://www.novyse.com/legal/terms-of-service")
            }
          />
          <InfoLinkItem
            translationKey="settings.info.cookiePolicy"
            icon="CookieIcon"
            theme={theme}
            onPress={() =>
              openLink("https://www.novyse.com/legal/cookie-policy")
            }
          />
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
      marginBottom: 12,
      marginLeft: 4,
      opacity: 0.6,
    },
  });
