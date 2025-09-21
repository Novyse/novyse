import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Pressable,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";

import { clearDBAddTokenInit } from "../utils/welcome/auth";
import gateway from "../utils/backend-services/api-gateway";
import StatusMessage from "../components/StatusMessage";
import Icon from "../components/Icon";

const LoginPassword = () => {
  const router = useRouter();
  const { emailValue } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const loginTheme = "default";

  // Ottieni la larghezza dello schermo e definisci il breakpoint
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;

  // Passa la variabile isSmallScreen per creare stili dinamici
  const styles = createStyle(loginTheme, isSmallScreen);

  useEffect(() => {
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn == "true") {
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

  const handleLogin = async () => {
    if (!password) {
      setError("Password cannot be empty");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const {
        success,
        twofa,
        choose,
        methods,
        twoFactorToken,
        chooseTwoFactorToken,
        expiresIn,
      } = await gateway.auth.login(emailValue, password);

      if (!success) {
        console.log("Error", "Incorrect password.");
        setError("Incorrect Password");
        setIsLoading(false);
        return;
      } else {
        if (!twofa) {
          console.log("Login successful without 2FA");
          const success = await clearDBAddTokenInit();

          if (success) {
            router.replace("/messages");
          } else {
            console.error("Error clearing DB, adding token or during init");
          }
        } else {
          console.log("Login successful, 2FA required");
          if (choose) {
            router.navigate({
              pathname: "/welcome/choose-verify",
              params: {
                verificationTypeList: methods,
                token: chooseTwoFactorToken,
              },
            });
          } else {
            router.navigate({
              pathname: "/welcome/verify",
              params: {
                verificationType: methods[0],
                token: twoFactorToken,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      setError("Incorrect Password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      const resetPassword = await gateway.auth.requestPasswordReset(emailValue);
      console.log("Password forgot Success?", resetPassword);

      if (resetPassword) {
        setSuccessMessage(
          "If the email exists, you will receive instructions to reset your password."
        );
      } else {
        setError("Unable to send reset instructions.");
      }
    } catch (error) {
      console.error(error);
      setError("Error");
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleBack = () => {
    router.navigate("/welcome/email-check");
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

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            style={styles.logo}
            source={require("../../assets/images/logo-novyse.png")}
          />

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Enter your password to login</Text>

          <View style={styles.inputWrapper}>
            {/* Password Input */}
            <View
              style={[
                styles.passwordInputContainer,
                error ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                placeholder="Password"
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                secureTextEntry={secureTextEntry}
                onSubmitEditing={
                  Platform.OS === "web" ? handleLogin : undefined
                }
              />
              <Icon
                name={secureTextEntry ? "ViewIcon" : "ViewOffIcon"}
                color={LoginColors[loginTheme].iconColor || "rgba(0,0,0,0.6)"}
                style={styles.eyeButton}
                onPress={toggleSecureEntry}
              />
            </View>

            {/* Container per i pulsanti Back e Login */}
            <View style={styles.buttonContainer}>
              {/* Pulsante Back */}
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>

              {/* Pulsante Login */}
              <Pressable
                style={styles.submitButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Login</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Sostituisci i vecchi messaggi di error e success con il nuovo componente */}
          <StatusMessage type="error" text={error} />
          <StatusMessage type="success" text={successMessage} />

          <Text style={styles.resetPasswordText} onPress={handleResetPassword}>
            Reset Password
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

export default LoginPassword;

// Funzione per creare stili dinamici
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
      // height: isSmallScreen ? 600 : 400,
      justifyContent: isSmallScreen ? "" : "center",
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
    passwordInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      maxWidth: 300,
      marginBottom: 16,
      borderRadius: 6,
      backgroundColor: "white",
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: "rgba(255, 99, 99, 0.8)",
      backgroundColor: "rgba(255, 99, 99, 0.1)",
    },
    textInput: {
      flex: 1,
      padding: 10,
      fontSize: 16,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none",
    },
    eyeButton: {
      width: 40,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
    },
    backButton: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      backgroundColor:
        LoginColors[loginTheme].backgroundBackButton || "#b8b8b8ff",
      marginRight: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonText: {
      fontSize: 16,
      color: LoginColors[loginTheme].backButtonTextColor || "#000",
      fontWeight: "500",
    },
    submitButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    submitButtonText: {
      fontSize: 16,
      color: "white",
      fontWeight: "500",
    },
    resetPasswordText: {
      fontSize: 14,
      marginTop: 24,
      textAlign: "center",
      paddingHorizontal: 8,
      color: LoginColors[loginTheme].link,
      textDecorationLine: "underline",
    },
  });
}
