import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ChatProvider } from "../context/ChatContext";
import { UserProvider } from "../context/UserContext";
import { LanguageProvider } from "../context/LanguageContext";

import { useEffect } from "react";
import { useRouter } from "expo-router";
import auth from "./utils/welcome/auth";

import SetupGlobalEventReceiver from "./utils/global/Events/EventReceiver";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      const success = await auth.checkLogged();
      if (success) {
        router.replace("/chat");
      }
    };
    initialize();
  }, []);

  SetupGlobalEventReceiver();

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
