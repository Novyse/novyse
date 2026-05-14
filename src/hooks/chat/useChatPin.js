import { useCallback } from "react";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "../../utils/global/Events/EventEmitter";
import useChatStore from "@/src/context/ChatContext";

const useChatPin = () => {
  const pinnedChats = useChatStore((state) => state.pinnedChats);

  const pinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      await eventEmitter.user.setting.chat.update(
        chat.chatUUID,
        "pin_add",
        null,
        {
          position: chat.position,
        },
      );
    }
    for (const chat of chats) {
      const response = await gateway.chat.pin.add(chat.chatUUID, chat.position);
      if (response.success) {
        await eventEmitter.user.setting.chat.update(
          chat.chatUUID,
          "pin_add",
          response.userEventID,
          { position: chat.position },
        );
      }
    }
  }, []);

  const unpinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      await eventEmitter.user.setting.chat.update(
        chat.chatUUID,
        "pin_remove",
        null,
        {},
      );
    }
    for (const chat of chats) {
      const response = await gateway.chat.pin.remove(chat.chatUUID);
      if (response.success) {
        await eventEmitter.user.setting.chat.update(
          chat.chatUUID,
          "pin_remove",
          response.userEventID,
          {},
        );
      }
    }
  }, []);

  return {
    pinnedChats,
    pinChats,
    unpinChats,
  };
};

export default useChatPin;
