import { router } from "expo-router";

const useNavigation = () => {
  const navigateToChat = (chatUUID) => {
    router.push({
      pathname: `/app/chat/${chatUUID}`,
    });
  };
  const navigateToMessage = (chatUUID, messageID) => {
    router.push({
      pathname: `/app/chat/${chatUUID}/${messageID}`,
    });
  };
  const navigateToMessageWithHistory = (
    chatUUID,
    messageID,
    oldChatUUID,
    oldMessageID,
  ) => {
    // Note: oldChatUUID and oldMessageID are historically used for "jump back"
    // We keep them as params for now if needed, but path is the priority
    router.push({
      pathname: `/app/chat/${chatUUID}/${messageID}`,
      params: {
        oldChatUUID,
        oldMessageID,
        t: Date.now(),
      },
    });
  };
  return {
    navigateToChat,
    navigateToMessage,
    navigateToMessageWithHistory,
  };
};

export default useNavigation;
