import React, { useState, useEffect } from "react";
import { View, useWindowDimensions, PanResponder } from "react-native";
import { Slot } from "expo-router";

import DetailStack from "@/src/components/app/DetailStack";
import { DetailStackProvider } from "@/context/DetailStackContext";

import { useScreen } from "@/context/ScreenContext";
import { useNetworkContext } from "@/context/NetworkContext";

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
  const { width } = useWindowDimensions();
  const [detailWidth, setDetailWidth] = useState(
    Math.max(400, Math.min(width - 400, width * (2 / 3))),
  );

  useEffect(() => {
    setDetailWidth(Math.max(400, Math.min(width - 400, width * (2 / 3))));
  }, [width]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (evt, gestureState) => {
      setDetailWidth((prev) =>
        Math.max(400, Math.min(width - 400, prev - gestureState.dx)),
      );
    },
  });

  // Listen for network connectivity changes to trigger queue manager retries
  const { isConnected } = useNetworkContext();

  useEffect(() => {
    queueManager.initialize(() => isConnected);
  }, [isConnected]);

  // For small screens, we always show the detail stack as a full-screen overlay when a detail is open
  if (isSmallScreen) {
    return (
      <View style={{ flex: 1 }}>
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
  return (
    <View
      style={{
        flexDirection: "row",
        flex: 1,
      }}
    >
      <View style={{ flex: 1 }}>
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
        <DetailStackProvider>
          <DetailStack />
        </DetailStackProvider>
      </View>
    </View>
  );
}
