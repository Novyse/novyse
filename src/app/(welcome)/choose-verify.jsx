import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useScreen } from "@/src/context/ScreenContext";

import { LoginColors } from "@/constants/LoginColors";

import gateway from "@/src/utils/backend-services/api-gateway";

import StatusMessage from "@/src/components/StatusMessage";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import AppText from "@/src/components/ui/text/AppText";

import logoNovyse from "@/assets/images/logo-novyse.png";

const ChooseVerify = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [error, setError] = useState("");
  const loginTheme = "default";

  const { isSmallScreen } = useScreen();

  const styles = createStyle(loginTheme, isSmallScreen);

  const { email, token, verificationTypeList } = useLocalSearchParams();

  const methods = verificationTypeList ? verificationTypeList.split(",") : [];

  useEffect(() => {
    if (!email || !token || !verificationTypeList) {
      router.navigate("welcome");
    }
  }, [(email, token, verificationTypeList)]);

  const handleChooseMethod = (method) => {
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (selectedMethod) {
      setIsLoading(true);
      setError("");
      const { success, method, twoFactorToken, expiresIn } =
        await gateway.auth.chooseTwofaMethod(token, selectedMethod);
      if (success) {
        router.navigate({
          pathname: "./verify",
          params: {
            verificationType: method,
            token: twoFactorToken,
          },
        });
      }
      setIsLoading(false);
    } else {
      setError("Please choose a verification method.");
    }
  };

  const handleBack = () => {
    router.navigate("/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />

          <AppText
            style={styles.title}
            translationKey="auth.chooseVerify.title"
          />
          <AppText
            style={styles.subtitle}
            translationKey="auth.chooseVerify.subtitle"
          />

          <View style={styles.optionsContainer}>
            {methods.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.optionButton,
                  selectedMethod === method && styles.selectedOptionButton,
                ]}
                onPress={() => handleChooseMethod(method)}
              >
                <AppText
                  style={[
                    styles.optionButtonText,
                    selectedMethod === method &&
                      styles.selectedOptionButtonText,
                  ]}
                >
                  {method === "email" && "Email"}
                  {method === "sms" && "SMS"}
                  {method === "authenticator" && "Authenticator App"}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.buttonsContainer}>
            <WelcomeButton onPress={handleBack} type={"back"}>
              <WelcomeButtonText type={"back"} />
            </WelcomeButton>
            <WelcomeButton
              onPress={handleContinue}
              disabled={isLoading || !selectedMethod}
              type={"submit"}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={LoginColors[loginTheme].iconLoading}
                />
              ) : (
                <WelcomeButtonText type={"submit"} />
              )}
            </WelcomeButton>
          </View>
          <View style={styles.containerStatus}>
            <StatusMessage
              type="error"
              content={[error]}
              visible={!!error}
              onClose={() => {
                setError(null);
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default ChooseVerify;

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
      justifyContent: isSmallScreen ? undefined : "center",
      alignItems: "center",
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 20,
      paddingHorizontal: 20,
      maxWidth: 300,
    },
    optionsContainer: {
      width: "100%",
      maxWidth: 300,
      alignSelf: "center",
      marginBottom: 30,
    },
    containerStatus: {
      alignSelf: "center",
      width: 300,
      alignItems: "center",
    },
    optionButton: {
      borderWidth: 1.5,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderRadius: 8,
      paddingVertical: 15,
      marginBottom: 10,
      alignItems: "center",
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
    },
    selectedOptionButton: {
      borderColor: LoginColors[loginTheme].backgroundSubmitButton,
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    optionButtonText: {
      fontSize: 16,
      fontWeight: "500",
      color: LoginColors[loginTheme].text,
    },
    selectedOptionButtonText: {
      color: LoginColors[loginTheme].selectedOptionText,
    },
    buttonsContainer: {
      alignItems: "center",
      width: "100%",
      flexDirection: "row",
      maxWidth: 300,
    },
  });
}
