import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Image, ActivityIndicator } from "react-native";
import AppText from "@/src/components/AppText";

import { useScreen } from "@/context/ScreenContext";

import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";

import MyStatusBar from "@/src/components/MyStatusBar";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";

import auth from "@/src/utils/welcome/auth";
import useQRCode from "@/src/hooks/auth/useQRCode";
import { LoginTheme } from "@/constants/LoginColors";

import logoNovyse from "@/assets/images/logo-novyse.png";

const Welcome = () => {
  const loginTheme: LoginTheme = "default";

  const { isSmallScreen } = useScreen();
  const styles = createStyle(loginTheme, isSmallScreen);

  const router = useRouter();
  const handleAuthorized = useCallback(
    async (data: any) => {
      await auth.setLogin(data.userUUID, data.sessionID, data.session_id);
      router.replace("/app");
    },
    [router],
  );

  const { qrToken, remainingTime } = useQRCode(isSmallScreen, handleAuthorized);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogin = () => {
    router.navigate("/login");
  };

  const handleSignup = () => {
    router.navigate("/signup");
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <MyStatusBar />

      {/* Glass Card */}
      <View style={styles.card}>
        {/* Main Block */}
        <View style={styles.cardContent}>
          <View style={styles.logoAndTitleContainer}>
            <Image style={styles.logo} source={logoNovyse} />
            <AppText style={styles.title} translationKey="auth.welcome.title" />
          </View>

          {/* Login / Signup buttons */}
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <WelcomeButton type={"back"} onPress={handleSignup}>
                <WelcomeButtonText
                  type={"back"}
                  translationKey="auth.welcome.signup"
                />
              </WelcomeButton>
            </View>
            <View style={styles.buttonWrapper}>
              <WelcomeButton type={"submit"} onPress={handleLogin}>
                <WelcomeButtonText
                  type={"submit"}
                  translationKey="auth.welcome.login"
                />
              </WelcomeButton>
            </View>
          </View>
        </View>

        {/* QR Code section — only on large screens */}
        {!isSmallScreen && (
          <>
            <View style={styles.divider}>
              <View style={styles.lineDivider} />
              <AppText
                style={styles.textDivider}
                translationKey="auth.welcome.or"
              />
              <View style={styles.lineDivider} />
            </View>

            <View style={styles.qrCardContent}>
              <View style={styles.qrcodeContainer}>
                {qrToken ? (
                  <QRCode
                    value={qrToken}
                    logo={logoNovyse}
                    size={styles.qrcodeContainer.width}
                    enableLinearGradient={true}
                    linearGradient={
                      LoginColors[loginTheme].QRCodeGradient as any
                    }
                    logoBorderRadius={100}
                    logoMargin={5}
                    logoBackgroundColor={
                      LoginColors[loginTheme].QRCodeLogoBacground
                    }
                  />
                ) : (
                  <ActivityIndicator
                    size="large"
                    color={LoginColors[loginTheme].iconLoading}
                  />
                )}
              </View>
              <AppText
                style={styles.qrcodeSubtitle}
                translationKey="auth.welcome.scanQr"
              />
              {qrToken ? (
                <AppText
                  style={styles.qrcodeSmallSubtitle}
                  translationKey="auth.welcome.expiresIn"
                  translationOptions={{ time: formatTime(remainingTime) }}
                />
              ) : null}
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

export default Welcome;

function createStyle(loginTheme: LoginTheme, isSmallScreen: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 16 : 24,
      borderRadius: isSmallScreen ? 0 : 25,
      overflow: "hidden",
      flexDirection: isSmallScreen ? "column" : "row",
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      flex: isSmallScreen ? 1 : undefined,
      width: isSmallScreen ? "100%" : 400,
      justifyContent: isSmallScreen ? "space-between" : "center",
      alignContent: "center",
      paddingBottom: isSmallScreen ? 40 : 0,
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 40,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      width: isSmallScreen ? "100%" : 300,
      justifyContent: "center",
      alignSelf: "center",
      alignItems: "flex-end",
    },
    buttonWrapper: {
      flex: 1,
      maxWidth: 144,
    },
    qrcodeSubtitle: {
      fontSize: 18,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginTop: 4,
      fontWeight: "600",
    },
    qrcodeSmallSubtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginTop: 2,
      fontWeight: "500",
    },
    qrcodeContainer: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      height: 250,
      width: 250,
      backgroundColor: LoginColors[loginTheme].backgroundQRCode,
      borderRadius: 25,
      borderColor: LoginColors[loginTheme].borderQRCode,
      borderWidth: 1.5,
      padding: 15,
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    divider: {
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      marginHorizontal: 20,
    },
    lineDivider: {
      flex: 1,
      width: 1,
      backgroundColor: LoginColors[loginTheme].backgroundLineDivider,
    },
    textDivider: {
      marginVertical: 10,
      color: LoginColors[loginTheme].text,
      fontSize: 16,
    },
    qrCardContent: {
      width: isSmallScreen ? "100%" : 400,
      justifyContent: isSmallScreen ? undefined : "center",
      alignContent: "center",
      marginTop: 40,
    },
    logoAndTitleContainer: {
      justifyContent: "center",
      alignItems: "center",
      marginTop: isSmallScreen ? 165 : 0,
    },
  });
}
