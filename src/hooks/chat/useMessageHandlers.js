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
  setVoiceMessage,
  setIsMicClicked,
  setIsFileModalVisible,
) => {
  const handleSendMessage = useCallback(
    async (type = "message", content, replyTo, files = []) => {
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
        replyTo,
        files,
      };

      await queueManager.addOutgoingMessageJob(message, chat);

      setNewMessageText("");
      setVoiceMessage(true);
      setIsMicClicked(false);
    },
    [chat, setNewMessageText, setVoiceMessage, setIsMicClicked],
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

  const handleEditMessage = useCallback(
    async (messageID, content) => {
      const response = await gateway.message.edit(
        chat.uuid,
        messageID,
        content,
      );
      if (response.success) {
        await eventEmitter.message.update(chat.uuid, messageID, "edit", {
          content,
        });
      }
      setEditingMessage(null);
      setNewMessageText("");
    },
    [chat, setEditingMessage, setNewMessageText],
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
      await handleSendMessage("message", "", undefined, cleanedFiles);
    },
    [handleSendMessage],
  );

  const handleTextChanging = useCallback(
    (text, isMicClicked) => {
      setVoiceMessage(text.length === 0 && !isMicClicked);
    },
    [setVoiceMessage],
  );

  return {
    handleSendMessage,
    handleSendFileMessage,
    handleTextChanging,
    handleDeleteMessage,
    handleEditMessage,
  };
};

export default useMessageHandlers;
