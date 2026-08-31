import { Linking } from "react-native";
import { router } from "expo-router";

import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import { APP_VERSION } from "@/app.config";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingsRow";

export default function InfoRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.menu.info"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section>
          <SettingRow
            labelKey="settings.info.version"
            value={APP_VERSION}
            type="VALUE"
            iconName="InformationCircleIcon"
          />
        </Section>
        <Section titleKey="settings.info.connect">
          <SettingRow
            labelKey="settings.info.viewOnGithub"
            iconName="GithubIcon"
            rightIconName="Share05Icon"
            onPress={() => openLink("https://github.com/Novyse/novyse")}
          />
          <SettingRow
            labelKey="settings.info.roadmap"
            iconName="GlobalIcon"
            rightIconName="Share05Icon"
            onPress={() => openLink("https://www.novyse.com/roadmap")}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        <Section titleKey="settings.info.legal">
          <SettingRow
            labelKey="settings.info.privacyPolicy"
            iconName="Shield01Icon"
            rightIconName="Share05Icon"
            onPress={() =>
              openLink("https://www.novyse.com/legal/privacy-policy")
            }
          />
          <SettingRow
            labelKey="settings.info.termsOfService"
            iconName="AlignBoxTopCenterIcon"
            rightIconName="Share05Icon"
            onPress={() =>
              openLink("https://www.novyse.com/legal/terms-of-service")
            }
          />
          <SettingRow
            labelKey="settings.info.cookiePolicy"
            iconName="CookieIcon"
            rightIconName="Share05Icon"
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
