import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { useEffect } from "react";
import eventEmitter from "./utils/EventEmitter";
import localDatabase from "./utils/localDatabaseMethods";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const router = useRouter(); // Sposta useRouter qui

  useEffect(() => {
    const handleUserSessionInvalid = async () => {
      console.log("User session became invalid. Taking action... 🍹");

      await localDatabase.clearDatabase();
      await AsyncStorage.setItem("isLoggedIn", "false");
      router.navigate("/loginSignup/EmailCheckForm");
    };

    eventEmitter.on("invalidSession", handleUserSessionInvalid);

    return () => {
      eventEmitter.off("invalidSession", handleUserSessionInvalid);
    };
  }, [router]); // Aggiungi router come dipendenza

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{ headerShown: false, title: "Registrazione" }}
          />
          <Stack.Screen
            name="loginSignup/EmailCheckForm"
            options={{ headerShown: false, title: "Registrazione" }}
          />
          <Stack.Screen
            name="loginSignup/Signup"
            options={{ headerShown: false, title: "Registrazione" }}
          />
          <Stack.Screen
            name="loginSignup/LoginPassword"
            options={{ headerShown: false, title: "Login" }}
          />
          <Stack.Screen
            name="ChatList"
            options={{ headerShown: false, title: "ChatList" }}
          />
          <Stack.Screen
            name="ChatContent"
            options={{ headerShown: false, title: "ChatContent" }}
          />
          <Stack.Screen
            name="VocalContent"
            options={{ headerShown: false, title: "VocalContent" }}
          />
          <Stack.Screen
            name="Search"
            options={{ headerShown: false, title: "Search" }}
          />
          <Stack.Screen
            name="settings/SettingsMenu"
            options={{ headerShown: false, title: "SettingsMenu" }}
          />
          <Stack.Screen
            name="settings/storage"
            options={{ headerShown: false, title: "storage" }}
          />
          <Stack.Screen
            name="settings/themes"
            options={{ headerShown: false, title: "themes" }}
          />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
