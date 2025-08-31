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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import APIMethods from "../utils/APImethods";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import StatusMessage from "../components/StatusMessage";

const ResetPassword = () => {
  const router = useRouter();
  const { email, token } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const loginTheme = "default";
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[^\s]{8,128}$/;
  const isPasswordValid = (pwd) => passwordRegex.test(pwd);

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

  const handleResetPassword = async () => {
    if (!password) {
      setError("Password cannot be empty");
      return;
    }
    if (!isPasswordValid(password)) {
      setError(
        "Password must be 8-128 chars, include upper/lowercase, a number and a special character (@, $, !, %, *, ?, &)"
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const resetPasswordSuccess = await APIMethods.resetPassword(
        email,
        token,
        password
      );
      console.log("Reset Password Success?", resetPasswordSuccess);

      if (!resetPasswordSuccess) {
        console.log("Error", "Password Reset Error");
        setError("Error");
        setIsLoading(false);
        return;
      } else {
        if (resetPasswordSuccess) {
          router.replace("/welcome/email-check");
        } else {
          console.error("Error");
        }
      }
    } catch (error) {
      console.error(error);
      setError("Error");
    } finally {
      setIsLoading(false);
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

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password</Text>

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
                placeholder="New Password"
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                secureTextEntry={secureTextEntry}
                onSubmitEditing={
                  Platform.OS === "web" ? handleResetPassword : undefined
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
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>

          <StatusMessage type="error" text={error} />
        </View>
      </View>
    </LinearGradient>
  );
};

export default ResetPassword;

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
  });
}
