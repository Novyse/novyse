import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import JsonParser from "../utils/JsonParser";
import localDatabase from "../utils/localDatabaseMethods";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowRight02Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import ScreenLayout from "../components/ScreenLayout";

const { width, height } = Dimensions.get("window");

const LoginPassword = () => {
  const router = useRouter();
  const { emailValue } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  useEffect(() => {
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn == "true") {
        router.navigate("/messages");
      } else {
        console.log("Utente non loggato");
      }
    };
    checkLogged().then(() => {
      console.log("CheckLogged completed");
    });

    const backAction = () => {
      router.navigate("/welcome/emailcheck");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const storeSetIsLoggedIn = async (value) => {
    try {
      await AsyncStorage.setItem("isLoggedIn", value);
      console.log("storeSetIsLoggedIn: ", value);
    } catch (e) {
      console.log(e);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      setError("Per favore inserisci la tua password");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const loginSuccess = await JsonParser.loginJson(
        emailValue,
        password
      );
      console.log("Login Success?", loginSuccess);

      if (!loginSuccess) {
        console.log("Error", "Incorrect password.");
        setError("Password non corretta");
        setIsLoading(false);
        return;
      } else {
        await new Promise((resolve) => {
          const checklocalDatabase = setInterval(() => {
            if (localDatabase.db) {
              clearInterval(checklocalDatabase);
              resolve();
            }
          }, 50);
        });

        await localDatabase.clearDatabase();

        const exists = await localDatabase.checkDatabaseExistence();
        console.log("Database exists:", exists);

        await AsyncStorage.setItem("sessionIdToken", loginSuccess);
        console.log("⭐⭐⭐", await AsyncStorage.getItem("sessionIdToken"));

        const initSuccess = await JsonParser.initJson();

        if (initSuccess) {
          console.log("Init Success ⭐");
          await storeSetIsLoggedIn("true");
          router.replace("/messages");
        } else {
          console.log("Init Error");
        }
      }
    } catch (error) {
      console.error(error);
      setError("Si è verificato un errore imprevisto");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
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
            <Text style={styles.title}>ACCEDI</Text>
            <Text style={styles.email}>{emailValue}</Text>
            <Text style={styles.subtitle}>
              Inserisci la tua password per accedere al tuo account.
            </Text>

            {/* Password Input */}
            <View>
              <View
                style={[styles.inputWrapper, error ? styles.inputError : null]}
              >
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                  }}
                  placeholder="Inserisci la tua password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry={secureTextEntry}
                  onSubmitEditing={Platform.OS === "web" ? handleLogin : undefined}
                />
                
                {/* Eye Icon */}
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={toggleSecureEntry}
                >
                  <HugeiconsIcon
                    icon={secureTextEntry ? ViewOffIcon : ViewIcon}
                    size={20}
                    color="rgba(255,255,255,0.6)"
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <HugeiconsIcon
                      icon={ArrowRight02Icon}
                      size={30}
                      color={theme.icon}
                      strokeWidth={1.5}
                    />
                  )}
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

export default LoginPassword;

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
    marginBottom: 16,
  },
  email: {
    fontSize: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 56,
    lineHeight: 24,
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
    outlineStyle: "none",
  },
  eyeButton: {
    width: 40,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
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