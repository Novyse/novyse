import React, { useContext } from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { APP_VERSION, BUILD_NUMBER, BUILD_DATE } from "../../app.config.js";
import SettingsButton from "../components/settings/SettingsButton";
import SettingsPageScrollview from "../components/settings/SettingsPageScrollview";
import SettingsCard from "../components/settings/SettingsCard";

const Info = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const openLink = (url) => {
    Linking.openURL(url);
  };

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <SettingsPageScrollview>
        {/* Sezione Informazioni Versione */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Version</Text>
          <View style={styles.infoContainer}>
            <InfoRow label="App Version" value={APP_VERSION} />
            <InfoRow label="Build Number" value={BUILD_NUMBER} />
            <InfoRow label="Build Date" value={BUILD_DATE} />
          </View>
        </SettingsCard>

        {/* Open Source Information */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Open Source</Text>
          <Text style={styles.text}>
            Novyse is an open source application available on GitHub.
          </Text>
          <SettingsButton
            onPress={() => openLink("https://github.com/Novyse/novyse")}
            text="View on GitHub"
            textStyle={styles.linkText}
          />
        </SettingsCard>

        {/* Development Roadmap */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Development</Text>
          <Text style={styles.text}>
            Follow our development progress and see what's coming next.
          </Text>
          <SettingsButton
            onPress={() => openLink("https://www.novyse.com/roadmap")}
            text="View Public Roadmap"
            textStyle={styles.linkText}
          />
        </SettingsCard>

        {/* Legal Information */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Text style={styles.text}>
            Please review our legal documents and policies.
          </Text>

          <View style={styles.linkContainer}>
            <SettingsButton
              onPress={() =>
                openLink("https://www.novyse.com/legal/privacy-policy")
              }
              text="Privacy Policy"
              textStyle={styles.linkText}
            />
            <SettingsButton
              onPress={() =>
                openLink("https://www.novyse.com/legal/terms-of-service")
              }
              text="Terms of Service"
              textStyle={styles.linkText}
            />
            <SettingsButton
              onPress={() =>
                openLink("https://www.novyse.com/legal/cookie-policy")
              }
              text="Cookie Policy"
              textStyle={styles.linkText}
            />
            <SettingsButton
              onPress={() =>
                openLink("https://www.novyse.com/legal/gdpr-compliance")
              }
              text="GDPR Compliance"
              textStyle={styles.linkText}
            />
          </View>
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 16,
    },
    text: {
      color: theme.subtitle,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
    infoContainer: {
      gap: 8,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    infoLabel: {
      color: theme.subtitle,
      fontSize: 16,
    },
    infoValue: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    linkContainer: {
      gap: 8,
    },
    linkText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default Info;
