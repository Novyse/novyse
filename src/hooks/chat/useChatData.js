import { useState, useEffect, useContext } from "react";
import Database from "@/src/utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";
import chatUtils from "@/src/utils/chat";

import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import SocketIO from "@/src/utils/backend-services/socket-io";
import { UserContext } from "@/context/UserContext";

const useChatData = (chatUUID, chatHandle = null) => {
  const { userUUID } = useContext(UserContext);
  const [chat, setChat] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setChat({});
        setMessages([]);

        if (chatUUID) {
          const database = await Database.create();
          const messages = await database.getMessagesByChatUUID(chatUUID);
          const pendingMessage = await database.getPendingMessagesByChatUUID(
            chatUUID
          );
          messages.push(...pendingMessage);

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
          setMessages((prev) => messages.reverse());
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
                  setMessages(data.messages.reverse() || []);
                  SocketIO.send().subscribe(handle);
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

    const handleNewMessage = (message) => {
      if (message.chatUUID !== chatUUID && message.chatHandle !== chatHandle)
        return;
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === message.id)) {
          return prevMessages;
        }
        return [message, ...prevMessages];
      });
    };

    const handleMessageUploading = ({ tempId, message }) => {
      setMessages((currentMessages) => {
        return currentMessages.map((msg) =>
          msg.id === tempId ? { ...message, id: message.messageUUID } : msg
        );
      });
    };

    const handleFileDownloaded = async ({ message, file }) => {
      if (message.chatUUID !== chatUUID && message.chatHandle !== chatHandle)
        return;
      setMessages((currentMessages) => {
        return currentMessages.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                files: msg.files.map((f) => (f.uuid === file.uuid ? file : f)),
              }
            : msg
        );
      });
    };

    const handleMessageSent = ({ tempId, message }) => {
      setMessages((currentMessages) => {
        // Remove any existing message with the same id as the new message
        const filteredMessages = currentMessages.filter(
          (msg) => msg.id !== message.id
        );
        // Then replace the tempId with the new message, setting only id and timestamp, rest undefined
        return filteredMessages.map((msg) =>
          msg.id === tempId
            ? { ...msg, id: message.id, created_at: message.created_at }
            : msg
        );
      });
    };

    eventEmitter.getEmitter().on("message:new", handleNewMessage);
    eventEmitter.getEmitter().on("message:upload", handleMessageUploading);
    eventEmitter.getEmitter().on("message:downloaded", handleFileDownloaded);
    eventEmitter.getEmitter().on("message:sent", handleMessageSent);

    return () => {
      if (SocketIO.send()) {
        SocketIO.send().unsubscribe();
      }
      eventEmitter.getEmitter().off("message:new", handleNewMessage);
      eventEmitter.getEmitter().off("message:upload", handleMessageUploading);
      eventEmitter.getEmitter().off("message:downloaded", handleFileDownloaded);
      eventEmitter.getEmitter().off("message:sent", handleMessageSent);
    };
  }, [chatUUID, chatHandle]);

  return { chat, messages, setMessages, loading, error };
};

export default useChatData;