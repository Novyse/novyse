import React, { useState, useEffect } from "react";
import { View, useWindowDimensions, PanResponder } from "react-native";
import { Slot } from "expo-router";

import { useThemeContext } from "@/context/ThemeContext";

import DetailStack from "@/src/pages/DetailStack";
import { DetailStackProvider } from "@/context/DetailStackContext";

import { useScreen } from "@/context/ScreenContext";
import { useNetworkContext } from "@/context/NetworkContext";
import useResizerStorage from "@/src/hooks/ui/useResizerStorage";

import { detailsNavigator } from "@/src/utils/navigation/ref";
import queueManager from "@/src/utils/chat/queueManager";

export default function RootLayout() {
  // Listen for changes in the detail navigator to update the isDetailOpen state
  const [isDetailOpen, setIsDetailOpen] = useState(!detailsNavigator.isEmpty());
  useEffect(() => {
    const unsubscribe = detailsNavigator.subscribe((isEmpty) => {
      setIsDetailOpen(!isEmpty);
    });
    return unsubscribe;
  }, []);

  // Pan responder for resizing the detail pane on larger screens
  const { isSmallScreen } = useScreen();
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const [minDetailWidth, setMinDetailWidth] = useState(400);

  const [detailWidth, setDetailWidth, isStorageReady] = useResizerStorage(
    "@novyse_layout_detail_width",
    Math.max(minDetailWidth, Math.min(width - 400, width * (2 / 3))),
    minDetailWidth,
  );

  const detailWidthRef = React.useRef(detailWidth);
  const startWidthRef = React.useRef(detailWidth);

  useEffect(() => {
    detailWidthRef.current = detailWidth;
  }, [detailWidth]);

  useEffect(() => {
    setDetailWidth((prev: number) =>
      Math.max(minDetailWidth, Math.min(width - 400, prev)),
    );
  }, [width, minDetailWidth, setDetailWidth]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startWidthRef.current = detailWidthRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (evt, gestureState) => {
          setDetailWidth(
            Math.max(
              minDetailWidth,
              Math.min(width - 350, startWidthRef.current - gestureState.dx),
            ),
          );
        },
      }),
    [width, minDetailWidth],
  );

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

  // For small screens, we always show the detail stack as a full-screen overlay when a detail is open
  if (isSmallScreen) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.backgroundMainGradient[1] }}
      >
        <Slot />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: isDetailOpen ? 1 : -1,
          }}
        >
          <DetailStackProvider>
            <DetailStack />
          </DetailStackProvider>
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
        <Slot />
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
          }}
          {...panResponder.panHandlers}
        />
        <DetailStackProvider
          setDetailWidth={setDetailWidth}
          setMinDetailWidth={setMinDetailWidth}
        >
          <DetailStack />
        </DetailStackProvider>
      </View>
    </View>
  );
}
