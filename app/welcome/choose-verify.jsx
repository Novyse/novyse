// chooseverify.js (o il nome del tuo file per la pagina ChooseVerify)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator, // Aggiunto per coerenza con gli stili
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import APIMethods from "../utils/APImethods";

const ChooseVerify = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); // Mantieni per coerenza ma non strettamente necessario qui
  const [selectedMethod, setSelectedMethod] = useState(null);
  const loginTheme = "default";
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);

  const { email, token, verificationTypeList } = useLocalSearchParams();

  const methods = verificationTypeList ? verificationTypeList.split(",") : [];

  useEffect(() => {
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn === "true") {
        router.navigate("/messages");
      } else {
        console.log("Utente non loggato in ChooseVerify");
      }
    };
    checkLogged();
  }, []);

  const handleChooseMethod = (method) => {
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (selectedMethod) {
      setIsLoading(true);
      const successChoose = await APIMethods.twofaSelect(token, selectedMethod);
      if (successChoose) {
        // Naviga alla pagina Verify, passando il metodo scelto come verificationType
        router.navigate({
          pathname: "./verify", // Assicurati che questo sia il percorso corretto per la tua pagina Verify
          params: {
            verificationType: selectedMethod,
            token: token,
          },
        });
        setIsLoading(false);
      }
    } else {
      // Potresti voler mostrare un messaggio di errore se nessun metodo è selezionato
      alert("Please choose a verification method.");
    }
  };

  return (
    <LinearGradient
      colors={
        isSmallScreen
          ? ["transparent", "transparent"]
          : LoginColors[loginTheme].background
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        style="dark"
        backgroundColor={LoginColors[loginTheme].backgroundCard}
        translucent={false}
        hidden={false}
      />

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            style={styles.logo}
            source={require("../../assets/images/logo-novyse-nobg-less-margin.png")}
          />

          <Text style={styles.title}>Choose Verification Method</Text>
          <Text style={styles.subtitle}>
            Please select how you'd like to receive your verification code.
          </Text>

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
                <Text
                  style={[
                    styles.optionButtonText,
                    selectedMethod === method &&
                      styles.selectedOptionButtonText,
                  ]}
                >
                  {method === "email" && "Email"}
                  {method === "sms" && "SMS"}
                  {method === "authenticator" && "Authenticator App"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleContinue}
            disabled={isLoading || !selectedMethod}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

export default ChooseVerify;

// Gli stili sono stati modificati e aggiunti per la nuova UI
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
      alignContent: "center",
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    title: {
      fontSize: 32, // Dimensione leggermente ridotta per più spazio
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginBottom: 30, // Spazio leggermente ridotto
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    optionsContainer: {
      width: "100%",
      maxWidth: 300,
      alignSelf: "center",
      marginBottom: 30,
    },
    optionButton: {
      borderWidth: 1.5,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderRadius: 8,
      paddingVertical: 15,
      marginBottom: 10,
      alignItems: "center",
      backgroundColor: "white",
    },
    selectedOptionButton: {
      borderColor: LoginColors[loginTheme].backgroundSubmitButton, // Colore per l'opzione selezionata
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    optionButtonText: {
      fontSize: 16,
      fontWeight: "500",
      color: LoginColors[loginTheme].text,
    },
    selectedOptionButtonText: {
      color: "white", // Testo bianco per l'opzione selezionata
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      maxWidth: 300,
      width: "100%",
      alignSelf: "center", // Centra il pulsante
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
      marginTop: 20, // Spazio sopra il pulsante
    },
    submitButtonText: {
      fontSize: 16,
      color: "white",
      fontWeight: "500",
    },
    errorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 14,
      marginTop: 24,
      textAlign: "center",
      paddingHorizontal: 8,
    },
  });
}
