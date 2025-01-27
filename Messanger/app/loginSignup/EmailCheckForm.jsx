import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  BackHandler,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import APIMethods from "../utils/APImethods";
import Signup from "./Signup"; // Import Signup screen
import LoginPassword from "./LoginPassword"; // Import LoginPassword screen
import JsonParser from "../utils/JsonParser";
import { usePathname, useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";

const EmailCheckForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      router.push("/");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
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
        router.push({
          pathname: "/loginSignup/Signup",
          params: {
            emailValue: emailValue,
          },
        });
      } else if (emailResponse === "login") {
        router.push({
          pathname: "/loginSignup/LoginPassword",
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
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable style={styles.containerStartButton} onPress={handleSubmit}>
            <Text style={styles.containerStartButtonText}>Invia</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default EmailCheckForm;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#354966",
      justifyContent: "center",
      alignItems: "center",
    },
    formContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    input: {
      width: 250,
      borderBottomWidth: 1,
      borderBottomColor: "white",
      color: "white",
      marginBottom: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
      pointerEvents: "auto",
    },
    inputError: {
      borderBottomColor: "red",
    },
    errorText: {
      color: "red",
      marginBottom: 8,
    },
    containerStartButton: {
      backgroundColor: theme.button,
      paddingHorizontal: 20,
      paddingVertical: 5,
      borderRadius: 100,
    },
    containerStartButtonText: {
      color: theme.text,
      fontSize: 18,
    },
  });
}
