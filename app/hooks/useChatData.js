import { useState, useEffect } from "react";
import Database from "../utils/storage/database";
import gateway from "../utils/backend-services/api-gateway";
import chatUtils from "../utils/chat";

const useChatData = (chatUUID, chatHandle = null) => {
  const [chat, setChat] = useState({});
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setChat({});
        setMessages({});

        if (chatUUID) {
          const database = await Database.create();
          const messages = await database.getMessagesByChatUUID(chatUUID);
          const chat = await database.getChatByUUID(chatUUID);
          const { name, profilePictureUUID } =
            await chatUtils.getChatNameAndProfilePicture(chat);
          setChat((prev) => ({
            uuid: chat.uuid,
            handle: chat.handle || chatHandle,
            name,
            type: chat.type,
            profilePictureUUID,
          }));
          setMessages((prev) => ({ messages }));
        } else {
          if (chatHandle) {
            const { success, data } = await gateway.gather.handle(chatHandle);
            if (success) {
              const { type, profilePictureUUID } = data;
              let name = "Unknown";

              switch (type) {
                case "USER":
                  name = `${data.name} ${data.surname}`;
                  break;
                case "GROUP":
                case "CHANNEL":
                case "FORUM":
                  name = data.name;
                  setMessages((prev) => ({
                    ...prev,
                    messages: data.messages || [],
                  }));
                  break;
                case "BOT":
                  name = data.name;
                  break;
                default:
                  name = "Unknown";
              }

              setChat((prev) => ({
                uuid: null,
                handle: chatHandle,
                name,
                type,
                profilePictureUUID,
              }));
            }
          }
        }
        console.log("[useChatData] Loaded chat data and messages", {
          chat,
          messages,
          chatUUID,
          chatHandle,
        });
      } catch (err) {
        console.error("Error loading messages:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [chatUUID, chatHandle]);

  return { chat, messages, loading, error };
};

export default useChatData;
