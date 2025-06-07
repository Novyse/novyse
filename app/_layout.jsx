import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";

import SetupGlobalEventReceiver from "./utils/global/EventReceiver";


function Components() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: 'transparent' }
    }}>
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
  );
}

export default function RootLayout() {
  SetupGlobalEventReceiver();
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AudioProvider>
          <Components />
        </AudioProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
