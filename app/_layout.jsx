import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ChatProvider } from "../context/ChatContext";
import { UserProvider } from "../context/UserContext";
import { LanguageProvider } from "../context/LanguageContext";

import SetupGlobalEventReceiver from "./utils/global/Events/EventReceiver";

export default function RootLayout() {
  SetupGlobalEventReceiver();

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <AudioProvider>
            <ChatProvider>
              <UserProvider>
                <LanguageProvider>
                  <Stack
                    screenOptions={{
                      // Opzioni globali che si applicano a tutte le schermate
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                    }}
                  />
                </LanguageProvider>
              </UserProvider>
            </ChatProvider>
          </AudioProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
