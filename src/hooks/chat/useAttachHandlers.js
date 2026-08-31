import { useState } from "react";
import { Alert } from "react-native";

import Platform from "@/src/utils/device/type";

import { openNativeFileMenu } from "@/src/utils/storage/file/handler";

const useAttachHandlers = (setIsAttachMenuOpen, onStartScreenRecording) => {
  const [attachType, setAttachType] = useState(null);

  const handleMenuItemPress = async (item) => {
    setAttachType(item);
    switch (item) {
      case "Media":
      case "File":
        return await handleFilePick(item);
      case "Recording":
        _closeFileMenu();
        onStartScreenRecording();
        return null;
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

  const handleFilePick = async (type) => {
    _closeFileMenu();

    switch (Platform) {
      case "web":
        return await openNativeFileMenu(type);
      case "mobile":
        return await openNativeFileMenu(type);
      case "desktop":
        return await openNativeFileMenu(type);
      default:
        console.warn("Unsupported platform for file picking");
    }
  };

  const _closeFileMenu = async () => {
    setIsAttachMenuOpen?.(false);
  };

  return {
    attachType,
    handleMenuItemPress,
    handleFilePick,
  };
};

export default useAttachHandlers;
