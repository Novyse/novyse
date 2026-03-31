import { useCallback } from "react";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitterInstance from "../../utils/global/Events/EventEmitter.js";
import useChatStore from "@/context/ChatContext";

const useChatPin = () => {
  const pinnedChats = useChatStore((state) => state.pinnedChats);

  const pinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      await eventEmitterInstance.chat.update(chat.chatUUID, "pin_add", {
        position: chat.position,
      });
    }
    for (const chat of chats) {
      await gateway.chat.pin.add(chat.chatUUID, chat.position);
    }
  }, []);

  const unpinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      await eventEmitterInstance.chat.update(chat.chatUUID, "pin_remove");
    }
    for (const chat of chats) {
      await gateway.chat.pin.remove(chat.chatUUID);
    }
  }, []);

  return {
    pinnedChats,
    pinChats,
    unpinChats,
  };
};

export default useChatPin;
