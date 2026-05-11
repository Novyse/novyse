import { useCallback } from "react";
import { useForwardStore } from "@/src/context/ForwardContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useUserStore from "@/src/context/UserContext";
import queueManager from "@/src/utils/chat/queueManager";
import { tabNavigator } from "@/src/utils/navigation/tabRef";
import useDownload from "@/src/hooks/file/useDownload";

/**
 * Hook to handle message forwarding logic.
 */
export const useForward = () => {
  const { setForwardMessages, forwardMessages, resetForwarding, isForwarding } =
    useForwardStore();
  const myUUID = useUserStore((state) => state.localUserUUID);
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const { resolveFileRefAndUri } = useDownload();

  /**
   * Starts the forwarding process by storing messages and navigating to ChatList.
   * @param {Array} messages - Array of message objects to forward.
   */
  const startForwarding = useCallback(
    (messages: any[]) => {
      if (!messages || messages.length === 0) return;
      setForwardMessages(messages);
      tabNavigator.navigate("ChatList");
    },
    [setForwardMessages],
  );

  /**
   * Completes the forwarding process by sending messages to the target chat.
   * @param {string} targetChatUUID - UUID of the chat to forward messages to.
   */
  const completeForwarding = useCallback(
    async (targetChatUUID: string) => {
      if (!forwardMessages || forwardMessages.length === 0) return;

      for (const msg of forwardMessages) {
        const resolvedFiles = [];
        if (msg.files && msg.files.length > 0) {
          for (const file of msg.files) {
            const resolved = await resolveFileRefAndUri(file);
            if (resolved) {
              resolvedFiles.push({
                uri: resolved.uri,
                name: resolved.name,
                mimeType: resolved.mimeType,
                size: file.size,
              });
            }
          }
        }

        const message = {
          senderUUID: myUUID,
          content: msg.content || "",
          type: msg.type,
          replyTos: [],
          files: resolvedFiles,
        };

        const chat = {
          uuid: targetChatUUID,
        };

        await queueManager.addOutgoingMessageJob(message, chat);
      }

      resetForwarding();
      await setSelectedChatUUID(targetChatUUID);
    },
    [
      forwardMessages,
      myUUID,
      resetForwarding,
      setSelectedChatUUID,
      resolveFileRefAndUri,
    ],
  );

  return {
    startForwarding,
    completeForwarding,
    isForwarding,
    resetForwarding,
  };
};
