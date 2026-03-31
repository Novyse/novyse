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
import TurnstileCaptcha from "../../auth/TurnstileCaptcha";
import ToggleSelector, { ToggleOption } from "@/src/components/ToggleSelector";

interface LoginFormProps {
  onLogin: (username: string, password: string, captchaToken: string) => void;
  onLoginWithPasskey: (captchaToken: string) => void;
  onSignup: () => void;
  isLoading?: boolean;
  error?: string | null;
  onErrorDismiss?: () => void;
  urlUsername?: string;
  urlSignedup?: boolean;
  urlType?: "opaque" | "passkey";
}

const LOGIN_MODE_OPTIONS: ToggleOption<"password" | "passkey">[] = [
  { value: "password", label: "Password" },
  { value: "passkey", label: "Passkey" },
];

const LoginForm = ({
  onLogin,
  onLoginWithPasskey,
  onSignup,
  isLoading = false,
  error,
  onErrorDismiss,
  urlUsername,
  urlSignedup,
  urlType,
}: LoginFormProps) => {
  const [loginMode, setLoginMode] = useState<"password" | "passkey">(
    urlType === "passkey" ? "passkey" : "password",
  );
  const [username, setUsername] = useState(urlUsername || "");
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
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <MyStatusBar />

      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* <Image style={styles.logo} source={logoNovyse} /> */}
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Enter your credentials to login</Text>

          <View style={{width: 300}}>
            {/* Mode Toggle */}
            <ToggleSelector
              options={LOGIN_MODE_OPTIONS}
              value={loginMode}
              onChange={setLoginMode}
              disabled={isLoading}
            />
          </View>

          {loginMode === "password" ? (
            <>
              {/* Username */}
              <TextInput
                style={[styles.textInput, error ? styles.inputError : null]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (error) onErrorDismiss?.();
                }}
                placeholder="Username"
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
                  placeholder="Password"
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
                <Text style={styles.opaqueLinkText}>Secured by </Text>
                <TextLink
                  style={styles.opaqueLinkTextBold}
                  href="https://blog.cloudflare.com/it-it/opaque-oblivious-passwords/"
                >
                  OPAQUE
                </TextLink>
              </View>

              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <WelcomeButton
                    onPress={() => {
                      router.canGoBack() ? router.back() : router.navigate("/");
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
                    disabled={
                      isLoading || !username || !password || !captchaToken
                    }
                    type={"submit"}
                  >
                    <WelcomeButtonText label="Log In" type={"submit"} />
                  </WelcomeButton>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.passkeyModeContent}>
              <Text style={styles.passkeyDescription}>
                Log in quickly and securely using your biometric data or device
                credentials.
              </Text>

              <View style={styles.passkeyButtonWrapperLarge}>
                <WelcomeButton
                  onPress={() => {
                    onLoginWithPasskey(captchaToken!);
                    setCaptchaToken(null);
                    setCaptchaKey((prev) => prev + 1);
                  }}
                  disabled={isLoading || !captchaToken}
                  type={"submit"}
                >
                  <View style={styles.passkeyButtonContent}>
                    <Icon
                      name="FingerPrintIcon"
                      color={LoginColors[loginTheme].icon}
                      
                    />
                    <WelcomeButtonText
                      label="Login with Passkey"
                      type={"submit"}
                    />
                  </View>
                </WelcomeButton>
              </View>

              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <WelcomeButton
                    onPress={() => {
                      router.canGoBack() ? router.back() : router.navigate("/");
                    }}
                    disabled={isLoading}
                    type={"back"}
                  >
                    <WelcomeButtonText label="Back" type={"back"} />
                  </WelcomeButton>
                </View>
              </View>
            </View>
          )}

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
              content={[
                urlType === "passkey"
                  ? "Signup successful! Log in using your passkey."
                  : "Signup successful! Please log in using your credentials.",
              ]}
              visible={signedup}
              timeout={5000}
              onClose={() => {
                setSignedup(false);
              }}
            />
          </View>

          <TurnstileCaptcha key={captchaKey} onVerify={setCaptchaToken} />

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
      marginTop: 20,
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
    passkeyModeContent: {
      width: "100%",
      maxWidth: 300,
      alignItems: "center",
      paddingTop: 10,
    },
    passkeyDescription: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle2,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 20,
    },
    passkeyButtonWrapperLarge: {
      width: "100%",
      alignItems: "center",
      marginBottom: 10,
    },
    passkeyButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
  });
}

export default LoginForm;
