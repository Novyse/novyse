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
import LocalDatabase from "../utils/localDatabaseMethods";
import WebSocketMethods from "../utils/webSocketMethods";

const LoginPassword = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const handleLogin = async () => {
    if (!password) {
      console.log("Error", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = await JsonParser.loginPasswordJson(emailValue, password);
      const localUserID = await JsonParser.getUserID(apiKey);

      if (apiKey === "false") {
        console.log("Error", "Incorrect password.");
        setError("Password non corretta");
        setIsLoading(false);
        return;
      } else {
        const db = new LocalDatabase();
        const ws = new WebSocketMethods();

        await new Promise((resolve) => {
          const checkDb = setInterval(() => {
            if (db.db) {
              clearInterval(checkDb);
              resolve();
            }
          }, 50); // Controlla ogni 50ms
        });

        
        await ws.openWebSocketConnection(localUserID, apiKey)

        await db.insertLocalUser(localUserID, apiKey);

        const userId = await db.fetchLocalUserID();
        console.log("User ID:", userId);

        // await db.insertLocalUser("778", "nuova_chiave_api_2");

        // const newUserId = await db.fetchLocalUserID();
        // console.log("New User ID:", newUserId);

        const exists = await db.checkDatabaseExistence();
        console.log("Database exists:", exists);

        // await ws.webSocketSenderMessage(
        //   `{"type":"init","apiKey":"${apiKey}"}`
        // );

        // await ws.webSocketReceiver();

        console.log("Success", "Login successful.");
        router.push("/ChatList"); // Navigate to ChatList
      }

      // const userId = await JsonParser.getUserID(apiKey);
      // await LocalDatabaseMethods.insertLocalUser(userId, apiKey);

      // await WebSocketMethods.openWebSocketConnection(userId, apiKey);
      // await WebSocketMethods.WebSocketSenderMessage(
      //   `{"type":"init","apiKey":"${apiKey}"}`
      // );

      // await WebSocketMethods.WebSocketReceiver();
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
