import { useCallback } from "react";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

const useChatHandlers = (selectedHandle, setSelectedChatUUID) => {
  const handleJoin = useCallback(async () => {
    const response = await gateway.chat.join(selectedHandle);
    const success = response.success;
    if (success) {
      const newChat = response.chat;
      const newMessages = response.messages;
      console.log("Chat joined successfully:", newChat);
      await eventEmitter.newChat(newChat, newMessages);
      setSelectedChatUUID(newChat.uuid);
    } else {
      console.error("Failed to join chat");
    }
  }, [selectedHandle, setSelectedChatUUID]);

  return {
    handleJoin,
  };
};

export default useChatHandlers;
