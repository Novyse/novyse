import { useCallback } from "react";

import queueManager from "@/src/utils/chat/queueManager.js";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

import { defaultMimeType } from "@/src/utils/storage/file/type.js";

const useMessageHandlers = (
  chat,
  myUUID,
  setNewMessageText,
  setEditingMessage,
  setIsMicClicked,
) => {
  const handleSendMessage = useCallback(
    async (type = "message", content, files = [], replyTos = []) => {
      // no content and files, so nothing happens
      if (content.trim() === "" && files.length === 0) return;

      /*
      // If chat is pending creation, remove chat.uuid and put it as job uuid
      if (chat.pendingCreation){
        const id = chat.uuid;
        chat.uuid = null;
        await queueManager.addOutgoingMessageJob(message,chat,id);
        return;
      }
      */
      const message = {
        senderUUID: myUUID,
        content,
        type,
        replyTos,
        files,
      };

      await queueManager.addOutgoingMessageJob(message, chat);

      setNewMessageText("");
      setIsMicClicked(false);
    },
    [chat, setNewMessageText, setIsMicClicked, myUUID],
  );

  const handlePinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.add(chat.uuid, messageID);
      if (response.success) {
        await eventEmitter.message.update(chat.uuid, messageID, "pin_add", {
          pinned_at: response.pinned_at,
          userUUID: myUUID,
        });
      }
    },
    [chat],
  );

  const handleUnpinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.remove(chat.uuid, messageID);
      if (response.success) {
        await eventEmitter.message.update(chat.uuid, messageID, "pin_remove");
      }
    },
    [chat],
  );

  const handleDeleteMessage = useCallback(
    async (messageID) => {
      console.log(messageID, chat.uuid);
      const response = await gateway.message.delete(chat.uuid, messageID);
      if (response.success) {
        await eventEmitter.message.update(chat.uuid, messageID, "delete");
      }
    },
    [chat],
  );

  const handlePausePendingMessage = useCallback(async (messageID) => {
    return queueManager.pauseJob(messageID);
  }, []);

  const handleUpdatePendingMessage = useCallback(
    async (messageID, content) => {
      const success = queueManager.resumeAndModifyJob(messageID, content);
      if (success) {
        await eventEmitter.message.update(chat.uuid, messageID, "edit", {
          content,
          pendingEditJobId: null,
        });
        setEditingMessage(null);
        setNewMessageText("");
      }
      return success;
    },
    [chat.uuid, setEditingMessage, setNewMessageText],
  );

  const handleEditMessage = useCallback(
    async (messageID, content, originalContent) => {
      const { v6 } = require("uuid");
      const jobId = v6();
      const messageParams = { messageID, content, originalContent };

      await queueManager.addOutgoingMessageJob(
        messageParams,
        chat,
        jobId,
        "PENDING_MODIFY",
      );

      await eventEmitter.message.update(chat.uuid, messageID, "edit", {
        content,
        pendingEditJobId: jobId,
      });

      setEditingMessage(null);
      setNewMessageText("");
    },
    [chat, setEditingMessage, setNewMessageText],
  );

  const handleCancelJob = useCallback(
    async (message) => {
      const jobId = message.internal ? message.id : message.pendingEditJobId;
      if (jobId) {
        await queueManager.cancelJob(jobId, chat.uuid);
      }
    },
    [chat],
  );

  const handleReaction = useCallback(
    async (message, emoji = "❤") => {
      const existingReaction = message.reactions?.find(
        (r) => r.emoji === emoji,
      );
      const hasReacted = existingReaction?.userUUIDs?.includes(myUUID);

      if (hasReacted) {
        const success = await gateway.message.reaction.remove(
          chat.uuid,
          message.id,
          emoji,
        );
        if (success) {
          await eventEmitter.message.update(
            chat.uuid,
            message.id,
            "reaction_remove",
            { userUUID: myUUID, reaction: emoji },
          );
        }
      } else {
        const response = await gateway.message.reaction.add(
          chat.uuid,
          message.id,
          emoji,
        );
        if (response.success) {
          await eventEmitter.message.update(
            chat.uuid,
            message.id,
            "reaction_add",
            { userUUID: myUUID, reaction: emoji, at: response.at },
          );
        }
      }
    },
    [chat, myUUID],
  );

  const handleSendFileMessage = useCallback(
    async (files) => {
      if (!files) return;

      const cleanedFiles = files.map((file) => ({
        uri: file.uri,
        name: file.name || file.fileName || "novyse_file_" + Date.now(),
        mimeType:
          file.mimeType && file.mimeType !== ""
            ? file.mimeType
            : defaultMimeType,
        size: file.size,
      }));
      await handleSendMessage("message", "", cleanedFiles, undefined);
    },
    [handleSendMessage],
  );

  return {
    handleSendMessage,
    handleSendFileMessage,
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
