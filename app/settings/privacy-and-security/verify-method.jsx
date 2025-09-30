import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Pressable,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import gateway from "@/app/utils/backend-services/api-gateway";
import OtpDigitsInput from "@/app/components/OtpDigitsInput";
import ScreenLayout from "@/app/components/ScreenLayout";
import HeaderWithBackArrow from "@/app/components/HeaderWithBackArrow";
import QRCode from "react-native-qrcode-svg";
import StatusMessage from "@/app/components/StatusMessage";
import * as Clipboard from "expo-clipboard";
import Icon from "@/app/components/Icon";
import SettingsPageScrollview from "@/app/components/settings/SettingsPageScrollview";
import SettingsCard from "@/app/components/settings/SettingsCard";

const AuthenticatorSection = ({
  secret,
  otpauth,
  styles,
  logoForQR,
  onCopy,
  copied,
}) => (
  <View style={styles.authenticatorInfoContainer}>
    <View style={styles.qrcodeContainer}>
      <QRCode
        value={otpauth}
        logo={logoForQR}
        size={styles.qrcode.size}
        enableLinearGradient={true}
        linearGradient={["#013480", "#177FC0"]}
        logoBorderRadius={100}
        logoMargin={5}
        logoBackgroundColor={"#fff"}
      />
    </View>
    <View style={styles.secretKeyContainer}>
      <Text style={styles.secretText} numberOfLines={1} ellipsizeMode="middle">
        {secret}
      </Text>
      <Icon
        name={copied ? "Tick01Icon" : "Copy01Icon"}
        style={styles.copyButton}
        onPress={onCopy}
      />
    </View>
  </View>
);

const VerifyMethod = () => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { width } = useWindowDimensions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [copied, setCopied] = useState(false);

  const params = useLocalSearchParams();
  const { token, verificationType, secret } = params;
  const otpauth = params.otpauth
    ? decodeURIComponent(params.otpauth)
    : params.otpauth;

  const isSmallScreen = width < 768;
  const styles = createStyle(theme, isSmallScreen);
  const logoForQR = require("../../../assets/images/logo-novyse.png");

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome/email-check");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [router]);

  const getFormattedVerificationType = () => {
    switch (verificationType) {
      case "email":
        return "Email OTP";
      case "email_verification":
        return "Verifica Email";
      case "authenticator":
        return "Authenticator App";
      default:
        return "Verifica Codice";
    }
  };

  const getSubtitleText = () => {
    switch (verificationType) {
      case "email":
      case "email_verification":
        return "Inserisci il codice che hai ricevuto nella tua email.";
      case "authenticator":
        return "Scansiona il QR o inserisci il codice manualmente nella tua app di autenticazione, quindi inserisci il codice generato.";
      default:
        return "Inserisci il codice di verifica.";
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6 || !/^\d+$/.test(fullOtp)) {
      setError("Inserisci un codice valido di 6 cifre.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const verified = await gateway.auth.verifyTwofaCode(token, fullOtp);
      if (verified) {
        router.replace("/settings/privacy-and-security/twofa-methods");
      } else {
        setError("Codice OTP non valido. Riprova.");
      }
    } catch (apiError) {
      setError("Si è verificato un errore durante la verifica. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (secret) {
      await Clipboard.setStringAsync(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScreenLayout>
      <StatusBar style="dark" />
      <HeaderWithBackArrow goBackTo="../" />
      <SettingsPageScrollview>
        <KeyboardAvoidingView behavior={"position"}>
          <SettingsCard>
            <View style={styles.cardContent}>
              <Text style={styles.title}>{getFormattedVerificationType()}</Text>
              <Text style={styles.subtitle}>{getSubtitleText()}</Text>

              {verificationType === "authenticator" && secret && otpauth && (
                <AuthenticatorSection
                  secret={secret}
                  otpauth={otpauth}
                  styles={styles}
                  logoForQR={logoForQR}
                  onCopy={copyToClipboard}
                  copied={copied}
                />
              )}

              <View style={styles.inputSection}>
                <OtpDigitsInput
                  value={otp}
                  onChange={setOtp}
                  error={!!error}
                  inputCount={6}
                />
                <Pressable
                  style={[
                    styles.submitButton,
                    isLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.textInverted}
                    />
                  ) : (
                    <Text style={styles.submitButtonText}>Verifica Codice</Text>
                  )}
                </Pressable>
              </View>

              <StatusMessage type="error" text={error} />
            </View>
          </SettingsCard>
        </KeyboardAvoidingView>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

export default VerifyMethod;

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    cardContent: {
      alignItems: "center",
      gap: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtitle,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    inputSection: {
      width: "100%",
      alignItems: "center",
      gap: 24,
    },
    authenticatorInfoContainer: {
      width: "100%",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    qrcodeContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      backgroundColor: "#ffffff",
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    qrcode: {
      size: 180,
    },
    secretKeyContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingLeft: 16,
    },
    secretText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      marginRight: 8,
    },
    copyButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
    },
    copyButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.subtitle,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      width: "100%",
      justifyContent: "center",
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: theme.textInverted,
      fontWeight: "600",
      fontSize: 16,
    },
  });
}
