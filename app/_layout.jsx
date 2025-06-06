import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AudioProvider } from "../context/AudioContext";
import { ThemeContext, ThemeProvider } from "../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

import SetupGlobalEventReceiver from "./utils/global/EventReceiver";

import { useContext } from "react";

function Components() {
  return (
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
  );
}

// Componente interno che applica il gradiente di sfondo globale
function AppWithGradientBackground() {
  const { theme } = useContext(ThemeContext);
  SetupGlobalEventReceiver(); // Inizializza i listener globali

  return (
    <LinearGradient colors={theme.backgroundMainGradient} style={{ flex: 1 }}>
      <Components />
    </LinearGradient>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <AppWithGradientBackground />
      </AudioProvider>
    </ThemeProvider>
  );
}
