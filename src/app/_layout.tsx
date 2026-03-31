import "react-native-get-random-values";
import React, { useEffect } from "react";
import { Stack } from "expo-router";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { ScreenProvider } from "@/context/ScreenContext";
import { ThemeProvider, useThemeContext } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SplashScreen from "@/src/components/SplashScreen";
import useAuthSession from "@/src/hooks/auth/useAuthSession";
import notificationManager from "@/src/utils/notifications/NotificationManager";

function StackLayout({ isLoggedIn }: { isLoggedIn: boolean | null }) {
  const { theme } = useThemeContext()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.backgroundMainGradient[0],
        },
      }}
    >
      {isLoggedIn && (
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      )}
      {!isLoggedIn && (
        <Stack.Screen name="(welcome)" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

function RootLayoutContent() {
  const { isLoggedIn, isLoading } = useAuthSession();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () =>
        document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      notificationManager.updatePushToken();
    }
  }, [isLoggedIn]);

  if (isLoading || isLoggedIn === null) {
    return <SplashScreen />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ScreenProvider>
          <ThemeProvider>
            <LanguageProvider>
              <BottomSheetModalProvider>
                <StackLayout isLoggedIn={isLoggedIn} />
              </BottomSheetModalProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ScreenProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return <RootLayoutContent />;
}
