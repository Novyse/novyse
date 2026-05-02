import React, { useContext } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import { APP_VERSION, BUILD_NUMBER, BUILD_DATE } from "@/app.config";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import Section from "@/src/components/settings/Section";
import SettingRow from "@/src/components/settings/SettingRow";

export default function InfoRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.menu.info" onBack={onBack} />
      <SettingsPageScrollview>
        <Section theme={theme}>
          <SettingRow
            labelKey="settings.info.version"
            value={APP_VERSION}
            type="VALUE"
            iconName="InformationCircleIcon"
          />
          <SettingRow
            labelKey="settings.info.build"
            value={String(BUILD_NUMBER)}
            type="VALUE"
            iconName="PackageIcon"
          />
          <SettingRow
            labelKey="settings.info.released"
            value={BUILD_DATE.split(" ")[0]}
            type="VALUE"
            iconName="Calendar01Icon"
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        <Section titleKey="settings.info.connect" theme={theme}>
          <SettingRow
            labelKey="settings.info.viewOnGithub"
            iconName="GithubIcon"
            onPress={() => openLink("https://github.com/Novyse/novyse")}
          />
          <SettingRow
            labelKey="settings.info.roadmap"
            iconName="GlobalIcon"
            onPress={() => openLink("https://www.novyse.com/roadmap")}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        <Section titleKey="settings.info.legal" theme={theme}>
          <SettingRow
            labelKey="settings.info.privacyPolicy"
            iconName="Shield01Icon"
            onPress={() =>
              openLink("https://www.novyse.com/legal/privacy-policy")
            }
          />
          <SettingRow
            labelKey="settings.info.termsOfService"
            iconName="AlignBoxTopCenterIcon"
            onPress={() =>
              openLink("https://www.novyse.com/legal/terms-of-service")
            }
          />
          <SettingRow
            labelKey="settings.info.cookiePolicy"
            iconName="CookieIcon"
            onPress={() =>
              openLink("https://www.novyse.com/legal/cookie-policy")
            }
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
      </SettingsPageScrollview>
    </>
  );
}
