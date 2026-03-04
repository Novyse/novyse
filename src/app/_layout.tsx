import React, { useEffect } from "react";
import { Stack } from "expo-router";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { ScreenProvider } from "@/context/ScreenContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import SplashScreen from "@/src/components/SplashScreen";

function RootLayoutContent() {
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () =>
        document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ScreenProvider>
          <ThemeProvider>
            <LanguageProvider>
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={isLoggedIn === true}>
                    <Stack.Screen
                      name="(protected)"
                      options={{ headerShown: false }}
                    />
                  </Stack.Protected>
                  <Stack.Protected guard={isLoggedIn === false}>
                    <Stack.Screen
                      name="(welcome)"
                      options={{ headerShown: false }}
                    />
                  </Stack.Protected>
                  <Stack.Screen
                    name="profile"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="+not-found"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </BottomSheetModalProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ScreenProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
