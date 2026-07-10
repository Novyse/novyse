import React, { useState } from "react";
import { View, TextInput, StyleSheet, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import AppText from "@/src/components/AppText";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { useScreen } from "@/src/context/ScreenContext";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import StatusMessage from "@/src/components/StatusMessage";
import { router } from "expo-router";

import TextLink from "../../TextLink";
import TurnstileCaptcha from "../../auth/TurnstileCaptcha";

interface LoginFormProps {
  onLogin: (username: string, password: string, captchaToken: string) => void;

  onSignup: () => void;
  isLoading?: boolean;
  error?: string | null;
  onErrorDismiss?: () => void;
  urlUsername?: string;
  urlSignedup?: boolean;
}

const LoginForm = ({
  onLogin,
  onSignup,
  isLoading = false,
  error,
  onErrorDismiss,
  urlUsername,
  urlSignedup,
}: LoginFormProps) => {
  const { t } = useTranslation();

  const [username, setUsername] = useState((urlUsername || "").toLowerCase());
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [signedup, setSignedup] = useState(urlSignedup);

  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const loginTheme: LoginTheme = "default";
  const { isSmallScreen } = useScreen();
  const styles = createStyles(loginTheme, isSmallScreen);

  const handleSubmit = () => {
    onLogin(username, password, captchaToken!);
    setCaptchaToken(null);
    setCaptchaKey((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* <Image style={styles.logo} source={logoNovyse} /> */}
          <AppText style={styles.title} translationKey="auth.login.title" />
          <AppText
            style={styles.subtitle}
            translationKey="auth.login.subtitle"
          />
          <View style={{ width: 300 }}></View>
          <>
            {/* Username */}
            <TextInput
              style={[styles.textInput, error ? styles.inputError : null]}
              value={username}
              onChangeText={(text) => {
                const lowerText = text.toLowerCase();
                setUsername(lowerText);
                if (error) onErrorDismiss?.();
              }}
              placeholder={t("auth.signupStep.usernamePlaceholder")}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            {/* Password */}
            <View
              style={[
                styles.passwordContainer,
                error ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) onErrorDismiss?.();
                }}
                placeholder={t("auth.signupStep.password")}
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
                editable={!isLoading}
                onSubmitEditing={
                  Platform.OS === "web" ? handleSubmit : undefined
                }
              />
              <Icon
                name={secureTextEntry ? "ViewIcon" : "ViewOffIcon"}
                color={LoginColors[loginTheme].iconShowHideField}
                style={styles.eyeButton}
                onPress={() => setSecureTextEntry((v) => !v)}
              />
            </View>

            <View style={styles.opaqueLink}>
              <AppText
                style={styles.opaqueLinkText}
                translationKey="auth.login.securedBy"
              />
              <TextLink
                style={styles.opaqueLinkTextBold}
                href="https://blog.cloudflare.com/it-it/opaque-oblivious-passwords/"
              >
                OPAQUE
              </TextLink>
            </View>

            <TurnstileCaptcha key={captchaKey} onVerify={setCaptchaToken} />

            <View style={styles.buttonRow}>
              <View style={styles.buttonWrapper}>
                <WelcomeButton
                  onPress={() => {
                    router.canGoBack() ? router.back() : router.navigate("/");
                  }}
                  disabled={isLoading}
                  type={"back"}
                >
                  <WelcomeButtonText
                    translationKey="auth.login.back"
                    type={"back"}
                  />
                </WelcomeButton>
              </View>
              <View style={styles.buttonWrapper}>
                <WelcomeButton
                  onPress={handleSubmit}
                  disabled={
                    isLoading || !username || !password || !captchaToken
                  }
                  type={"submit"}
                >
                  <WelcomeButtonText
                    translationKey="auth.welcome.login"
                    type={"submit"}
                  />
                </WelcomeButton>
              </View>
            </View>
          </>
          {/* Status messages */}
          <View style={styles.containerStatus}>
            <StatusMessage
              type="error"
              content={[error as string]}
              visible={!!error}
              onClose={onErrorDismiss}
            />
            <StatusMessage
              type="success"
              translationKey={"auth.signupStep.signupSuccessPassword"}
              visible={signedup}
              timeout={5000}
              onClose={() => {
                setSignedup(false);
              }}
            />
          </View>
          {/* Signup link */}
          <View style={styles.link}>
            <AppText style={styles.linkText}>
              <AppText translationKey="auth.login.dontHaveAccount" />
              <TextLink style={styles.linkTextBold} onPress={onSignup}>
                <AppText translationKey="auth.welcome.signup" />
              </TextLink>
            </AppText>
          </View>
        </View>
      </View>
    </View>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 300,
      marginBottom: 20,
      marginTop: 5,
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
