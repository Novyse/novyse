import { useState, useEffect } from "react";
import Database from "@/src/utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";
import chatUtils from "@/src/utils/chat";

import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import SocketIO from "@/src/utils/backend-services/socket-io";

const useChatData = (chatUUID, chatHandle = null) => {
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
          const pendingMessage =
            await database.getPendingMessagesByChatUUID(chatUUID);
          messages.push(...pendingMessage);

          messages.push({
            id: "fsahjfsdajhfsdajhdfashjsdaf",
            chatUUID,
            senderUUID: "asddsa",
            content: "This is a system message.",
            type: "message",
            files: [
              {
                uuid: "file-uuid-1234",
                name: "example.ogg",
                size: 1024,
                mimeType: "audio/ogg",
                uri: "http://webaudioapi.com/samples/audio-tag/chrono.mp3",
              },
              {
                uuid: "file-uuid-1234"  ,
                name: "example.ogg",
                size: 1024,
                mimeType: "audio/ogg",
                uri: "http://webaudioapi.com/samples/audio-tag/chrono.mp3",
              },
              {
                uuid: "file-uuid-5678",
                name: "image.png",
                size: 2048,
                mimeType: "image/png",
                uri: "https://picsum.photos/200",
              },
              {
                uuid: "file-uuid-5678",
                name: "image.png",
                size: 2048,
                mimeType: "image/png",
                uri: "https://picsum.photos/200",
              },
              {
                uuid: "file-uuid-5678",
                name: "image.png",
                size: 2048,
                mimeType: "image/png",
                uri: "https://picsum.photos/200",
              },
              {
                uuid: "file-uuid-1234",
                name: "example.ogg",
                size: 1024,
                mimeType: "audio/ogg",
                uri: "http://webaudioapi.com/samples/audio-tag/chrono.mp3",
              },
                            {
                uuid: "file-uuid-5678",
                name: "image.png",
                size: 2048,
                mimeType: "text/plain",
                uri: "https://picsum.photos/200",
              },
                            {
                uuid: "file-uuid-5678",
                name: "image.png",
                size: -2078899848,
                mimeType: "text/plain",
                uri: "https://picsum.photos/200",
              },
            ],
          });

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

    eventEmitter.getEmitter().on("newMessage", handleNewMessage);

    return () => {
      if (SocketIO.send()) {
        SocketIO.send().unsubscribe();
      }

      eventEmitter.getEmitter().off("newMessage", handleNewMessage);
    };
  }, [chatUUID, chatHandle]);

  return { chat, messages, setMessages, loading, error };
};

export default useChatData;
