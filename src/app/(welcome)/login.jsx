import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  BackHandler,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import {
  KeyboardAvoidingView,
  KeyboardController,
} from "react-native-keyboard-controller";

import { useScreen } from "@/context/ScreenContext";
import { useAuth } from "@/context/AuthContext";

import auth from "@/src/utils/welcome/auth";
import gateway from "@/src/utils/backend-services/api-gateway";
import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import MyStatusBar from "@/src/components/MyStatusBar";

import { validate } from "@/src/utils/welcome/validator";

import logoNovyse from "@/assets/images/logo-novyse.png";

const LoginPassword = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const loginTheme = "default";

  const { isSmallScreen } = useScreen();
  const { refreshLoginStatus } = useAuth();

  const styles = createStyle(loginTheme, isSmallScreen);

  useEffect(() => {
    const backAction = () => {
      router.navigate("/");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (!validate.user.email(email)) {
      setTimeout(() => router.navigate("/"), 0);
    }
  }, [email]);

  const handleLogin = async () => {
    await KeyboardController.dismiss();

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
      } = await gateway.auth.login(email, password);

      if (!success) {
        console.log("Error", "Incorrect password.");
        setError("Incorrect Password");
        setIsLoading(false);
        return;
      } else {
        if (!twofa) {
          if (await auth.initializeApp()) {
            await refreshLoginStatus();
            router.replace("/app");
          }
        } else {
          console.log("Login successful, 2FA required");
          if (choose) {
            router.navigate({
              pathname: "/choose-verify",
              params: {
                verificationTypeList: methods,
                token: chooseTwoFactorToken,
              },
            });
          } else {
            router.navigate({
              pathname: "/verify",
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

      const resetPassword = await gateway.auth.requestPasswordReset(email);
      console.log("Password forgot Success?", resetPassword);

      if (resetPassword) {
        setSuccessMessage(
          "If the email exists, you will receive instructions to reset your password.",
        );
      } else {
        setError("Unable to send reset instructions.");
      }
    } catch (error) {
      console.error(error);
      setError("An error occurred while requesting password reset.");
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleBack = () => {
    router.navigate("/");
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <MyStatusBar />
      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Enter your password to login</Text>
          <KeyboardAvoidingView
            behavior={"position"}
            keyboardVerticalOffset={170}
          >
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
                  color={LoginColors[loginTheme].iconShowHideField}
                  style={styles.eyeButton}
                  onPress={toggleSecureEntry}
                />
              </View>
              {/* Container per i pulsanti Back e Login */}
              <View style={styles.buttonContainer}>
                <WelcomeButton
                  type={"back"}
                  onPress={handleBack}
                  disabled={isLoading}
                >
                  <WelcomeButtonText type={"back"} />
                </WelcomeButton>
                <WelcomeButton
                  type={"submit"}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <WelcomeButtonText type={"submit"} />
                </WelcomeButton>
              </View>
            </View>
          </KeyboardAvoidingView>

          <Text style={styles.resetPasswordText} onPress={handleResetPassword}>
            Reset Password
          </Text>

          <View style={styles.containerStatus}>
            <StatusMessage
              type="error"
              content={[error]}
              visible={!!error}
              onClose={() => {
                setError(null);
              }}
            />
            <StatusMessage
              type="success"
              content={[successMessage]}
              visible={!!successMessage}
              onClose={() => {
                setSuccessMessage(null);
              }}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default LoginPassword;

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
    containerStatus: {
      alignSelf: "center",
      width: 300,
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
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
    },
    resetPasswordText: {
      fontSize: 14,
      marginTop: 24,
      alignSelf: "center",
      color: LoginColors[loginTheme].link,
      textDecorationLine: "underline",
    },
  });
}
