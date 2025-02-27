import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  BackHandler,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import eventEmitter from "../utils/EventEmitter";

import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";

import JsonParser from "../utils/JsonParser";
import localDatabase from "../utils/localDatabaseMethods";
import WebSocketMethods from "../utils/webSocketMethods";

import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginPassword = () => {
  const router = useRouter();

  const { emailValue } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.header}>Password Login</Text>
          <Text style={styles.label}>Email: {emailValue}</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Enter your password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
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
    </SafeAreaProvider>
  );
};

export default LoginPassword;

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
    header: {
      fontSize: 24,
      color: "white",
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      color: "white",
      marginBottom: 10,
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
    loader: {
      marginTop: 10,
    },
  });
}
