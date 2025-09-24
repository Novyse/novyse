import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ChatProvider } from "../context/ChatContext";

import SetupGlobalEventReceiver from "./utils/global/Events/EventReceiver";

export default function RootLayout() {
  SetupGlobalEventReceiver();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AudioProvider>
          <ChatProvider>
            <Stack
              screenOptions={{
                // Opzioni globali che si applicano a tutte le schermate
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />
          </ChatProvider>
        </AudioProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
