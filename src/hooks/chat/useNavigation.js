import { detailsNavigator } from "@/src/utils/navigation/ref";

const useNavigation = () => {
  const navigateToChat = (chatUUID) => {
    detailsNavigator.navigate("chat", { chatUUIDorHandle: chatUUID });
  };
  const navigateToMessage = (chatUUID, messageID) => {
    detailsNavigator.navigate("chat", {
      chatUUIDorHandle: chatUUID,
      messageID,
      t: Date.now(),
    });
  };
  const navigateToMessageWithHistory = (
    chatUUID,
    messageID,
    oldChatUUID,
    oldMessageID,
  ) => {
    detailsNavigator.navigate("chat", {
      chatUUIDorHandle: chatUUID,
      messageID,
      oldChatUUID,
      oldMessageID,
      t: Date.now(),
    });
  };
  return {
    navigateToChat,
    navigateToMessage,
    navigateToMessageWithHistory,
  };
};

export default useNavigation;
