import { useState } from "react";
import { Alert } from "react-native";

import { getPlatform } from "@/src/utils/device/type";

import { openNativeFileMenu } from "@/src/utils/storage/file/handler.js";

const useAttachHandlers = (
  setIsAttachMenuOpen,
  setSheetIndex,
  bottomSheetRef,
) => {
  const [attachType, setAttachType] = useState(null);

  const handleMenuItemPress = async (item) => {
    setAttachType(item);
    switch (item) {
      case "Media":
      case "File":
        return await handleFilePick(item);
      case "Camera":
      case "Location":
      case "Todo":
        Alert.alert(
          "Not implemented",
          `${item} attachment is not implemented yet.`,
        );
        break;
      default:
        console.warn("Unknown menu item:", item);
    }
  };

  const handleFilePick = async (type, forced = false) => {
    if (forced) {
      return await openNativeFileMenu(type);
    }

    _closeFileMenu();

    switch (getPlatform()) {
      case "web":
        return await openNativeFileMenu(type);
      case "mobile":
        return await openNativeFileMenu(type);
      default:
        console.warn("Unsupported platform for file picking");
    }
  };

  const _closeFileMenu = async () => {
    // Close menu after action
    setIsAttachMenuOpen(false);
    if (getPlatform() === "web") {
      setSheetIndex(-1);
    } else {
      bottomSheetRef.current?.close();
    }
  };

  return {
    attachType,
    handleMenuItemPress,
    handleFilePick,
  };
};

export default useAttachHandlers;
