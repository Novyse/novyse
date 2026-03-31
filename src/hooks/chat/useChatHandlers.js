import { useState, useCallback } from "react";
import { router } from "expo-router";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

const useChatHandlers = (chat, sub) => {
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = useCallback(
    async (setSelectedHandle, setSelectedChatUUID) => {
      if (!chat) return;

      const isUser = chat.type === "USER";

      try {
        setIsJoining(true);
        if (isUser) {
          const {
            success,
            chat: createdChat,
            users: createdUsers,
          } = await gateway.chat.create("DM", [chat.uuid]);
          if (success && createdChat) {
            await eventEmitter.chat.new(createdChat, createdUsers);
            setSelectedHandle(null);
            setSelectedChatUUID(createdChat.uuid);
            router.replace(`/app/chat/${createdChat.uuid}/${sub || 0}`);
          }
        } else {
          const {
            success,
            chat: joinedChat,
            users: joinedUsers,
          } = await gateway.chat.join(chat.handle);
          if (success && joinedChat) {
            await eventEmitter.chat.new(joinedChat, joinedUsers);
            setSelectedHandle(null);
            setSelectedChatUUID(joinedChat.uuid);
            router.replace(`/app/chat/${joinedChat.uuid}/${sub || 0}`);
          }
        }
      } catch (error) {
        console.error("Error performing chat action:", error);
      } finally {
        setIsJoining(false);
      }
    },
    [chat, sub],
  );

  return {
    handleJoin,
    isJoining,
  };
};

export default useChatHandlers;
