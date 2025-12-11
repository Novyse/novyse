import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import MyStatusBar from "@/src/components/MyStatusBar";
import gateway from "@/src/utils/backend-services/api-gateway";
import auth from "@/src/utils/welcome/auth";
import OtpDigitsInput from "@/src/components/OtpDigitsInput";
import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import logoNovyse from "@/assets/images/logo-novyse.png";

const Verify = ({}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const loginTheme = "default";
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const { token, verificationType } = useLocalSearchParams();

  useEffect(() => {
    auth.checkShouldBeHere(router, false);

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

  const getFormattedVerificationType = () => {
    if (!verificationType) {
      return "Verify Code";
    }
    switch (verificationType) {
      case "email":
        return "Email OTP";
      case "email_verification":
        return "Verify Email ";
      case "authenticator":
        return "Authenticator App";
      default:
        return "Verify Code";
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6 || !/^\d+$/.test(fullOtp)) {
      setError("Enter a valid code");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("Verifying OTP:", fullOtp);
      console.log("Token:", token);

      const otpVerificationSuccess = await gateway.auth.verifyTwofaCode(
        token,
        fullOtp
      );

      if (otpVerificationSuccess) {
        console.log("OTP verificato con successo!");
        const success = await auth.initializeApp();
        if (success) {
          router.replace("/chat");
        }
      } else {
        console.log("Errore nella verifica OTP");
        setError("Codice OTP non valido. Riprova.");
      }
    } catch (apiError) {
      console.error("Errore durante la verifica OTP:", apiError);
      setError("Si è verificato un errore durante la verifica. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.navigate("/login");
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />

          <Text style={styles.title}>{getFormattedVerificationType()}</Text>
          <Text style={styles.subtitle}>
            Enter the code you received in your email.
          </Text>

          <View style={styles.inputWrapper}>
            <OtpDigitsInput
              value={otp}
              onChange={setOtp}
              error={!!error}
              inputCount={6}
            />

            <View style={styles.buttonsContainer}>
              <WelcomeButton onPress={handleBack} type={"back"}>
                <WelcomeButtonText type={"back"} />
              </WelcomeButton>
              <WelcomeButton
                onPress={handleVerifyOtp}
                disabled={isLoading}
                type={"submit"}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={LoginColors[loginTheme].iconLoading}
                  />
                ) : (
                  <WelcomeButtonText type={"submit"} />
                )}
              </WelcomeButton>
            </View>
          </View>
          <StatusMessage type="error" text={error} />
        </View>
      </View>
    </LinearGradient>
  );
};

export default Verify;

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
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      width: isSmallScreen ? "100%" : 400,
      justifyContent: isSmallScreen ? undefined : "center",
      alignContent: "center",
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 24,
    },
    subtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginBottom: 40,
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    inputWrapper: {
      alignSelf: "center",
      width: isSmallScreen ? "100%" : 350,
      alignItems: "center",
    },
    buttonsContainer: {
      alignItems: "center",
      width: "100%",
      flexDirection: "row",
      maxWidth: 300,
    },
  });
}
