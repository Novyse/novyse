import React, { useState, useEffect, useRef } from "react";
import { View, useWindowDimensions, Animated } from "react-native";
import { Slot, usePathname } from "expo-router";

import { useThemeContext } from "@/src/context/ThemeContext";

import TabNavigator from "@/src/components/tabs/TabNavigator";

import { useScreen } from "@/src/context/ScreenContext";
import useChatStore from "@/src/context/ChatContext";
import useUserStore from "@/src/context/UserContext";
import useWindowSizeStore from "@/src/context/WindowSizeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useNetworkStore from "@/src/context/NetworkContext";

import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";

import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@/src/utils/welcome/auth";

import InitPage from "@/src/components/pages/InitPage";

export default function RootLayout() {
  // Listen for Expo Router pathname changes to determine if a detail is open
  // With flat structure, detail is open if path is NOT /app and NOT /app/
  const pathname = usePathname();
  const isDetailOpen = pathname !== "/app" && pathname !== "/app/";

  // Pan responder for resizing the detail pane on larger screens
  const { isSmallScreen } = useScreen();
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isDetailOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // This ensures state is reset for Android back gestures or explicit navigation back to chat list.
    if (!isDetailOpen) {
      useActiveChatStore.getState().clear();
    }
  }, [isDetailOpen]);

  const {
    detailWidth,
    setDetailWidth,
    minDetailWidth,
    setMinDetailWidth,
    isStorageReady,
  } = useWindowSizeStore();

  const MIN_CHAT_LIST_WIDTH = 280;

  const resizerHandlers = usePanelResizer({
    currentWidth: detailWidth,
    setWidth: setDetailWidth,
    minWidth: minDetailWidth,
    maxWidthPadding: MIN_CHAT_LIST_WIDTH + 20,
  });
  const prevWidthRef = useRef(width);

  useEffect(() => {
    const delta = width - prevWidthRef.current;
    prevWidthRef.current = width;
    setDetailWidth((prev) => {
      const maxDetail = width - MIN_CHAT_LIST_WIDTH - 20;
      let newWidth = prev;
      if (delta > 0) {
        newWidth = prev + delta;
      }
      return Math.max(minDetailWidth, Math.min(maxDetail, newWidth));
    });
  }, [width, minDetailWidth, setDetailWidth]);

  // Initialize database if needed
  const [hasInitialized, setHasInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    let retryInterval: any = null;

    const checkInit = async () => {
      try {
        const initValue = await AsyncStorage.getItem("init");
        if (initValue === "true") {
          try {
            await auth.updateDatabase();
            useNetworkStore.getState().setSynced(true);
          } catch (updateError) {
            console.warn(
              "Failed to update database, starting retry loop:",
              updateError,
            );
            useNetworkStore.getState().setSynced(false);

            let countdown = 5;
            useNetworkStore.getState().setSyncRetryCountdown(countdown);

            retryInterval = setInterval(async () => {
              countdown--;
              useNetworkStore.getState().setSyncRetryCountdown(countdown);

              if (countdown === 0) {
                try {
                  console.log("Retrying database update...");
                  await auth.updateDatabase();
                  useNetworkStore.getState().setSynced(true);
                  useNetworkStore.getState().setSyncRetryCountdown(0);
                  if (retryInterval) clearInterval(retryInterval);
                  console.log("Database update successful after retry!");
                } catch (error) {
                  console.warn("Retry failed, will try again in 5s");
                  countdown = 5; // Reset countdown
                  useNetworkStore.getState().setSyncRetryCountdown(countdown);
                }
              }
            }, 1000);
          }
          setHasInitialized(true);
        } else {
          setHasInitialized(false);
          const success = await auth.initializeDatabase();
          if (success) {
            await AsyncStorage.setItem("init", "true");
            setHasInitialized(true);
            useNetworkStore.getState().setSynced(true);
          }
        }
      } catch (error) {
        console.error("Failed to check or initialize database:", error);
      }
    };

    checkInit();

    return () => {
      if (retryInterval) clearInterval(retryInterval);
    };
  }, []);

  // Load chats & user data in zustand
  const initChatContext = useChatStore((state) => state.init);
  const initUserContext = useUserStore((state) => state.init);
  useEffect(() => {
    if (hasInitialized === true) {
      initChatContext();
      initUserContext();
    }
  }, [initChatContext, initUserContext, hasInitialized]);

  if (hasInitialized === false) {
    return <InitPage />;
  }

  if (hasInitialized === null) {
    return null;
  }

  // For  we always show the detail stack as a full-screen overlay when a detail is open
  if (isSmallScreen) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "transparent", overflow: "hidden" }}
      >
        <TabNavigator isDetailOpen={isDetailOpen} />
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.backgroundMainGradient[1],
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width, 0],
                }),
              },
            ],
            zIndex: 1,
          }}
          pointerEvents={isDetailOpen ? "auto" : "none"}
        >
          <Slot />
        </Animated.View>
      </View>
    );
  }

  // For larger screens, we show the detail stack in a resizable pane on the right
  if (!isStorageReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.backgroundMainGradient[1] }}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        flex: 1,
        backgroundColor: theme.backgroundMainGradient[1],
      }}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <TabNavigator isDetailOpen={isDetailOpen} />
      </View>
      <View
        style={{
          width: detailWidth,
          position: "relative",
        }}
      >
        <View
          //@ts-ignore
          style={{
            position: "absolute",
            left: -10,
            top: 0,
            bottom: 0,
            width: 20,
            backgroundColor: "transparent",
            cursor: "ew-resize",
            zIndex: 10,
          }}
          {...resizerHandlers}
        />
        <Slot />
      </View>
    </View>
  );
}
