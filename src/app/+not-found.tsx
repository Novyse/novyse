import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";

import { useScreen } from "@/src/context/ScreenContext";

import { LoginColors } from "@/constants/LoginColors";

import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import AppText from "@/src/components/AppText";

import logoNovyse from "@/assets/images/logo-novyse.png";

const LOGIN_THEME = "default";

export default function NotFoundPage() {
  const router = useRouter();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(isSmallScreen);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />
          <AppText
            style={styles.title}
            translationKey="layout.notFound.title"
          />
          <AppText
            style={styles.subtitle}
            translationKey="layout.notFound.subtitle"
          />
          <AppText
            style={styles.message}
            translationKey="layout.notFound.message"
          />
          <View style={styles.buttonWrapper}>
            <WelcomeButton onPress={() => router.replace("/")} type="submit">
              <WelcomeButtonText
                type="submit"
                translationKey="layout.notFound.goHome"
              />
            </WelcomeButton>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyle(isSmallScreen: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 24 : 32,
      borderRadius: isSmallScreen ? 0 : 20,
      backgroundColor: LoginColors[LOGIN_THEME].backgroundCard,
      width: isSmallScreen ? "100%" : 400,
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
      alignItems: "center",
    },
    cardContent: {
      width: "100%",
      alignItems: "center",
    },
    logo: {
      height: 120,
      width: 120,
      marginBottom: 24,
    },
    title: {
      fontSize: 64,
      fontWeight: "800",
      color: LoginColors[LOGIN_THEME].title,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 24,
      fontWeight: "600",
      color: LoginColors[LOGIN_THEME].subtitle,
      marginBottom: 16,
      textAlign: "center",
    },
    message: {
      fontSize: 16,
      color: LoginColors[LOGIN_THEME].subtitle2,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 22,
    },
    buttonWrapper: {
      width: "100%",
      maxWidth: 200,
    },
  });
}
