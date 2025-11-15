import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";

import gateway from "@/src/utils/backend-services/api-gateway";
import auth from "@/src/utils/welcome/auth";
import validate from "@/src/utils/welcome/validator";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";

import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import Icon from "@/src/components/Icon";
import logoNovyse from "@/assets/images/logo-novyse.png";

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

  useEffect(() => {
    auth.checkShouldBeHere(router, false);

    const backAction = () => {
      router.navigate("/welcome");
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
    if (!validate.password(password)) {
      setError(validate.requirements.password);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const resetPasswordSuccess = await gateway.auth.resetPassword(
        email,
        token,
        password
      );
      console.log("Reset Password Success?", resetPasswordSuccess);

      if (resetPasswordSuccess) {
        router.replace("/welcome");
      } else {
        console.error("Error", "Password Reset Error");
        setError("Password reset failed. Please try again.");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error(error);
      setError(error.response.data.error || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleBack = () => {
    router.navigate("/welcome");
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
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
          <Image style={styles.logo} source={logoNovyse} />

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
              <Icon
                name={secureTextEntry ? "ViewIcon" : "ViewOffIcon"}
                color={LoginColors[loginTheme].iconShowHideField}
                style={styles.eyeButton}
                onPress={toggleSecureEntry}
              />
            </View>

            <View style={styles.buttonsContainer}>
              <WelcomeButton onPress={handleBack} type={"back"}>
                <WelcomeButtonText type={"back"} />
              </WelcomeButton>
              <WelcomeButton
                onPress={handleResetPassword}
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

export default ResetPassword;

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
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: LoginColors[loginTheme].errorBorder,
      backgroundColor: LoginColors[loginTheme].errorBackground,
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
      height: 40,
      justifyContent: "center",
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
