import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "@/app/utils/APImethods";
import OtpDigitsInput from "@/app/components/OtpDigitsInput";
import ScreenLayout from "@/app/components/ScreenLayout";
import HeaderWithBackArrow from "@/app/components/HeaderWithBackArrow";
import QRCode from "react-native-qrcode-svg";
import StatusMessage from "@/app/components/StatusMessage";
import * as Clipboard from "expo-clipboard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Copy01Icon, Tick01Icon } from "@hugeicons/core-free-icons";

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
        logoBackgroundColor={"black"}
      />
    </View>
    <View style={styles.secretKeyContainer}>
      <Text style={styles.secretText} numberOfLines={1} ellipsizeMode="middle">
        {secret}
      </Text>
      <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
        {copied ? (
          <HugeiconsIcon
            icon={Tick01Icon}
            size={24}
            color={"green"}
            strokeWidth={1.5}
          />
        ) : (
          <HugeiconsIcon
            icon={Copy01Icon}
            size={24}
            color={"white"}
            strokeWidth={1.5}
          />
        )}
      </TouchableOpacity>
    </View>
  </View>
);

// --- Componente Principale ---

const VerifyMethod = () => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { width } = useWindowDimensions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [copied, setCopied] = useState(false);

  const { token, verificationType, secret, otpauth } = useLocalSearchParams();

  const isSmallScreen = width < 768;
  const styles = createStyle(theme, isSmallScreen);
  const logoForQR = require("../../../assets/images/logo-novyse-nobg-less-margin.png");

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome/emailcheck");
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
      const data = await APIMethods.twoFactorsAuth(
        verificationType,
        token,
        fullOtp
      );
      if (data.authenticated) {
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
      <HeaderWithBackArrow goBackTo="/settings/privacy-and-security/twofa-methods" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
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
                <TouchableOpacity
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
                      color={theme.textInverted || "#FFFFFF"}
                    />
                  ) : (
                    <Text style={styles.submitButtonText}>Verifica Codice</Text>
                  )}
                </TouchableOpacity>
              </View>

              <StatusMessage type="error" text={error} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default VerifyMethod;

// --- Funzione per gli stili ---

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    card: {
      width: "100%",
      maxWidth: 500,
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 16,
      padding: isSmallScreen ? 24 : 32,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
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
      color: theme.subtitle || "#b0b0b0",
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
      borderColor: theme.primary || "#013480",
    },
    qrcode: {
      size: 180,
    },
    secretKeyContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: theme.background || "#1a1a1a",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border || "#333",
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
      borderLeftColor: theme.border || "#333",
    },
    copyButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.subtitle,
    },
    copyButtonTextSuccess: {
      color: "#28a745", // Verde per indicare successo
    },
    submitButton: {
      backgroundColor: theme.primary || "#4f8cff",
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
      color: theme.textInverted || "#fff",
      fontWeight: "600",
      fontSize: 16,
    },
  });
}
