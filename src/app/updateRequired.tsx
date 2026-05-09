import React from "react";
import {
  View,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useThemeContext } from "../../context/ThemeContext";

import AppText from "@/src/components/AppText";

import { APP_VERSION } from "../../app.config";

const DOWNLOAD_URL = "https://novyse.com/#download";

export default function UpdateRequiredScreen() {
  const { theme } = useThemeContext();
  const { minVersion } = useLocalSearchParams();
  const router = useRouter();
  const styles = createStyle(theme);

  const handleUpdatePress = () => {
    Linking.openURL(DOWNLOAD_URL);
  };

  const handleGoBack = () => {
    router.replace("/");
  };

  return (
    <LinearGradient colors={theme.backgroundMainGradient} style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      {/* Text content */}
      <AppText
        style={styles.title}
        translationKey="layout.updateRequired.title"
      />
      <AppText
        style={styles.subtitle}
        translationKey="layout.updateRequired.subtitle"
      />
      {/* Version Info */}
      <View style={styles.versionContainer}>
        <AppText
          style={styles.versionText}
          translationKey="layout.updateRequired.currentVersion"
          translationOptions={{
            version: APP_VERSION,
          }}
        />
        {minVersion && (
          <AppText
            style={styles.versionText}
            translationKey="layout.updateRequired.requiredVersion"
            translationOptions={{
              version: minVersion,
            }}
          />
        )}
      </View>
      {/* CTA Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdatePress}
        activeOpacity={0.85}
      >
        <AppText
          style={styles.buttonText}
          translationKey="layout.updateRequired.downloadLatestVersion"
        />
      </TouchableOpacity>
      {/* Go Back Button & Warning */}
      <View style={styles.backContainer}>
        <AppText
          style={styles.warningText}
          translationKey="layout.updateRequired.warning"
        />
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <AppText
            style={styles.secondaryButtonText}
            translationKey="layout.updateRequired.goBack"
          />
        </TouchableOpacity>
      </View>
      {/* Helper link */}
      <AppText
        style={styles.helperText}
        translationKey="layout.updateRequired.helperText"
        translationOptions={{
          link: "https://novyse.com/#download",
        }}
      />
    </LinearGradient>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    logoContainer: {
      marginBottom: 32,
    },
    logo: {
      width: 72,
      height: 72,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.backgroundCard,
      borderWidth: 1.5,
      borderColor: theme.borderColor,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    iconBadgeText: {
      fontSize: 24,
      color: theme.text,
      fontWeight: "700",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 14,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtitle,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 22,
      maxWidth: 320,
    },
    versionContainer: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 36,
      backgroundColor: theme.backgroundMain,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    versionText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "600",
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 15,
      paddingHorizontal: 36,
      borderRadius: 12,
      shadowColor: theme.shadowColor,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      marginBottom: 20,
    },
    buttonText: {
      color: theme.text,
      fontWeight: "700",
      fontSize: 16,
      letterSpacing: 0.2,
    },
    backContainer: {
      alignItems: "center",
      marginBottom: 32,
    },
    warningText: {
      fontSize: 12,
      color: theme.subtitle,
      textAlign: "center",
      marginBottom: 8,
      paddingHorizontal: 20,
      opacity: 0.8,
    },
    secondaryButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    secondaryButtonText: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 14,
      textDecorationLine: "underline",
    },
    helperText: {
      fontSize: 13,
      color: theme.subtitle,
      textAlign: "center",
      lineHeight: 20,
    },
    linkText: {
      color: theme.textLink,
      textDecorationLine: "underline",
    },
  });
