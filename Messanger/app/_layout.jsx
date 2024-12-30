import { Stack } from "expo-router";
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
            options={{ headerShown: true, title: "Registrazione" }}
          />
          <Stack.Screen
            name="loginSignup/LoginPassword"
            options={{ headerShown: true, title: "Login" }}
          />
          <Stack.Screen
            name="ChatList"
            options={{ headerShown: false, title: "ChatList" }}
          />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
