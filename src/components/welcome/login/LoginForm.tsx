import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { useScreen } from "@/context/ScreenContext";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import MyStatusBar from "@/src/components/MyStatusBar";
import StatusMessage from "@/src/components/StatusMessage";
import { router } from "expo-router";

import logoNovyse from "@/assets/images/logo-novyse.png";
import TextLink from "../../TextLink";

interface LoginFormProps {
  onLogin: (username: string, password: string) => void;
  onLoginWithPasskey: () => void;
  onSignup: () => void;
  isLoading?: boolean;
  error?: string | null;
  onErrorDismiss?: () => void;
}

const LoginForm = ({
  onLogin,
  onLoginWithPasskey,
  onSignup,
  isLoading = false,
  error,
  onErrorDismiss,
}: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const loginTheme: LoginTheme = "default";
  const { isSmallScreen } = useScreen();
  const styles = createStyles(loginTheme, isSmallScreen);

  const handleSubmit = () => {
    onLogin(username, password);
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <MyStatusBar />

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Enter your credentials to login</Text>

          {/* Username */}
          <TextInput
            style={[styles.textInput, error ? styles.inputError : null]}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (error) onErrorDismiss?.();
            }}
            placeholder="Username"
            placeholderTextColor={LoginColors[loginTheme].placeholderTextInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          {/* Password */}
          <View
            style={[styles.passwordContainer, error ? styles.inputError : null]}
          >
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) onErrorDismiss?.();
              }}
              placeholder="Password"
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              secureTextEntry={secureTextEntry}
              autoCapitalize="none"
              editable={!isLoading}
              onSubmitEditing={Platform.OS === "web" ? handleSubmit : undefined}
            />
            <Icon
              name={secureTextEntry ? "ViewIcon" : "ViewOffIcon"}
              color={LoginColors[loginTheme].iconShowHideField}
              style={styles.eyeButton}
              onPress={() => setSecureTextEntry((v) => !v)}
            />
          </View>
          {/* OPAQUE link */}
          <View style={styles.opaqueLink}>
            <Text style={styles.opaqueLinkText}>
              Secured by{" "}
              <TextLink
                style={styles.opaqueLinkTextBold}
                href="https://blog.cloudflare.com/it-it/opaque-oblivious-passwords/"
              >
                OPAQUE
              </TextLink>
            </Text>
          </View>

          {/* Login + Passkey buttons */}
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <WelcomeButton
                onPress={() => {
                  router.canGoBack()
                    ? router.back()
                    : router.navigate("/");
                }}
                disabled={isLoading}
                type={"back"}
              >
                <WelcomeButtonText label="Back" type={"back"} />
              </WelcomeButton>
            </View>
            <View style={styles.buttonWrapper}>
              <WelcomeButton
                onPress={handleSubmit}
                disabled={isLoading}
                type={"submit"}
              >
                <WelcomeButtonText label="Log In" type={"submit"} />
              </WelcomeButton>
            </View>
          </View>

          {/* Status messages */}
          <View style={styles.containerStatus}>
            <StatusMessage
              type="error"
              content={[error]}
              visible={!!error}
              onClose={onErrorDismiss}
            />
          </View>

          {/* Passkey link */}
          <View style={styles.link}>
            <Text style={styles.linkText}>
              Use passkey instead?{" "}
              <TextLink style={styles.linkTextBold} onPress={onSignup}>
                Login with passkey
              </TextLink>
            </Text>
          </View>

          {/* Signup link */}
          <View style={styles.link}>
            <Text style={styles.linkText}>
              Don't have an account?{" "}
              <TextLink style={styles.linkTextBold} onPress={onSignup}>
                Sign up
              </TextLink>
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

function createStyles(loginTheme: LoginTheme, isSmallScreen: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 16 : 24,
      borderRadius: isSmallScreen ? 0 : 25,
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
      alignItems: "center",
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
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    textInput: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
      marginBottom: 12,
      fontSize: 16,
      width: "100%",
      maxWidth: 300,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none" as any,
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      height: 45,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      maxWidth: 300,
      borderRadius: 25,
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      overflow: "hidden",
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 15,
      fontSize: 16,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none" as any,
      overflow: "hidden",
    },
    inputError: {
      borderColor: LoginColors[loginTheme].errorBorder,
      backgroundColor: LoginColors[loginTheme].errorBackground,
    },
    eyeButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      width: "100%",
      maxWidth: 300,
    },
    buttonWrapper: {
      flex: 1,
    },
    containerStatus: {
      alignSelf: "center",
      width: 300,
      alignItems: "center",
    },
    link: {
      marginTop: 20,
      alignItems: "center",
    },
    opaqueLink: {
      marginBottom: 20,
      marginTop: 5,
      flexDirection: "row",
    },
    linkText: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
    },
    opaqueLinkText: {
      fontSize: 11,
      color: LoginColors[loginTheme].subtitle2,
    },
    linkTextBold: {
      color: LoginColors[loginTheme].title,
      fontWeight: "600",
      fontSize: 14,
    },
    opaqueLinkTextBold: {
      color: LoginColors[loginTheme].title,
      fontWeight: "600",
      fontSize: 11,
    },
  });
}

export default LoginForm;
