import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import eventEmitter from "../utils/EventEmitter";
import { ThemeContext } from "@/context/ThemeContext";
import JsonParser from "../utils/JsonParser";
import localDatabase from "../utils/localDatabaseMethods";
import WebSocketMethods from "../utils/webSocketMethods";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const LoginPassword = () => {
  const router = useRouter();
  const { emailValue } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const [secureTextEntry, setSecureTextEntry] = useState(true); // Stato per nascondere/mostrare la password

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
      router.navigate("/loginSignup/EmailCheckForm");
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
      console.log("Error", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = await JsonParser.loginPasswordJson(emailValue, password);
      console.log("LoginPassword - Apikey:", apiKey);

      const localUserID = await JsonParser.getUserID(apiKey);
      console.log("LoginPassword - localUserID:", localUserID);

      if (apiKey == "false") {
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
          }, 50); // Controlla ogni 50ms
        });

        await localDatabase.clearDatabase();

        await WebSocketMethods.saveParameters(localUserID, apiKey);
        await WebSocketMethods.openWebSocketConnection();

        await localDatabase.insertLocalUser(localUserID, apiKey);
        const exists = await localDatabase.checkDatabaseExistence();
        console.log("Database exists:", exists);

        eventEmitter.on("webSocketOpen", async () => {
          if (apiKey != null) {
            await WebSocketMethods.webSocketSenderMessage(
              `{"type":"init","apiKey":"${apiKey}"}`
            );
          } else {
            console.log("LoginPassword - Apikey nulla");
          }
        });

        eventEmitter.on("loginToChatList", async () => {
          eventEmitter.off("loginToChatList");
          console.log("LoginPassword - loginToChatList:");
          await storeSetIsLoggedIn("true");
          router.navigate("/messages");
        });

        console.log("Success", "Login successful.");
      }
    } catch (error) {
      console.error(error);
      console.log("Error", "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={["#1B2734", "#49698C", "#7896B7"]}
        locations={[0, 0.68, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.formContainer}>
            <Text
              style={{
                color: theme.text,
                fontSize: 56,
                marginBottom: 20,
                fontWeight: 700,
                top: -176,
              }}
            >
              {emailValue}
            </Text>
            {/* <Text style={styles.email}>{emailValue}</Text> */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="Enter your password"
                placeholderTextColor="#ccc"
                secureTextEntry={secureTextEntry}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={toggleSecureEntry}
              >
                <MaterialCommunityIcons
                  name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable
              style={styles.containerButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.containerButtonText}>Invia</Text>
            </Pressable>
            {isLoading && (
              <ActivityIndicator style={styles.loader} size="small" />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
};

export default LoginPassword;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    formContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      fontSize: 24,
      color: "white",
      marginBottom: 20,
    },
    // email: {
    //   fontSize: 16,
    //   color: "white",
    //   marginBottom: 10,
    // },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "white",
      marginBottom: 16,
      // width: 250,
    },
    input: {
      outlineStyle: "none",
      flex: 1,
      color: "white",
      paddingHorizontal: 8,
      paddingVertical: 4,
      pointerEvents: "auto",
      width: 250,
    },
    inputError: {
      borderBottomColor: "red",
    },
    errorText: {
      color: "red",
      marginBottom: 8,
    },
    containerButton: {
      backgroundColor: theme.button,
      paddingHorizontal: 20,
      paddingVertical: 5,
      borderRadius: 100,
    },
    containerButtonText: {
      color: theme.text,
      fontSize: 18,
    },
    // loader: {
    //   marginTop: 10,
    // },
    eyeIcon: {
      // padding: 10,
      outlineStyle: "none",
    },
  });
}
