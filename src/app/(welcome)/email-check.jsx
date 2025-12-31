import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  BackHandler,
  Platform,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";

import {
  KeyboardAvoidingView,
  KeyboardController,
} from "react-native-keyboard-controller";

import gateway from "@/src/utils/backend-services/api-gateway";
import validate from "@/src/utils/welcome/validator";

import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";

import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import MyStatusBar from "@/src/components/MyStatusBar";

import auth from "@/src/utils/welcome/auth";

import logoForQR from "@/assets/images/logo-novyse.png";
import logoNovyse from "@/assets/images/logo-novyse.png";

const EmailCheckForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const [qrToken, setQrToken] = useState("");

  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const loginTheme = "default";

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;

  const styles = createStyle(loginTheme, isSmallScreen);

  const router = useRouter();

  useEffect(() => {
    let pollingInterval;
    let isMounted = true;

    const fetchQrToken = async () => {
      if (isNavigating) return;

      const { success, qrCodeToken, expiresIn } =
        await gateway.auth.generateQRCodeToken();

      if (isMounted) {
        setQrToken(qrCodeToken);
        setRemainingTime(parseExpiresIn(expiresIn));
      }

      // Avvia il polling solo se il token è valido
      if (qrCodeToken) {
        pollingInterval = setInterval(async () => {
          try {
            if (!isMounted) {
              clearInterval(pollingInterval);
              return;
            }

            const response = await gateway.auth.checkQRCodeToken(qrCodeToken);
            const { success, scanned } = response;
            if (success) {
              if (scanned) {
                // QR code scanned, save tokens and navigate
                if (await auth.initializeApp()) {
                  router.replace("/chat");
                }

                setQrToken(null);
                clearInterval(pollingInterval);
              } else {
                // Valid QR but not yet scanned
              }
            } else {
              throw new Error("Failed to check QR code status");
            }
          } catch (error) {
            if (!success) {
              // QR scaduto: rigenera
              setQrToken(null);
              clearInterval(pollingInterval);
              fetchQrToken();
            } else {
              clearInterval(pollingInterval);
            }
          }
        }, 5000);
      }
    };

    if (!isSmallScreen) fetchQrToken();

    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isNavigating, isSmallScreen, router]);

  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setTimeout(() => setRemainingTime(remainingTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  useEffect(() => {
    const backAction = () => {
      router.navigate("/");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const parseExpiresIn = (expiresIn) => {
    if (typeof expiresIn === "string") {
      if (expiresIn.endsWith("m")) {
        return parseInt(expiresIn.slice(0, -1)) * 60;
      } else if (expiresIn.endsWith("s")) {
        return parseInt(expiresIn.slice(0, -1));
      }
    }
    return expiresIn;
  };

  const handleSubmit = async () => {
    if (!email) {
      setError("Email cannot be empty");
      return;
    }

    if (!validate.user.email(email)) {
      setError("Inserted email is not valid");
      return;
    }

    setError(null);
    checkEmailAndNavigate(email);
  };

  const checkEmailAndNavigate = async (email) => {
    await KeyboardController.dismiss();
    try {
      const response = await gateway.check.email(email);


      let emailResponse = "login";
      if (response.success) {
        if (response.free) {
          emailResponse = "signup";
        }
      }
      setIsNavigating(true);

      

      if (emailResponse === "signup") {
        router.navigate({
          pathname: "/signup",
          params: {
            email: email,
          },
        });
      } else if (emailResponse === "login") {
        router.navigate({
          pathname: "/login",
          params: {
            email: email,
          },
        });
      } else {
        console.error("Errore: Risposta sconosciuta dall'API.");
      }
    } catch (error) {
      if (error.code === "ERR_BAD_REQUEST") {
        setError("Please enter a valid email address.");
      } else {
        setError("An error occurred while checking the email.");
      }

      console.error("Errore durante la verifica email:", error);
    }
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <MyStatusBar />
      {/* Glass Card */}
      <View style={styles.card}>
        {/* Email Block */}
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />
          <Text style={styles.title}>Welcome</Text>
          <KeyboardAvoidingView
            behavior={"position"}
            keyboardVerticalOffset={170}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                placeholder="Email"
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={
                  Platform.OS === "web" ? handleSubmit : undefined
                }
              />
              <View style={styles.buttonContainer}>
                <WelcomeButton type={"submit"} onPress={handleSubmit}>
                  <WelcomeButtonText type={"submit"} />
                </WelcomeButton>
              </View>
            </View>
          </KeyboardAvoidingView>
          <View style={styles.containerStatus}>
            <StatusMessage
              type="error"
              content={[error]}
              visible={!!error}
              onClose={() => {
                setError(null);
              }}
            />
          </View>
        </View>

        {/* 3. Esegui il rendering del divider e del QR Code solo se lo schermo NON è piccolo */}
        {!isSmallScreen && (
          <>
            <View style={styles.divider}>
              <View style={styles.lineDivider} />
              <Text style={styles.textDivider}>OR</Text>
              <View style={styles.lineDivider} />
            </View>

            {/* QR Code Block */}
            <View style={styles.qrCardContent}>
              <View style={styles.qrcodeContainer}>
                {qrToken ? (
                  <QRCode
                    value={qrToken}
                    logo={logoForQR}
                    size={styles.qrcodeContainer.width}
                    enableLinearGradient={true}
                    linearGradient={LoginColors[loginTheme].QRCodeGradient}
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
              <Text style={styles.qrcodeSubtitle}>Scan QR to login</Text>
              {qrToken && (
                <Text style={styles.qrcodeSmallSubtitle}>
                  Expires in {formatTime(remainingTime)}
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

export default EmailCheckForm;

function createStyle(loginTheme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 16 : 24,
      borderRadius: isSmallScreen ? 0 : 20,
      overflow: "hidden",
      flexDirection: isSmallScreen ? "column" : "row",
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      width: isSmallScreen ? "100%" : 400,
      justifyContent: isSmallScreen ? "" : "center",
      alignContent: "center",
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: isSmallScreen ? 140 : 40,
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
    inputWrapper: {
      alignSelf: "center",
      width: isSmallScreen ? "100%" : 300,
      alignItems: "center",
    },
    containerStatus: {
      alignSelf: "center",
      width: 300,
      alignItems: "center",
    },
    textInput: {
      padding: 10,
      borderRadius: 6,
      marginBottom: 16,
      fontSize: 16,
      maxWidth: 300,
      width: "100%",
      color: LoginColors[loginTheme].text,
      outlineStyle: "none",
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      height: 45,
    },
    qrcodeContainer: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      height: 250,
      width: 250,
      backgroundColor: LoginColors[loginTheme].backgroundQRCode,
      borderRadius: 12,
      borderColor: LoginColors[loginTheme].borderQRCode,
      borderWidth: 1.5,
      padding: 10,
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
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
    },
    qrCardContent: {
      width: isSmallScreen ? "100%" : 400,
      justifyContent: isSmallScreen ? "" : "center",
      alignContent: "center",
      marginTop: 40,
    },
  });
}
