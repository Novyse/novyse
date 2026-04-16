import React, { useState, useEffect, useRef } from "react";
import { View, useWindowDimensions, Animated } from "react-native";
import { Slot, usePathname } from "expo-router";

import { useThemeContext } from "@/context/ThemeContext";

import TabNavigator from "@/src/components/tabs/TabNavigator";

import { useScreen } from "@/context/ScreenContext";
import useChatStore from "@/context/ChatContext";
import useUserStore from "@/context/UserContext";
import useWindowSizeStore from "@/context/WindowSizeContext";
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
  }, [isDetailOpen]);

  const {
    detailWidth,
    setDetailWidth,
    minDetailWidth,
    setMinDetailWidth,
    isStorageReady,
  } = useWindowSizeStore();

  const resizerHandlers = usePanelResizer({
    currentWidth: detailWidth,
    setWidth: setDetailWidth,
    minWidth: minDetailWidth,
    maxWidthPadding: 350,
  });

  useEffect(() => {
    if (detailWidth < minDetailWidth) {
      setDetailWidth(Math.min(width, minDetailWidth));
    }
  }, [minDetailWidth, detailWidth, width, setDetailWidth]);

  // Initialize database if needed
  const [hasInitialized, setHasInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInit = async () => {
      try {
        const initValue = await AsyncStorage.getItem("init");
        if (initValue === "true") {
          try {
            await auth.updateDatabase();
          } catch (updateError) {
            console.warn(
              "Failed to update database, continuing anyway:",
              updateError,
            );
          }
          setHasInitialized(true);
        } else {
          setHasInitialized(false);
          const success = await auth.initializeDatabase();
          if (success) {
            await AsyncStorage.setItem("init", "true");
            setHasInitialized(true);
          }
        }
      } catch (error) {
        console.error("Failed to check or initialize database:", error);
      }
    };

    checkInit();
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
