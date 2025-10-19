import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useState, useEffect } from "react";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToastManager from "toastify-react-native";

import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ChatProvider } from "../context/ChatContext";
import { UserProvider } from "../context/UserContext";
import { LanguageProvider } from "../context/LanguageContext";

import SetupGlobalEventReceiver from "./utils/global/Events/EventReceiver";

export default function RootLayout() {
  SetupGlobalEventReceiver();

  // Logica responsive solo per width del toast
  const [toastWidth, setToastWidth] = useState('auto');
  const insets = useSafeAreaInsets(); // Per safe area top su tutti i device
  const { width } = Dimensions.get('window');
  const isMobile = width < 768; // Threshold per width responsive
  const headerHeight = 64; // Altezza fissa header standard su tutta l'app

  useEffect(() => {
    setToastWidth(isMobile ? '90%' : 300); // 90% su mobile, fissa 300px su desktop/tablet
  }, []);

  // Top offset sempre sotto header: safe top + header height (su tutti i device)
  const topOffset = insets.top + headerHeight;

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
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                    }}
                  />
                  {/* ToastManager a root: overlay full-viewport, sotto header su tutti i device */}
                  <ToastManager
                    position="top"
                    topOffset={topOffset} // Sempre sotto header
                    theme="light" // O "dark" based on theme
                    width={toastWidth}
                    showCloseIcon={true}
                    showProgressBar={true}
                    style={{
                      alignSelf: 'flex-end',
                      marginRight: 20,
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