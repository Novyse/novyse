import React, { useContext } from "react";
import { StyleSheet, Text, View, Linking, ScrollView } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import { APP_VERSION } from "../../app.config.js";
import SettingsButton from "../components/settings/SettingsButton";

const Info = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Version Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Version</Text>
            <Text style={styles.versionText}>{APP_VERSION}</Text>
          </View>

          {/* Open Source Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Open Source</Text>
            <Text style={styles.text}>
              Novyse is an open source application available on GitHub.
            </Text>
            <SettingsButton
              onPress={() => openLink("https://github.com/Novyse/novyse")}
              text="View on GitHub"
              textStyle={styles.linkText}
            />
          </View>

          {/* Development Roadmap */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Development</Text>
            <Text style={styles.text}>
              Follow our development progress and see what's coming next.
            </Text>
            <SettingsButton
              onPress={() => openLink("https://www.novyse.com/roadmap")}
              text="View Public Roadmap"
              textStyle={styles.linkText}
            />
          </View>

          {/* Legal Information */}
          <View style={styles.card}>
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
          </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    content: {
      flex: 1,
      paddingTop: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: theme.backgroundSettingsCards || "#23232b",
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 12,
    },
    text: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
    versionText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      backgroundColor: theme.inputBackground || "#1a1d29",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.borderColor || "#333",
    },
    linkContainer: {
      gap: 8,
    },
    linkText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default Info;
