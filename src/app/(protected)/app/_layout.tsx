import React, { useState, useEffect, useRef } from "react";
import { View, useWindowDimensions, Animated } from "react-native";
import { Slot, usePathname } from "expo-router";

import { useThemeContext } from "@/src/context/ThemeContext";

import TabNavigator, {
  getActiveTabName,
} from "@/src/components/tabs/TabNavigator";
import { useScreen } from "@/src/context/ScreenContext";
import useChatStore from "@/src/context/ChatContext";
import useUserStore from "@/src/context/UserContext";
import useWindowSizeStore, {
  SIDEBAR_MIN,
  SIDEBAR_COLLAPSED,
} from "@/src/context/WindowSizeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useNetworkStore from "@/src/context/NetworkContext";

import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import useMobileBackHandler from "@/src/hooks/layout/useMobileBackHandler";
import PanelResizeHandle from "@/src/components/layout/PanelResizeHandle";

import AsyncStorage from "@react-native-async-storage/async-storage";
import SocketIO from "@/src/utils/backend-services/socket-io";
import auth from "@/src/utils/welcome/auth";

import InitPage from "@/src/components/pages/InitPage";
import StartupManager from "@/src/components/layout/StartupManager";

export default function RootLayout() {
  // Listen for Expo Router pathname changes to determine if a detail is open
  // With flat structure, detail is open if path is NOT /app and NOT /app/
  const pathname = usePathname();
  const isDetailOpen = pathname !== "/app" && pathname !== "/app/";
  // Pan responder for resizing the detail pane on larger screens
  const { isSmallScreen } = useScreen();
  useMobileBackHandler(isSmallScreen, isDetailOpen);
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDetailOpen ? 1 : 0,
      useNativeDriver: true,
      damping: 24,
      stiffness: 180,
      mass: 0.8,
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
    isSidebarCollapsed,
    setSidebarCollapsed,
    isStorageReady,
  } = useWindowSizeStore();

  const tab = getActiveTabName();
  const onChatList = !tab || tab === "ChatList";
  const showCollapsedSidebar =
    isSidebarCollapsed && !isSmallScreen && onChatList;

  const resizerHandlers = usePanelResizer({
    currentWidth: detailWidth,
    setWidth: setDetailWidth,
    minWidth: minDetailWidth,
    maxWidthPadding: SIDEBAR_COLLAPSED + 20,
  });

  useEffect(() => {
    if (isSmallScreen) {
      if (isSidebarCollapsed) setSidebarCollapsed(false);
      return;
    }
    if (!onChatList) return;
    const sidebarWidth = width - detailWidth;
    if (!isSidebarCollapsed && sidebarWidth < SIDEBAR_MIN) {
      setSidebarCollapsed(true);
      setDetailWidth(width - SIDEBAR_COLLAPSED);
    } else if (isSidebarCollapsed && sidebarWidth > SIDEBAR_MIN) {
      setSidebarCollapsed(false);
    }
  }, [
    width,
    detailWidth,
    isSidebarCollapsed,
    isSmallScreen,
    onChatList,
    setSidebarCollapsed,
    setDetailWidth,
  ]);

  const prevWidthRef = useRef(width);
  useEffect(() => {
    if (isSmallScreen) return;

    const delta = width - prevWidthRef.current;
    prevWidthRef.current = width;
    setDetailWidth((prev) => {
      const maxDetail = width - SIDEBAR_COLLAPSED - 20;
      let newWidth = prev;
      if (delta > 0) {
        newWidth = prev + delta;
      }
      return Math.max(minDetailWidth, Math.min(maxDetail, newWidth));
    });
  }, [width, minDetailWidth, setDetailWidth, isSmallScreen]);

  // Initialize database if needed
  const [hasInitialized, setHasInitialized] = useState<boolean | null>(null);
  const initChatContext = useChatStore((state) => state.init);
  const initUserContext = useUserStore((state) => state.init);

  useEffect(() => {
    let retryInterval: any = null;

    const checkInit = async () => {
      try {
        const initValue = await AsyncStorage.getItem("init");
        if (initValue === "true") {
          let updateSuccess = false;
          try {
            await auth.updateDatabase();
            updateSuccess = true;
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

          await Promise.all([initChatContext(), initUserContext()]);

          // If database update was successful initially
          if (updateSuccess) {
            useNetworkStore.getState().setSynced(true);
          }
          setHasInitialized(true);
        } else {
          setHasInitialized(false);
          const success = await auth.initializeDatabase();
          if (success) {
            await AsyncStorage.setItem("init", "true");
            await Promise.all([initChatContext(), initUserContext()]);
            useNetworkStore.getState().setSynced(true);
            setHasInitialized(true);
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
  }, [initChatContext, initUserContext]);

  if (hasInitialized === false) {
    return <InitPage />;
  }

  if (hasInitialized === null) {
    return null;
  }

  // For mobile we always show the detail stack as a full-screen overlay when a detail is open
  if (isSmallScreen) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "transparent", overflow: "hidden" }}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: slideAnim.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [1, 0, 0],
            }),
          }}
          pointerEvents={isDetailOpen ? "none" : "auto"}
        >
          <TabNavigator />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "transparent",
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
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  const currentSidebarWidth = showCollapsedSidebar
    ? SIDEBAR_COLLAPSED
    : onChatList
      ? width - detailWidth
      : Math.max(width - detailWidth, SIDEBAR_MIN);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        backgroundColor: "transparent",
      }}
    >
      <StartupManager />
      <View
        style={{
          width: currentSidebarWidth,
          height: "100%",
          padding: 10,
          paddingHorizontal: showCollapsedSidebar ? 5 : 10,
          backgroundColor: "transparent",
        }}
      >
        <TabNavigator />
      </View>

      <View
        style={{
          width: width - currentSidebarWidth,
          height: "100%",
          position: "relative",
        }}
      >
        <PanelResizeHandle panHandlers={resizerHandlers} />
        <Slot />
      </View>
    </View>
  );
}
