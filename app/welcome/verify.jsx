import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import APIMethods from "../utils/APImethods";
import { clearDBAddTokenInit } from "../utils/welcome/auth";
import OtpDigitsInput from "../components/OtpDigitsInput";
import StatusMessage from '../components/StatusMessage';

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
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn === "true") {
        router.navigate("/messages");
      } else {
        console.log("Utente non loggato");
      }
    };
    checkLogged().then(() => {
      console.log("CheckLogged completed");
    });

    const backAction = () => {
      router.navigate("/welcome/email-check");
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

      const data = await APIMethods.twoFactorsAuth(
        verificationType,
        token,
        fullOtp
      );
      const otpVerificationSuccess = data.authenticated;

      if (otpVerificationSuccess) {
        console.log("OTP verificato con successo!");
        const token = data.token;
        const success = await clearDBAddTokenInit(token);
        if (success) {
          router.replace("/messages");
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

  return (
    <LinearGradient
      colors={
        isSmallScreen
          ? ["transparent", "transparent"]
          : LoginColors[loginTheme].background
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        style="dark"
        backgroundColor={LoginColors[loginTheme].backgroundCard}
        translucent={false}
        hidden={false}
      />

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            style={styles.logo}
            source={require("../../assets/images/logo-novyse-nobg-less-margin.png")}
          />

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

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleVerifyOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Verifica Codice</Text>
              )}
            </TouchableOpacity>
          </View>

          <StatusMessage 
            type="error" 
            text={error} 
          />
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
    otpContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
      marginBottom: 20,
    },
    otpInput: {
      width: 40,
      height: 50,
      borderWidth: 1.5,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderRadius: 6,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "bold",
      color: LoginColors[loginTheme].text,
      backgroundColor: "white",
      outlineStyle: "none",
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      maxWidth: 300,
      width: "100%",
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    submitButtonText: {
      fontSize: 16,
      color: "white",
      fontWeight: "500",
    },
  });
}
