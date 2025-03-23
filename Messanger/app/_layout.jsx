import { Stack} from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
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
            name="Search"
            options={{ headerShown: false, title: "Search" }}
          />
          <Stack.Screen
            name="settings/SettingsMenu"
            options={{ headerShown: false, title: "SettingsMenu" }}
          />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
