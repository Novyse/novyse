import { useState, useEffect, useContext } from "react";
import database from "@/src/utils/storage/database";
import utils from "@/src/utils/chat";
import { getFileType } from "@/src/utils/storage/file/type";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

import { LocalUserContext } from "@/context/LocalUserContext";

const useChats = () => {
  const [chatDetails, setChatDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);

        const chats = await database.getChats();
        const details = {};
        for (const chat of chats) {
          const lastMessage = await getLastMesssage(chat.uuid);

          const { name,  chatPictureUUID:profilePictureUUID } =
            await utils.getChatNameAndProfilePicture(chat);

          details[chat.uuid] = {
            uuid: chat.uuid,
            name,
            handle: chat.handle,
            type: chat.type,
            profilePictureUUID,
            lastMessage: lastMessage,
          };
        }
        setChatDetails(details);
      } catch (err) {
        console.error("Error loading chats:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadChats();

    const handleNewMessage = async (message) => {
      const chatUUID = message.chatUUID;
      const lastMessage = await formatMessage(message);
      setChatDetails((prevDetails) => {
        if (prevDetails[chatUUID]) {
          return {
            ...prevDetails,
            [chatUUID]: {
              ...prevDetails[chatUUID],
              lastMessage: lastMessage,
            },
          };
        }
        return prevDetails;
      });
    };

    const handleMessageSent = async (data) => {
      const message = data.message;
      await handleNewMessage(message);
    };

    const handleNewChat = async (chat) => {
      const lastMessage = await getLastMesssage(chat.uuid);
      setChatDetails((prevDetails) => ({
        ...prevDetails,
        [chat.uuid]: {
          uuid: chat.uuid,
          name: chat.name,
          handle: chat.handle,
          type: chat.type,
          profilePictureUUID: chat.profilePictureUUID,
          lastMessage: lastMessage,
        },
      }));
    };

    eventEmitter.getEmitter().on("message:new", handleNewMessage);
    eventEmitter.getEmitter().on("message:sent", handleMessageSent);
    eventEmitter.getEmitter().on("newChat", handleNewChat);

    return () => {
      eventEmitter.getEmitter().off("message:new", handleNewMessage);
      eventEmitter.getEmitter().off("message:sent", handleMessageSent);
      eventEmitter.getEmitter().off("newChat", handleNewChat);
    };
  }, []);

  return { chatDetails, loading, error };
};

const getLastMesssage = async (chatUUID) => {
  try {
    const lastMessage = await database.getLastMessage(chatUUID);

    return await formatMessage(lastMessage);
  } catch (error) {
    console.error("Error fetching last message:", error);
    return null;
  }
};

const formatMessage = async (messageRef) => {
  if (!messageRef) return messageRef;

  const message = { ...messageRef };

  if (message && message.type) {
    if (message.type == "system") {
      message.content = await utils.getSystemMessageText(message);
    } else if (message.type == "message") {
      if (!message.content) {
        if (message.files && message.files.length > 0) {
          const types = message.files.map((file) =>
            getFileType(file.mimeType, file.name),
          );
          const uniqueTypes = [...new Set(types)];
          if (uniqueTypes.length === 1) {
            const type = uniqueTypes[0];
            const count = types.length;
            const fileTypeMap = {
              IMAGE: { emoji: "📷", singular: "Image", plural: "Images" },
              VIDEO: { emoji: "📹", singular: "Video", plural: "Videos" },
              AUDIO: { emoji: "🎵", singular: "Audio", plural: "Audios" },
              VOICE: {
                emoji: "🎤",
                singular: "Voice Message",
                plural: "Voice Messages",
              },
              DOCUMENT: {
                emoji: "📄",
                singular: "Document",
                plural: "Documents",
              },
              CODE: {
                emoji: "💻",
                singular: "Code File",
                plural: "Code Files",
              },
              ARCHIVE: {
                emoji: "🗄️",
                singular: "Archive File",
                plural: "Archive Files",
              },
            };
            const { emoji, singular, plural } = fileTypeMap[type] || {
              emoji: "📎",
              singular: "File",
              plural: "Files",
            };
            message.content =
              count === 1
                ? `${emoji} ${singular}`
                : `${count} ${emoji} ${plural}`;
          } else {
            const hasOnlyMedia = uniqueTypes.every(
              (type) => type === "IMAGE" || type === "VIDEO",
            );
            message.content = hasOnlyMedia
              ? `${message.files.length} 📎 Media`
              : `${message.files.length} 📎 Files`;
          }
        }
      }
    }
  }
  return message;
};

export default useChats;
