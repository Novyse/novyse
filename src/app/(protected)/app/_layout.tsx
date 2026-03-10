import React, { useState, useEffect, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { Slot, usePathname } from "expo-router";

import { useThemeContext } from "@/context/ThemeContext";

import TabNavigator from "@/src/components/tabs/TabNavigator";

import { useScreen } from "@/context/ScreenContext";
import { useNetworkContext } from "@/context/NetworkContext";
import useChatStore from "@/context/ChatContext";
import useUserStore from "@/context/UserContext";
import useWindowSizeStore from "@/context/WindowSizeContext";
import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import { tabNavigator } from "@/src/utils/navigation/tabRef";

import queueManager from "@/src/utils/chat/queueManager";

import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@/src/utils/welcome/auth";

import InitPage from "@/src/components/pages/InitPage";

export default function RootLayout() {
  // Listen for Expo Router pathname changes to determine if a detail is open
  // With flat structure, detail is open if path is NOT /app and NOT /app/
  const pathname = usePathname();
  const isDetailOpen = pathname !== "/app" && pathname !== "/app/";
  const prevPathnameRef = useRef(pathname);

  // @SamueleOrazioDurante da testare
  // Sync tab navigator with Expo Router pathname
  // This ensures that when navigating back (e.g.   Android swipe-back),
  // the tab navigator switches to the correct tab
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // When we leave a detail route back to /app, switch tab to match
    // what the user was viewing before
    if (pathname === "/app" || pathname === "/app/") {
      // User just navigated back to the root — switch tab based on
      // what detail route they were on before
      if (prevPathname.includes("/settings")) {
        tabNavigator.navigate("Settings");
      } else if (prevPathname.includes("/chat")) {
        tabNavigator.navigate("ChatList");
      }
    }
  }, [pathname]);

  // Pan responder for resizing the detail pane on larger screens
  const { isSmallScreen } = useScreen();
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();

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

  // Listen for network connectivity changes to trigger queue manager retries
  const { isConnected } = useNetworkContext();

  useEffect(() => {
    queueManager.initialize(() => isConnected);
  }, [isConnected]);

  // Initialize database if needed
  const [hasInitialized, setHasInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInit = async () => {
      try {
        const initValue = await AsyncStorage.getItem("init");
        if (initValue === "true") {
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
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <TabNavigator />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.backgroundMainGradient[1],
            zIndex: isDetailOpen ? 1 : -1,
          }}
        >
          <Slot />
        </View>
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
        <TabNavigator />
      </View>
      <View
        style={{
          width: detailWidth,
          position: "relative",
        }}
      >
        <View
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
