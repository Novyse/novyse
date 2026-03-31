import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeContext } from "../../context/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
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

  const gradientColors = (theme.backgroundMainGradient as [
    string,
    string,
    ...string[],
  ]) ?? ["#013480", "#177FC0"];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Text content */}
      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.subtitle}>
        A new version of Novyse is available and required to continue.{"\n"}
        Please update to access the latest features and security improvements.
      </Text>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Current: {APP_VERSION}</Text>
        {minVersion && (
          <Text style={styles.versionText}>Required: {minVersion}</Text>
        )}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdatePress}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Download Latest Version</Text>
      </TouchableOpacity>

      {/* Go Back Button & Warning */}
      <View style={styles.backContainer}>
        <Text style={styles.warningText}>
          Note: If you continue without updating, online features will be
          unavailable.
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Go back to Novyse</Text>
        </TouchableOpacity>
      </View>

      {/* Helper link */}
      <Text style={styles.helperText}>
        Visit{" "}
        <Text style={styles.linkText} onPress={handleUpdatePress}>
          novyse.com
        </Text>{" "}
        to get the update for your device.
      </Text>
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
      backgroundColor: "rgba(79, 140, 255, 0.25)",
      borderWidth: 1.5,
      borderColor: "rgba(79, 140, 255, 0.6)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    iconBadgeText: {
      fontSize: 24,
      color: "#4f8cff",
      fontWeight: "700",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.text ?? "#ffffff",
      marginBottom: 14,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 15,
      color: theme.iconSecondary ?? "#c9d1d9",
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 22,
      maxWidth: 320,
    },
    versionContainer: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 36,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    versionText: {
      fontSize: 12,
      color: theme.placeholderText ?? "#c9c9c9",
      fontWeight: "600",
    },
    button: {
      backgroundColor: theme.primary ?? "#4f8cff",
      paddingVertical: 15,
      paddingHorizontal: 36,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      marginBottom: 20,
    },
    buttonText: {
      color: "#ffffff",
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
      color: theme.placeholderText ?? "#c9c9c9",
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
      color: theme.iconSecondary ?? "#c9d1d9",
      fontWeight: "600",
      fontSize: 14,
      textDecorationLine: "underline",
    },
    helperText: {
      fontSize: 13,
      color: theme.placeholderText ?? "#c9c9c9",
      textAlign: "center",
      lineHeight: 20,
    },
    linkText: {
      color: theme.primary ?? "#4f8cff",
      textDecorationLine: "underline",
    },
  });
