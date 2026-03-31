import React, { useContext } from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
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
      <HeaderWithBackArrow title={"Info"} onBack={onBack} />
      <SettingsPageScrollview>
        <InfoVersionCard theme={theme} />

        <SettingsCard>
          <Text style={styles.sectionTitle}>Connect</Text>
          <InfoLinkItem
            label="View on GitHub"
            icon="GithubIcon"
            theme={theme}
            onPress={() => openLink("https://github.com/Novyse/novyse")}
          />
          <InfoLinkItem
            label="Roadmap"
            icon="GlobalIcon"
            theme={theme}
            onPress={() => openLink("https://www.novyse.com/roadmap")}
          />
        </SettingsCard>

        <SettingsCard>
          <Text style={styles.sectionTitle}>Legal</Text>
          <InfoLinkItem
            label="Privacy Policy"
            icon="Shield01Icon"
            theme={theme}
            onPress={() =>
              openLink("https://www.novyse.com/legal/privacy-policy")
            }
          />
          <InfoLinkItem
            label="Terms of Service"
            icon="AlignBoxTopCenterIcon"
            theme={theme}
            onPress={() =>
              openLink("https://www.novyse.com/legal/terms-of-service")
            }
          />
          <InfoLinkItem
            label="Cookie Policy"
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
