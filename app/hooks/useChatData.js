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
          const { name, chatPictureUUID: profilePictureUUID } =
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
            const { success, data } = await gateway.gather.handle(
              chatHandle,
              true
            );
            if (success) {
              const { type, handle, profilePictureUUID } = data;
              let name = "Unknown";
              let member = [];

              switch (type) {
                case "USER":
                  name = `${data.name} ${data.surname}`;
                  member = [data.uuid];
                  break;
                case "GROUP":
                case "CHANNEL":
                case "FORUM":
                  name = data.name;
                  member = data.members || [];
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
                handle,
                name,
                type,
                member,
                profilePictureUUID,
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error loading messages:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [chatUUID, chatHandle]);

  return { chat, messages, setMessages, loading, error };
};

export default useChatData;
