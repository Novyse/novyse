import { useEffect } from "react";
import { BackHandler } from "react-native";
import { router } from "expo-router";

import { getActiveTabName } from "@/src/components/tabs/TabNavigator";
import { tabNavigator } from "@/src/utils/navigation/tabRef";

/**
 * Centralizes Android / gesture back on mobile so detail routes (chat, settings, …)
 * are popped before the independent tab navigator handles the event.
 */
export default function useMobileBackHandler(
  enabled: boolean,
  isDetailOpen: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const onBackPress = () => {
      if (isDetailOpen) {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        return false;
      }

      const tab = getActiveTabName();
      if (tab && tab !== "ChatList") {
        tabNavigator.navigate("ChatList");
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [enabled, isDetailOpen]);
}
