// // LoginPassword.js
// import React from "react";
// import { View, Text, StyleSheet } from "react-native";
// import { useLocalSearchParams } from "expo-router";
// import { useRouter } from "expo-router";
// import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

// const LoginPassword = () => {
//   const router = useRouter();

//   const { emailValue } = useLocalSearchParams();

//   return (
//     <SafeAreaProvider>
//       <SafeAreaView style={styles.container}>
//         <View style={styles.formContainer}>
//           <Text style={styles.text}>Welcome to Login</Text>
//           <Text style={styles.text}>Email: {emailValue}</Text>
//         </View>
//       </SafeAreaView>
//     </SafeAreaProvider>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   formContainer:{
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   text: {
//     fontSize: 18,
//   },
// });

// export default LoginPassword;

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import WebSocketProvider, { WebSocketContext } from '../utils/webSocketMethods'; // Importa il modulo corretto
import { useContext } from 'react';

import LocalDatabaseMethods from "../utils/localDatabaseMethods";
import JsonParser from "../utils/JsonParse";
import LocalDatabase from "../utils/localDatabaseMethods";

const LoginPassword = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = await JsonParser.loginPasswordJson(emailValue, password);
      if (apiKey === "false") {
        Alert.alert("Error", "Incorrect password.");
        setIsLoading(false);
        return;
      } else {
        const db = new LocalDatabase();

        await new Promise((resolve) => {
          const checkDb = setInterval(() => {
            if (db.db) {
              clearInterval(checkDb);
              resolve();
            }
          }, 50); // Controlla ogni 50ms
        });


        

        // const userId = await db.fetchLocalUserID();
        // console.log("User ID:", userId);

        // await db.insertLocalUser("777", "nuova_chiave_api_2");

        // const newUserId = await db.fetchLocalUserID();
        // console.log("New User ID:", newUserId);

        // const exists = await db.checkDatabaseExistence();
        // console.log("Database exists:", exists);
      }

      // const userId = await JsonParser.getUserID(apiKey);
      // await LocalDatabaseMethods.insertLocalUser(userId, apiKey);

      // await WebSocketMethods.openWebSocketConnection(userId, apiKey);
      // await WebSocketMethods.WebSocketSenderMessage(
      //   `{"type":"init","apiKey":"${apiKey}"}`
      // );

      // await WebSocketMethods.WebSocketReceiver();

      Alert.alert("Success", "Login successful.");
      router.push("/ChatList"); // Navigate to ChatList
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Password Login</Text>
        <Text style={styles.label}>Email: {emailValue}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#ccc"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.buttonContainer}>
          <Button
            title="Submit"
            onPress={handleLogin}
            color={isLoading ? "#888" : "#007BFF"}
            disabled={isLoading}
          />
          {isLoading && (
            <ActivityIndicator style={styles.loader} size="small" />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#354966",
    padding: 20,
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
    width: "100%",
    height: 40,
    borderColor: "white",
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    color: "white",
    borderRadius: 5,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  loader: {
    marginTop: 10,
  },
});

export default LoginPassword;
