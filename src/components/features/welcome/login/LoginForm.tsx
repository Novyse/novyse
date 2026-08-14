import React, { useState } from "react";
import { View, TextInput, StyleSheet, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { useScreen } from "@/src/context/ScreenContext";
import Icon from "@/src/components/ui/icon/Icon";
import WelcomeButton from "@/src/components/features/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/features/welcome/WelcomeButtonText";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import { router } from "expo-router";

import LinkTypography from "@/src/components/ui/typography/LinkTypography";
import TurnstileCaptcha from "@/src/components/features/welcome/auth/TurnstileCaptcha";

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
          <Typography
            size="hero"
            weight="semibold"
            color={LoginColors[loginTheme].title}
            translationKey="auth.login.title"
          />
          <Typography
            size="sm"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.login.subtitle"
          />
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
              textContentType="username"
              autoComplete="username"
              importantForAutofill="yes"
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
                textContentType="password"
                autoComplete="password"
                importantForAutofill="yes"
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
              <Typography
                size="sm"
                color={LoginColors[loginTheme].subtitle}
                translationKey="auth.login.securedBy"
              />
              <LinkTypography
                size="sm"
                weight="semibold"
                color={LoginColors[loginTheme].title}
                text="OPAQUE"
                href="https://blog.cloudflare.com/it-it/opaque-oblivious-passwords/"
              />
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
              type="danger"
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
            <Typography
              size="sm"
              color={LoginColors[loginTheme].subtitle}
              translationKey="auth.login.dontHaveAccount"
            />
            <LinkTypography
              size="sm"
              weight="semibold"
              color={LoginColors[loginTheme].title}
              onPress={onSignup}
              translationKey="auth.welcome.signup"
            />
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
      padding: isSmallScreen ? 0 : 25,
    },
    card: {
      padding: isSmallScreen ? 15 : 25,
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
      gap: 15,
    },
    textInput: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
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
      gap: 25,
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    opaqueLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 300,
    },
  });
}

export default LoginForm;
