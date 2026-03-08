import { getPlatform } from "@/src/utils/device/type";
import { useScreen } from "@/context/ScreenContext";

const useMessageGestures = (
  setTriggeredMessage,
  setTriggeredMessagePosition,
  selectedMessage,
  setSelectedMessage,
  replyToMessage,
  reactionToMessage,
) => {
  const { isSmallScreen } = useScreen();
  const platform = getPlatform();

  const isSelectionMode = selectedMessage.length > 0;

  // Opens action menu
  const onMessageRightPress = async (event, message) => {
    // In selection mode, right press should do nothing
    if (isSelectionMode) return;

    setTriggeredMessage(message);
    setTriggeredMessagePosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  };

  // Opens action menu (not on desktop)
  const onMessagePress = async (event, message) => {
    // If there are already selected messages, it means the user is trying to select/deselect this message, not open the action menu
    if (isSelectionMode) {
      onMessageLongPress(event, message);
      return;
    }

    if (platform === "desktop") return;
    if (platform === "web" && !isSmallScreen) return;

    setTriggeredMessage(message);
    setTriggeredMessagePosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  };

  // Quick reaction (mobile)
  // Reply (desktop)
  const onMessageDoublePress = async (event, message) => {
    // If there are already selected messages, it means the user is trying to select/deselect this message, do nothing
    if (isSelectionMode) {
      return;
    }
    if (platform === "mobile" || (platform === "web" && isSmallScreen)) {
      // Reaction
      reactionToMessage(message);
    } else {
      // Reply
      replyToMessage(message);
    }
  };

  // Select message (desktop and mobile)
  const onMessageLongPress = async (event, message) => {
    setSelectedMessage((prev) => {
      if (prev.some((msg) => msg.id === message.id)) {
        return prev.filter((msg) => msg.id !== message.id);
      } else {
        return [...prev, message];
      }
    });
  };

  return {
    onMessageRightPress,
    onMessagePress,
    onMessageDoublePress,
    onMessageLongPress,
  };
};

export default useMessageGestures;
