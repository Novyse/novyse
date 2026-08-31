import "react-native-get-random-values";
import "@/src/i18n";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { ScreenProvider } from "@/src/context/ScreenContext";
import { ThemeProvider, useThemeContext } from "@/src/context/ThemeContext";
import { LanguageProvider } from "@/src/context/LanguageContext";
import useAuthSession from "@/src/hooks/auth/useAuthSession";

import SplashScreen from "@/src/components/layout/SplashScreen";
import SmartBackground from "@/src/components/layout/SmartBackground";
import WindowControls, {
  WINDOW_CONTROL_HEIGHT,
} from "@/src/components/features/desktop/WindowControls";

import notificationManager from "@/src/utils/notifications/manager";
import Platform from "@/src/utils/device/type";

// Set the background color of the navigation bar to transparent
import { DefaultTheme } from "expo-router/react-navigation";
DefaultTheme.colors.background = "transparent";

function StackLayout({ isLoggedIn }: { isLoggedIn: boolean | null }) {
  const { theme } = useThemeContext();
  return (
    <SmartBackground colors={theme.backgroundMainGradient} style={{ flex: 1 }}>
      {Platform === "desktop" && <WindowControls />}
      <View
        style={{
          flex: 1,
          marginTop: Platform === "desktop" ? WINDOW_CONTROL_HEIGHT : 0,
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        >
          <Stack.Protected guard={isLoggedIn === true}>
            <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={isLoggedIn === false}>
            <Stack.Screen name="(welcome)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </View>
    </SmartBackground>
  );
}

function RootLayoutContent() {
  const { isLoggedIn, isLoading } = useAuthSession();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
        }
      };
      document.addEventListener("contextmenu", handleContextMenu);
      return () =>
        document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      notificationManager.updatePushToken();
      notificationManager.requestPermissions();
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
