import { Stack} from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { AudioProvider } from "../context/AudioContext";

import { useEffect } from "react";
import eventEmitter from "./utils/EventEmitter";

// TEMPORARY IMPORTS TO ALLOW AUTOMATIC LOGOUT
import localDatabase from "./utils/localDatabaseMethods";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TEMPORARY IMPORTS TO ALLOW AUTOMATIC LOGOUT

export default function RootLayout() {

  // TEMPORARY IMPORTS TO ALLOW AUTOMATIC LOGOUT
  const router = useRouter();
  // TEMPORARY IMPORTS TO ALLOW AUTOMATIC LOGOUT

  useEffect(() => {
    const handleUserSessionInvalid = async () => {
      console.log('User session became invalid. Taking action... 🍹');
      // da qui tocca chiamare metodo per il logout, per ora faccio a manina dopo è da sistemare

      // TEMPORARY CODE TO ALLOW AUTOMATIC LOGOUT
      await localDatabase.clearDatabase();
      await AsyncStorage.setItem("isLoggedIn", "false");
      router.navigate("/loginSignup/EmailCheckForm");
      // TEMPORARY CODE TO ALLOW AUTOMATIC LOGOUT

    };

    // ------------------> global event listeners 
    // session invalid event
    eventEmitter.on('invalidSession', handleUserSessionInvalid);

    // ------------------> global event listeners END

    return () => {
      eventEmitter.off('invalidSession', handleUserSessionInvalid);    };
  }, []);

  return (
    <ThemeProvider>
      <AudioProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Schermata principale */}
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
      </AudioProvider>
    </ThemeProvider>
  );
}
