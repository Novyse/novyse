import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";

import SetupGlobalEventReceiver from "./utils/global/EventReceiver";

export default function RootLayout() {
  SetupGlobalEventReceiver();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AudioProvider>
          <Stack
            screenOptions={{
              // Opzioni globali che si applicano a tutte le schermate
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </AudioProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}