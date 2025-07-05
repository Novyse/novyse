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
  // Rimosse: NativeSyntheticEvent, TextInputKeyPressEventData
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import APIMethods from "../utils/APImethods";
import { clearDBAddTokenInit } from "../utils/welcome/auth";

const Verify = ({}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const loginTheme = "default";
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpTextInputRefs = useRef([]);

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

  const handleOtpChange = (text, index) => {
    // Rimosse le annotazioni di tipo
    // Rimuove qualsiasi carattere che non sia una cifra
    const numericText = text.replace(/[^0-9]/g, "");

    const newOtp = [...otp];

    if (numericText.length === 1) {
      newOtp[index] = numericText;
      setOtp(newOtp);
      setError(null);
      // Sposta il focus al campo successivo
      if (index < otp.length - 1) {
        otpTextInputRefs.current[index + 1]?.focus();
      }
    } else if (numericText.length > 1) {
      // Se l'utente incolla più cifre, distribuiscile
      for (let i = 0; i < numericText.length && index + i < otp.length; i++) {
        newOtp[index + i] = numericText.charAt(i);
      }
      setOtp(newOtp);
      setError(null);
      // Sposta il focus all'ultimo campo riempito o all'ultimo in generale
      const lastFilledIndex = Math.min(
        index + numericText.length - 1,
        otp.length - 1
      );
      otpTextInputRefs.current[lastFilledIndex]?.focus();
    } else {
      // Se il campo viene svuotato (anche con backspace), resetta il suo valore a stringa vuota
      newOtp[index] = "";
      setOtp(newOtp);
      setError(null);
    }
  };

  const handleKeyPress = (e, index) => {
    // Rimosse le annotazioni di tipo
    // Gestione tasto Backspace
    if (e.nativeEvent.key === "Backspace") {
      // Se il campo corrente è vuoto e non siamo il primo campo, sposta il focus indietro e cancella il campo precedente
      if (otp[index] === "" && index > 0) {
        otpTextInputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = ""; // Cancella il carattere precedente
        setOtp(newOtp);
      }
    }
    // Gestione tasto freccia destra
    else if (e.nativeEvent.key === "ArrowRight") {
      if (index < otp.length - 1) {
        otpTextInputRefs.current[index + 1]?.focus();
      }
    }
    // Gestione tasto freccia sinistra
    else if (e.nativeEvent.key === "ArrowLeft") {
      if (index > 0) {
        otpTextInputRefs.current[index - 1]?.focus();
      }
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
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={[styles.otpInput, error ? styles.inputError : null]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  ref={(el) => (otpTextInputRefs.current[index] = el)}
                  onSubmitEditing={
                    index === otp.length - 1 ? handleVerifyOtp : undefined
                  }
                  caretHidden={false}
                />
              ))}
            </View>

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

          {error && <Text style={styles.errorText}>{error}</Text>}
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
    inputError: {
      borderColor: "rgba(255, 99, 99, 0.8)",
      backgroundColor: "rgba(255, 99, 99, 0.1)",
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
    errorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 14,
      marginTop: 24,
      textAlign: "center",
      paddingHorizontal: 8,
    },
  });
}
