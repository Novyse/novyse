import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InternalPlatform from "@/src/utils/device/type";
import { EmojiPicker } from "./EmojiPicker";
import { StickerPicker } from "./StickerPicker";
import { GifPicker } from "./GifPicker";
import { useThemeContext } from "@/src/context/ThemeContext";
import BlurredView from "@/src/components/BlurredView";
import ToggleSelector from "@/src/components/ToggleSelector";

type TabType = "emoji" | "sticker" | "gif";

interface EmojiMenuOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectResult: (content: string, type: TabType) => void;
}

export const EmojiMenuOverlay: React.FC<EmojiMenuOverlayProps> = ({
  isVisible,
  onClose,
  onSelectResult,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("emoji");
  const { theme } = useThemeContext();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (InternalPlatform !== "mobile") return;
    if (isVisible && !everOpened) setEverOpened(true);
  }, [isVisible, everOpened]);

  const handleClose = () => {
    onClose();
  };

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "emoji":
        return (
          <EmojiPicker
            mode="full"
            onSelectEmoji={(emoji) => {
              onSelectResult(emoji, "emoji");
            }}
          />
        );
      case "sticker":
        return <StickerPicker />;
      case "gif":
        return (
          <GifPicker
            onSelectGif={(url) => {
              onSelectResult(url, "gif");
            }}
          />
        );
      default:
        return null;
    }
  }, [activeTab, onSelectResult]);

  const styles = createStyles(theme, insets, screenWidth, screenHeight);

  // Mobile layout: content + tab selector at bottom
  const MobileInnerContent = (
    <View style={styles.mobileContainer}>
      <View style={styles.contentContainer}>{renderContent()}</View>
      <View style={styles.mobileToggleWrapper}>
        <ToggleSelector
          options={[
            { value: "emoji", label: "Emoji" },
            { value: "sticker", label: "Sticker" },
            { value: "gif", label: "GIF" },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as TabType)}
          buttonWidth={screenWidth < 392 ? 85 : undefined}
        />
      </View>
    </View>
  );

  // Web/Desktop layout: tab selector on TOP, content below
  const WebInnerContent = (
    <View style={styles.container}>
      <View style={styles.toggleWrapper}>
        <ToggleSelector
          options={[
            { value: "emoji", label: "Emoji" },
            { value: "sticker", label: "Sticker" },
            { value: "gif", label: "GIF" },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as TabType)}
          buttonWidth={screenWidth < 392 ? 85 : undefined}
        />
      </View>
      <View style={styles.contentContainer}>{renderContent()}</View>
    </View>
  );

  // Web / Desktop: floating Modal overlay
  if (InternalPlatform === "web" || InternalPlatform === "desktop") {
    if (!isVisible) return null;
    return (
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.webModalOverlay}>
            <TouchableWithoutFeedback>
              <BlurredView style={styles.webContainer}>
                {WebInnerContent}
              </BlurredView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // Mobile: keep content mounted after the first open
  if (!everOpened) return null;

  return MobileInnerContent;
};

const createStyles = (
  theme: any,
  insets: any,
  screenWidth: number,
  screenHeight: number,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      height: "100%",
      width: "100%",
      backgroundColor: "transparent",
    },
    mobileContainer: {
      flex: 1,
      width: "100%",
      backgroundColor: theme.backgroundCard,
    },
    toggleWrapper: {
      paddingHorizontal: 10,
      paddingTop: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    mobileToggleWrapper: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: insets.bottom,
      alignItems: "center",
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
      backgroundColor: theme.backgroundCard,
    },
    contentContainer: {
      flex: 1,
      padding: 0,
    },
    webModalOverlay: {
      flex: 1,
      backgroundColor: "transparent",
    },
    webContainer: {
      position: "absolute",
      right: 16,
      bottom: 70,
      width: screenWidth < 392 ? screenWidth - 32 : 360,
      height: Math.min(460, screenHeight - 100),
      left: screenWidth < 392 ? 16 : undefined,
      borderColor: theme.borderColor,
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 5,
    },
  });
