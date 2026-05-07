import { useCallback, useContext } from "react";

import { useActiveChatStore } from "@/context/ActiveChatContext";
import useUserStore from "@/context/UserContext";

import queueManager from "@/src/utils/chat/queueManager.js";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

import { defaultMimeType } from "@/src/utils/storage/file/type.js";

const useMessageHandlers = (setNewMessageText, setEditingMessage) => {
  const chatUUID = useActiveChatStore((state) => state.selectedChatUUID);
  const activeChatData = useActiveChatStore((state) => state.activeChatData);
  const myUUID = useUserStore((state) => state.localUserUUID);

  const handleSendMessage = useCallback(
    async (type = "message", content, files = [], replyTos = []) => {
      // no content and files, so nothing happens
      if (content.trim() === "" && files.length === 0) return;

      if (files.length > 0) {
        const { v6 } = require("uuid");
        const cleanedFiles = files.map((file) => ({
          uri: file.uri,
          uuid: file.uuid || v6(),
          name: file.name || file.fileName || "novyse_file_" + Date.now(),
          mimeType:
            file.mimeType && file.mimeType !== ""
              ? file.mimeType
              : defaultMimeType,
          size: file.size,
        }));
        files = cleanedFiles;
      }

      const message = {
        senderUUID: myUUID,
        content,
        type,
        replyTos,
        files,
      };

      const chat = {
        uuid: chatUUID,
        memberUUIDs: !chatUUID
          ? activeChatData?.members?.map((m) => m.uuid)
          : undefined,
      };

      await queueManager.addOutgoingMessageJob(message, chat);

      setNewMessageText("");
    },
    [chatUUID, myUUID, setNewMessageText, activeChatData],
  );

  const handleReadMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.read(chatUUID, messageID);
      if (response.success && response.readAt) {
        await eventEmitter.message.read(
          chatUUID,
          messageID,
          myUUID,
          response.readAt,
        );
      }
    },
    [chatUUID],
  );

  const handlePinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.add(chatUUID, messageID);
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          messageID,
          "pin_add",
          response.chatEventID,
          {
            pinnedAt: response.pinnedAt,
            userUUID: myUUID,
          },
        );
      }
    },
    [chatUUID, myUUID],
  );

  const handleUnpinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.remove(chatUUID, messageID);
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          messageID,
          "pin_remove",
          response.chatEventID,
          {},
        );
      }
    },
    [chatUUID],
  );

  const handleDeleteMessage = useCallback(
    async (messageID) => {
      console.log(messageID, chatUUID);
      const response = await gateway.message.delete(chatUUID, messageID);
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          messageID,
          "delete",
          response.chatEventID,
          {},
        );
      }
    },
    [chatUUID],
  );

  const handlePausePendingMessage = useCallback(async (messageID) => {
    return queueManager.pauseJob(messageID);
  }, []);

  const handleUpdatePendingMessage = useCallback(
    async (messageID, content) => {
      const success = queueManager.resumeAndModifyJob(messageID, content);
      if (success) {
        await eventEmitter.message.update(chatUUID, messageID, "edit", null, {
          content,
          pendingEditJobId: null,
        });
        setEditingMessage(null);
        setNewMessageText("");
      }
      return success;
    },
    [chatUUID, setEditingMessage, setNewMessageText],
  );

  const handleEditMessage = useCallback(
    async (messageID, content, originalContent) => {
      const { v6 } = require("uuid");
      const jobId = v6();
      const messageParams = { messageID, content, originalContent };
      const chat = { uuid: chatUUID };

      await queueManager.addOutgoingMessageJob(
        messageParams,
        chat,
        jobId,
        "PENDING_MODIFY",
      );

      await eventEmitter.message.update(chatUUID, messageID, "edit", null, {
        content,
        pendingEditJobId: jobId,
      });

      setEditingMessage(null);
      setNewMessageText("");
    },
    [chatUUID, setEditingMessage, setNewMessageText],
  );

  const handleCancelJob = useCallback(
    async (message) => {
      const jobId = message.internal ? message.id : message.pendingEditJobId;
      if (jobId) {
        await queueManager.cancelJob(jobId, chatUUID);
      }
    },
    [chatUUID],
  );

  const handleReaction = useCallback(
    async (message, emoji = "❤") => {
      const existingReaction = message.reactions?.find(
        (r) => r.emoji === emoji,
      );
      const hasReacted = existingReaction?.userUUIDs?.includes(myUUID);

      if (hasReacted) {
        const response = await gateway.message.reaction.remove(
          chatUUID,
          message.id,
          emoji,
        );
        if (response.success) {
          await eventEmitter.message.update(
            chatUUID,
            message.id,
            "reaction_remove",
            response.chatEventID,
            { userUUID: myUUID, reaction: emoji },
          );
        }
      } else {
        const response = await gateway.message.reaction.add(
          chatUUID,
          message.id,
          emoji,
        );
        if (response.success) {
          await eventEmitter.message.update(
            chatUUID,
            message.id,
            "reaction_add",
            response.chatEventID,
            {
              userUUID: myUUID,
              reaction: emoji,
              reactedAt: response.reactedAt,
            },
          );
        }
      }
    },
    [chatUUID, myUUID],
  );

  return {
    handleSendMessage,
    handleReadMessage,
    handlePinMessage,
    handleUnpinMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleCancelJob,
    handleReaction,
    handlePausePendingMessage,
    handleUpdatePendingMessage,
  };
};

export default useMessageHandlers;
