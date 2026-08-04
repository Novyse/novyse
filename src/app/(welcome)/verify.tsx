import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import AppText from "@/src/components/ui/text/AppText";

import { useScreen } from "@/src/context/ScreenContext";

import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import gateway from "@/src/utils/backend-services/api-gateway";
import OtpDigitsInput from "@/src/components/OtpDigitsInput";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";

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
    if (!verificationType) return "auth.verify.titleVerifyCode";

    switch (verificationType) {
      case "email":
        return "auth.verify.titleEmailOtp";
      case "email_verification":
        return "auth.verify.titleVerifyEmail";
      case "authenticator":
        return "auth.verify.titleAuthenticatorApp";
      default:
        return "auth.verify.titleVerifyCode";
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

        await refreshLoginStatus();
        router.replace("/app");
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
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* <Image style={styles.logo} source={logoNovyse} /> */}

          <AppText
            style={styles.title}
            translationKey={getFormattedVerificationType()}
          />
          <AppText
            style={styles.subtitle}
            translationKey="auth.verify.subtitle"
          />

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
                  <WelcomeButtonText
                    type="back"
                    translationKey="auth.signup.back"
                  />
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
                    <WelcomeButtonText
                      type="submit"
                      translationKey="auth.verify.verifyBtn"
                    />
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
    </View>
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
      backgroundColor: "transparent",
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
