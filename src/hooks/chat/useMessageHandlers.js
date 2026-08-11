import { useCallback, useContext } from "react";

import { useActiveChatStore } from "@/src/store/ActiveChatStore";
import useUserStore from "@/src/store/UserStore";

import queueManager from "@/src/utils/chat/queueManager";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

import { defaultMimeType } from "@/src/utils/storage/file/type";

const useMessageHandlers = (
  setNewMessageText,
  setEditingMessage,
  textInputRef,
) => {
  const chatUUID = useActiveChatStore((state) => state.selectedChatUUID);
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const activeChatData = useActiveChatStore((state) => state.activeChatData);

  const myUUID = useUserStore((state) => state.localUserUUID);

  const focusTextInput = useCallback(() => {
    // Do not remove timeout, without it the focus is not possible.
    setTimeout(() => {
      textInputRef?.current?.focus();
    }, 0);
  }, [textInputRef]);

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
        subID: selectedSub,
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
      focusTextInput();
    },
    [
      chatUUID,
      selectedSub,
      myUUID,
      setNewMessageText,
      activeChatData,
      focusTextInput,
    ],
  );

  const handleReadMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.read(
        chatUUID,
        selectedSub,
        messageID,
      );
      if (response.success && response.readAt) {
        await eventEmitter.message.update(
          chatUUID,
          selectedSub,
          messageID,
          "read",
          response.chatEventID,
          {
            readAt: response.readAt,
            userUUID: myUUID,
          },
        );
      }
    },
    [chatUUID, selectedSub, myUUID],
  );

  const handlePinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.add(
        chatUUID,
        selectedSub,
        messageID,
      );
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          selectedSub,
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
    [chatUUID, selectedSub, myUUID],
  );

  const handleUnpinMessage = useCallback(
    async (messageID) => {
      const response = await gateway.message.pin.remove(
        chatUUID,
        selectedSub,
        messageID,
      );
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          selectedSub,
          messageID,
          "pin_remove",
          response.chatEventID,
          {},
        );
      }
    },
    [chatUUID, selectedSub],
  );

  const handleDeleteMessage = useCallback(
    async (messageID) => {
      console.log(messageID, chatUUID, selectedSub);
      const response = await gateway.message.delete(
        chatUUID,
        selectedSub,
        messageID,
      );
      if (response.success) {
        await eventEmitter.message.update(
          chatUUID,
          selectedSub,
          messageID,
          "delete",
          response.chatEventID,
          {},
        );
      }
    },
    [chatUUID, selectedSub],
  );

  const handlePausePendingMessage = useCallback(async (messageID) => {
    return queueManager.pauseJob(messageID);
  }, []);

  const handleUpdatePendingMessage = useCallback(
    async (messageID, content) => {
      const success = queueManager.resumeAndModifyJob(messageID, content);
      if (success) {
        await eventEmitter.message.update(
          chatUUID,
          selectedSub,
          messageID,
          "edit",
          null,
          {
            content,
            pendingEditJobId: null,
          },
        );
        setEditingMessage(null);
        setNewMessageText("");
        focusTextInput();
      }
      return success;
    },
    [
      chatUUID,
      selectedSub,
      setEditingMessage,
      setNewMessageText,
      focusTextInput,
    ],
  );

  const handleEditMessage = useCallback(
    async (messageID, content, originalContent) => {
      const { v6 } = require("uuid");
      const jobId = v6();
      const messageParams = { subID: selectedSub, messageID, content, originalContent };
      const chat = { uuid: chatUUID };

      await queueManager.addOutgoingMessageJob(
        messageParams,
        chat,
        jobId,
        "PENDING_MODIFY",
      );

      await eventEmitter.message.update(
        chatUUID,
        selectedSub,
        messageID,
        "edit",
        null,
        {
          content,
          pendingEditJobId: jobId,
        },
      );

      setEditingMessage(null);
      setNewMessageText("");
      focusTextInput();
    },
    [
      chatUUID,
      selectedSub,
      setEditingMessage,
      setNewMessageText,
      focusTextInput,
    ],
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
          selectedSub,
          message.id,
          emoji,
        );
        if (response.success) {
          await eventEmitter.message.update(
            chatUUID,
            selectedSub,
            message.id,
            "reaction_remove",
            response.chatEventID,
            { userUUID: myUUID, reaction: emoji },
          );
        }
      } else {
        const response = await gateway.message.reaction.add(
          chatUUID,
          selectedSub,
          message.id,
          emoji,
        );
        if (response.success) {
          await eventEmitter.message.update(
            chatUUID,
            selectedSub,
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
    [chatUUID, selectedSub, myUUID],
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
