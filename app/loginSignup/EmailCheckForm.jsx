import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  BackHandler,
  Platform,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import JsonParser from "../utils/JsonParser";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";
import ScreenLayout from "../components/ScreenLayout";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

const { width, height } = Dimensions.get("window");

const EmailCheckForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
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
          pathname: "/loginSignup/Signup",
          params: {
            emailValue: emailValue,
          },
        });
      } else if (emailResponse === "login") {
        router.navigate({
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
    <ScreenLayout>
      <View style={styles.formContainer}>
        {/* Glass Card */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <LinearGradient
            colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
            style={styles.cardGradient}
          >
            {/* Header */}
            <Text style={styles.title}>EMAIL</Text>
            <Text style={styles.subtitle}>
              Per favore inserisci la tua email per accedere o registrarti.
            </Text>

            {/* Email Input */}
            <View>
              {/* <Text style={styles.inputLabel}>Email</Text> */}
              <View
                style={[styles.inputWrapper, error ? styles.inputError : null]}
              >
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(null); // Clear error on typing
                  }}
                  placeholder="Inserisci la tua email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onSubmitEditing={
                    Platform.OS === "web" ? handleSubmit : undefined
                  }
                />
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={handleSubmit}
                >
                  <HugeiconsIcon
                    icon={ArrowRight02Icon}
                    size={30}
                    color={theme.icon}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </ScreenLayout>
  );
};

export default EmailCheckForm;

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    maxWidth: 500,
    minHeight: 100,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardGradient: {
    padding: 25,
    height: "100%",
  },
  title: {
    fontSize: 56,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 56,
    lineHeight: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 56,
  },
  inputError: {
    borderColor: "rgba(255, 99, 99, 0.8)",
    backgroundColor: "rgba(255, 99, 99, 0.1)",
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "white",
    outlineStyle: "none", // Per web
  },
  arrowButton: {
    width: 44,
    height: 44,
    backgroundColor: "transparent",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  errorText: {
    color: "rgba(255, 99, 99, 0.9)",
    fontSize: width > 480 ? 14 : 13,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
