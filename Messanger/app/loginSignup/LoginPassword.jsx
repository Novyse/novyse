import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";

import JsonParser from "../utils/JsonParser";
import localDatabase from "../utils/localDatabaseMethods";
import WebSocketMethods from "../utils/webSocketMethods";

import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginPassword = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

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

        await WebSocketMethods.openWebSocketConnection(localUserID, apiKey);

        storeSetIsLoggedIn("true");

        await localDatabase.insertLocalUser(localUserID, apiKey);

        const userIdDB = await localDatabase.fetchLocalUserID();
        console.log("LoginPassword - User ID dal DB:", userIdDB);
        const apiKeyDB = await localDatabase.fetchLocalUserApiKey();
        console.log("LoginPassword - ApiKey dal DB:", apiKeyDB);

        const exists = await localDatabase.checkDatabaseExistence();
        console.log("Database exists:", exists);

        if (apiKey != null) {
          await WebSocketMethods.webSocketSenderMessage(
            `{"type":"init","apiKey":"${apiKey}"}`
          );
        } else {
          console.log("LoginPassword - Apikey nulla");
        }








        const sleep = (ms) => {
          return new Promise((resolve) => setTimeout(resolve, ms));
        };
        await sleep(4000);





        console.log("Success", "Login successful.");
        router.push("/ChatList"); // Navigate to ChatList
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
