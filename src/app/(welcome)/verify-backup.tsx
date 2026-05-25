import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import AppText from "@/src/components/AppText";

import { useScreen } from "@/src/context/ScreenContext";

import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import gateway from "@/src/utils/backend-services/api-gateway";
import OtpDigitsInput from "@/src/components/OtpDigitsInput";
import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
// import logoNovyse from "@/assets/images/logo-novyse.png";

type SearchParams = {
  token: string;
};

const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_REGEX = /^[A-Z0-9]+$/;

const VerifyBackup: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const loginTheme = "default" as const;
  const { isSmallScreen } = useScreen();
  const styles = createStyle(loginTheme, isSmallScreen);

  const [code, setCode] = useState<string[]>(
    Array(BACKUP_CODE_LENGTH).fill(""),
  );

  const { token } = useLocalSearchParams<SearchParams>();

  useEffect(() => {
    const fullCode = code.join("");
    if (
      fullCode.length === BACKUP_CODE_LENGTH &&
      BACKUP_CODE_REGEX.test(fullCode) &&
      !isLoading
    ) {
      handleVerifyBackupCode();
    }
  }, [code]);

  const handleCodeChange = (newValue: string[]) => {
    setCode(newValue);
  };

  const handleVerifyBackupCode = async (): Promise<void> => {
    const fullCode = code.join("");

    if (
      fullCode.length !== BACKUP_CODE_LENGTH ||
      !BACKUP_CODE_REGEX.test(fullCode)
    ) {
      setError("Enter a valid 8-character backup code (letters and numbers).");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("Verifying backup code:", fullCode);
      console.log("Token:", token);

      const backupCodeVerificationSuccess = await gateway.auth.verifyBackupCode(
        token,
        fullCode,
      );

      if (backupCodeVerificationSuccess) {
        console.log("Backup code verified successfully!");
        router.replace("/app");
      } else {
        console.log("Backup code verification failed");
        setError("Invalid backup code. Please try again.");
      }
    } catch (apiError) {
      console.error("Error during backup code verification:", apiError);
      setError("An error occurred during verification. Please try again.");
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
            translationKey="auth.verifyBackup.title"
          />
          <AppText
            style={styles.subtitle}
            translationKey="auth.verifyBackup.subtitle"
          />

          <View style={styles.inputWrapper}>
            <OtpDigitsInput
              value={code}
              onChange={handleCodeChange}
              error={!!error}
              inputCount={BACKUP_CODE_LENGTH}
              allowLetters={true}
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
                  onPress={handleVerifyBackupCode}
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

export default VerifyBackup;

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
