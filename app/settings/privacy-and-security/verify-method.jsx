import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "@/app/utils/APImethods";
import OtpDigitsInput from "@/app/components/OtpDigitsInput";
import SmartBackground from "@/app/components/SmartBackground";
import HeaderWithBackArrow from "@/app/components/HeaderWithBackArrow";
import QRCode from "react-native-qrcode-svg";
import StatusMessage from '@/app/components/StatusMessage';

const VerifyMethod = ({}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSmallScreen);
  const logoForQR = require("../../../assets/images/logo-novyse-nobg-less-margin.png");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const { token, verificationType, secret, otpauth } = useLocalSearchParams();

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome/emailcheck");
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

  const getSubtitleText = () => {
    if (!verificationType) {
      return "Enter the verification code.";
    }
    switch (verificationType) {
      case "email":
      case "email_verification":
        return "Enter the code you received in your email.";
      case "authenticator":
        return "Enter the code from your authenticator app.";
      default:
        return "Enter the verification code.";
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
      const data = await APIMethods.twoFactorsAuth(
        verificationType,
        token,
        fullOtp
      );
      const otpVerificationSuccess = data.authenticated;

      if (otpVerificationSuccess) {
        router.replace("/settings/privacy-and-security/twofa-methods");
      } else {
        setError("Codice OTP non valido. Riprova.");
      }
    } catch (apiError) {
      setError("Si è verificato un errore durante la verifica. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SmartBackground
      colors={theme.settingPagesGradient}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="/settings/privacy-and-security/twofa-methods" />
      <StatusBar
        style="dark"
        backgroundColor="transparent"
        translucent={false}
        hidden={false}
      />

      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.title}>{getFormattedVerificationType()}</Text>
            <Text style={styles.subtitle}>{getSubtitleText()}</Text>

            <View style={styles.inputWrapper}>
              {secret && otpauth && (
                <>
                  <QRCode
                    value={otpauth}
                    logo={logoForQR}
                    size={180}
                    enableLinearGradient={true}
                    linearGradient={["#013480", "#177FC0"]}
                    logoBorderRadius={100}
                    logoMargin={5}
                    logoBackgroundColor={"black"}
                  />
                  <Text style={styles.subtitle}>{secret}</Text>
                </>
              )}
              <OtpDigitsInput
                value={otp}
                onChange={setOtp}
                error={!!error}
                inputCount={6}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={styles.submitButtonText}>Verifica Codice</Text>
                )}
              </TouchableOpacity>
            </View>

            <StatusMessage type="error" text={error} />
          </View>
        </View>
      </View>
    </SmartBackground>
  );
};

export default VerifyMethod;

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      justifyContent: "center",
    },
    cardWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      width: "100%",
      maxWidth: 500,
      alignSelf: "center",
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 16,
      padding: isSmallScreen ? 16 : 28,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    cardContent: {
      width: "100%",
      alignItems: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtitle || "#b0b0b0",
      textAlign: "center",
      marginBottom: 28,
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    inputWrapper: {
      width: "100%",
      alignItems: "center",
      marginBottom: 16,
    },
    submitButton: {
      marginTop: 18,
      backgroundColor: theme.primary || "#4f8cff",
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 32,
      alignItems: "center",
      width: "100%",
    },
    submitButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
    }
  });
}
