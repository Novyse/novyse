import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";

import { useScreen } from "@/context/ScreenContext";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors, ThemeColors } from "@/constants/LoginColors";
import gateway from "@/src/utils/backend-services/api-gateway";
import auth from "@/src/utils/welcome/auth";
import OtpDigitsInput from "@/src/components/OtpDigitsInput";
import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
// import logoNovyse from "@/assets/images/logo-novyse.png";

type VerificationType = "email" | "email_verification" | "authenticator";

type SearchParams = {
  token: string;
  verificationType: VerificationType;
};

const Verify: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const loginTheme = "default" as const;
  const { isSmallScreen } = useScreen();
  const { refreshLoginStatus } = useAuth();
  const styles = createStyle(loginTheme, isSmallScreen);

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);

  const { token, verificationType } = useLocalSearchParams<SearchParams>();

  useEffect(() => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 6 && /^\d+$/.test(fullOtp) && !isLoading) {
      handleVerifyOtp();
    }
  }, [otp]);

  const getFormattedVerificationType = (): string => {
    if (!verificationType) return "Verify Code";

    switch (verificationType) {
      case "email":
        return "Email OTP";
      case "email_verification":
        return "Verify Email";
      case "authenticator":
        return "Authenticator App";
      default:
        return "Verify Code";
    }
  };

  const handleVerifyOtp = async (): Promise<void> => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6 || !/^\d+$/.test(fullOtp)) {
      setError("Enter a valid code");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("Verifying OTP:", fullOtp);
      console.log("Token:", token);

      const otpVerificationSuccess = await gateway.auth.verifyTwofaCode(
        token,
        fullOtp,
      );

      if (otpVerificationSuccess) {
        console.log("OTP verificato con successo!");
        const success = await auth.initializeApp();
        if (success) {
          await refreshLoginStatus();
          router.replace("/app");
        }
      } else {
        console.log("Errore nella verifica OTP");
        setError("Codice OTP non valido. Riprova.");
      }
    } catch (apiError) {
      console.error("Errore durante la verifica OTP:", apiError);
      setError("Si è verificato un errore durante la verifica. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = (): void => {
    router.navigate("/login");
  };

  return (
    <LinearGradient
      colors={(LoginColors[loginTheme] as ThemeColors).background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* <Image style={styles.logo} source={logoNovyse} /> */}

          <Text style={styles.title}>{getFormattedVerificationType()}</Text>
          <Text style={styles.subtitle}>
            Enter the code you received in your email.
          </Text>

          <View style={styles.inputWrapper}>
            <OtpDigitsInput
              value={otp}
              onChange={setOtp}
              error={!!error}
              inputCount={6}
            />

            <View style={styles.buttonsContainer}>
              <View style={styles.buttonWrapper}>
                <WelcomeButton onPress={handleBack} type="back">
                  <WelcomeButtonText type="back" label="Back" />
                </WelcomeButton>
              </View>
              <View style={styles.buttonWrapper}>
                <WelcomeButton
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={LoginColors[loginTheme].iconLoading}
                    />
                  ) : (
                    <WelcomeButtonText type="submit" label="Verify" />
                  )}
                </WelcomeButton>
              </View>
            </View>
          </View>

          <StatusMessage
            type="error"
            content={error ? [error] : []}
            visible={!!error}
            onClose={() => setError(null)}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

export default Verify;

function createStyle(loginTheme: "default", isSmallScreen: boolean) {
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
      justifyContent: isSmallScreen ? undefined : "center",
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
    buttonsContainer: {
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
  });
}
