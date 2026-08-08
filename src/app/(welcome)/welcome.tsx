import React, { useCallback } from "react";
import { View, StyleSheet, Image, ActivityIndicator } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { useScreen } from "@/src/context/ScreenContext";

import QRCode from "react-native-qrcode-skia";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";

import WelcomeButton from "@/src/components/features/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/features/welcome/WelcomeButtonText";

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
    <View style={styles.container}>
      {/* Glass Card */}
      <View style={styles.card}>
        {/* Main Block */}
        <View style={styles.cardContent}>
          <View style={styles.logoAndTitleContainer}>
            <Image style={styles.logo} source={logoNovyse} />
            <Typography style={styles.title} translationKey="auth.welcome.title" />
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
              <Typography
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
                    size={220}
                    logoAreaSize={65}
                    logoAreaBorderRadius={12}
                    logo={
                      <View
                        style={{
                          width: 55,
                          height: 55,
                          borderRadius: 10,
                          backgroundColor:
                            LoginColors[loginTheme].QRCodeLogoBacground,
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          source={logoNovyse}
                          style={{
                            width: 45,
                            height: 45,
                            resizeMode: "contain",
                          }}
                        />
                      </View>
                    }
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, 220)}
                      colors={LoginColors[loginTheme].QRCodeGradient}
                    />
                  </QRCode>
                ) : (
                  <ActivityIndicator
                    size="large"
                    color={LoginColors[loginTheme].iconLoading}
                  />
                )}
              </View>
              <Typography
                style={styles.qrcodeSubtitle}
                translationKey="auth.welcome.scanQr"
              />
              {qrToken ? (
                <Typography
                  style={styles.qrcodeSmallSubtitle}
                  translationKey="auth.welcome.expiresIn"
                  translationOptions={{ time: formatTime(remainingTime) }}
                />
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default Welcome;

function createStyle(loginTheme: LoginTheme, isSmallScreen: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 25,
    },
    card: {
      padding: isSmallScreen ? 15 : 25,
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
      marginTop: 5,
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
