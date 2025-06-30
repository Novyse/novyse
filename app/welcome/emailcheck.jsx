import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  BackHandler,
  Platform,
  TouchableOpacity,
  Image,
  useWindowDimensions, // 1. Importa l'hook per le dimensioni dello schermo
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import JsonParser from "../utils/JsonParser";
import { useRouter } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import APIMethods from "../utils/APImethods";
import QRCode from "react-native-qrcode-svg";

const EmailCheckForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const loginTheme = "default";

  // 2. Ottieni la larghezza dello schermo e definisci il breakpoint
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 936; // Sarà true su schermi di tipo mobile

  // Passa la variabile isSmallScreen per creare stili dinamici
  const styles = createStyle(loginTheme, isSmallScreen);

  const logoForQR = require("../../assets/images/logo-novyse-nobg-less-margin.png");

  useEffect(() => {
    const fetchQrToken = async () => {
      const token = await APIMethods.generateQRCodeTokenAPI();
      setQrToken(token);
    };
    fetchQrToken();
  }, []);

  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      router.navigate("/");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const validateEmail = (value) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  };

  const handleSubmit = async () => {
    if (!email) {
      setError("Per favore inserisci la tua email");
      return;
    }

    if (!validateEmail(email)) {
      setError("Non hai inserito un indirizzo email valido");
      return;
    }

    setError(null); // Clear previous errors
    checkEmailAndNavigate(email);
  };

  const checkEmailAndNavigate = async (emailValue) => {
    try {
      const emailResponse = await JsonParser.emailCheckJson(emailValue);

      if (emailResponse === "signup") {
        router.navigate({
          pathname: "/welcome/signup",
          params: {
            emailValue: emailValue,
          },
        });
      } else if (emailResponse === "login") {
        router.navigate({
          pathname: "/welcome/login",
          params: {
            emailValue: emailValue,
          },
        });
      } else {
        console.error("Errore: Risposta sconosciuta dall'API.");
      }
    } catch (error) {
      console.error("Errore durante la verifica email:", error);
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
      {/* Glass Card */}
      <View style={styles.card}>
        {/* Email Block */}
        <View style={styles.cardContent}>
          <Image
            style={styles.logo}
            source={require("../../assets/images/logo-novyse-nobg-less-margin.png")}
          />
          <Text style={styles.title}>Welcome</Text>
          <View style={styles.inputWrapper}>
            {/* <Text style={styles.emailSubtitle}>
              Enter email to login or signup
            </Text> */}
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="Email"
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              keyboardType="email-address"
              autoCapitalize="none"
              onSubmitEditing={Platform.OS === "web" ? handleSubmit : undefined}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={{ fontSize: 16, color: "white" }}>Continue</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* 3. Esegui il rendering del divider e del QR Code solo se lo schermo NON è piccolo */}
        {!isSmallScreen && (
          <>
            <View style={styles.divider}>
              <View style={styles.lineDivider} />
              <Text style={styles.textDivider}>OR</Text>
              <View style={styles.lineDivider} />
            </View>

            {/* QR Code Block */}
            <View style={styles.cardContent}>
              <View style={styles.qrcodeContainer}>
                {qrToken ? (
                  <QRCode value={qrToken} logo={logoForQR} size={200}/> // ti prego di perdornarmi, ma non so come si fa
                ) : (
                  <Text style={{ textAlign: "center", marginTop: 100 }}>
                    Loading QR...
                  </Text>
                )}
              </View>
              <Text style={styles.qrcodeSubtitle}>Scan QR to login</Text>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

export default EmailCheckForm;

// 4. Modifica la funzione createStyle per accettare il booleano isSmallScreen
function createStyle(loginTheme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    // Stile della card modificato per essere responsive
    card: {
      padding: isSmallScreen ? 16 : 24, // Meno padding su schermi piccoli
      borderRadius: isSmallScreen ? 0 : 20, // Nessun bordo arrotondato su schermi piccoli
      overflow: "hidden",
      flexDirection: isSmallScreen ? "column" : "row", // In colonna su schermi piccoli
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto", // Occupa tutta la larghezza su mobile
      height: isSmallScreen ? "100%" : "auto", // Occupa tutta l'altezza su mobile
      justifyContent: "center", // Centra il contenuto verticalmente su mobile
    },
    cardContent: {
      width: isSmallScreen ? "100%" : 400, // Larghezza piena su mobile
      height: isSmallScreen ? 600 : 400, // Altezza automatica su mobile
      justifyContent: isSmallScreen ? "" : "center",
      alignContent: "center",
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: isSmallScreen ? 140 : 40,
    },
    emailSubtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "left",
      marginTop: 20,
      marginBottom: 4,
    },
    qrcodeSubtitle: {
      fontSize: 18,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginTop: 4,
      fontWeight: "600",
    },
    inputError: {
      borderColor: "rgba(255, 99, 99, 0.8)",
      backgroundColor: "rgba(255, 99, 99, 0.1)",
    },
    inputWrapper: {
      alignSelf: "center",
      width: isSmallScreen ? "100%" : 350,
      alignItems: "center", // <-- LA SOLUZIONE! Centra i figli orizzontalmente.
    },
    textInput: {
      padding: 10,
      borderRadius: 6,
      marginBottom: 16,
      fontSize: 16,
      maxWidth: 300,
      width: "100%", // Aggiungi width: '100%' per riempire la maxWidth
      color: LoginColors[loginTheme].text,
      outlineStyle: "none",
      backgroundColor: "white",
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      maxWidth: 300,
      width: "100%", // Aggiungi width: '100%' per riempire la maxWidth
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    arrowIcon: {
      width: 40,
      height: 40,
      borderRadius: 50,
      alignItems: "right",
      marginRight: 8,
    },
    qrcodeContainer: {
      alignSelf: "center",
      height: 250,
      width: 250,
      backgroundColor: LoginColors[loginTheme].backgroundQRCode,
      borderRadius: 12,
      borderColor: LoginColors[loginTheme].borderQRCode,
      borderWidth: 2,
    },
    logo: {
      alignSelf: "center",
      height: 180,
      width: 180,
    },
    errorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 14,
      marginTop: 24,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    divider: {
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      marginHorizontal: 20,
    },
    lineDivider: {
      flex: 1,
      width: 1,
      backgroundColor: LoginColors[loginTheme].backgroundLineDivider,
    },
    textDivider: {
      marginVertical: 10,
      color: LoginColors[loginTheme].text,
      fontSize: 16,
    },
  });
}
