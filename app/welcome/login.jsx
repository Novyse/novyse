import React, { useEffect, useState, useContext } from "react";
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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import JsonParser from "../utils/JsonParser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";

import { clearDBAddTokenInit } from "../utils/welcome/auth";
import APIMethods from "../utils/APImethods";

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
      router.navigate("/welcome/emailcheck");
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
      const loginData = await APIMethods.loginAPI(emailValue, password);
      const token = loginData.token;
      if (!loginData.logged_in) {
        console.log("Error", "Incorrect password.");
        setError("Incorrect Password");
        setIsLoading(false);
        return;
      } else {
        const twofamethods = loginData.two_fa_methods;
        if (twofamethods.length == 0) {
          const success = await clearDBAddTokenInit(token);

          if (success) {
            router.replace("/messages");
          } else {
            console.error("Error clearing DB, adding token or during init");
          }
        } else if (twofamethods.length == 1) {
          router.navigate({
            pathname: "/welcome/verify",
            params: {
              verificationType: twofamethods[0],
              token: token,
            },
          });
        } else {
          router.navigate({
            pathname: "/welcome/choose-verify",
            params: {
              verificationTypeList: twofamethods,
              token: token,
            },
          });
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
      
      const resetPassword = await APIMethods.forgotPassword(emailValue);
      console.log("Password forgot Success?", resetPassword);

      if (resetPassword) {
        setSuccessMessage("If the email exists, you will receive instructions to reset your password.");
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
            source={require("../../assets/images/logo-novyse-nobg-less-margin.png")}
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

              {/* Eye Icon */}
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={toggleSecureEntry}
              >
                <HugeiconsIcon
                  icon={secureTextEntry ? ViewOffIcon : ViewIcon}
                  size={20}
                  color={LoginColors[loginTheme].iconColor || "rgba(0,0,0,0.6)"}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

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
    successText: {
      color: "rgba(26, 139, 18, 0.9)",
      fontSize: 14,
      marginTop: 24,
      textAlign: "center",
      paddingHorizontal: 8,
      backgroundColor: "rgba(75, 181, 67, 0.1)",
      padding: 12,
      borderRadius: 6,
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
