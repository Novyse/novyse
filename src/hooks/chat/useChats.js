import { useState, useEffect } from "react";
import database from "@/src/utils/storage/database";
import utils from "@/src/utils/chat";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import messageUtils from "@/src/utils/chat/messageFormat";

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

          const { name, chatPictureUUID: profilePictureUUID } =
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
      const lastMessage = await messageUtils.format(message);
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

    const handleMessageUpdate = async (data) => {
      const lastMessage = await getLastMesssage(data.chatUUID);
      await handleNewMessage(lastMessage);
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
    eventEmitter.getEmitter().on("message:update", handleMessageUpdate);
    eventEmitter.getEmitter().on("newChat", handleNewChat);

    return () => {
      eventEmitter.getEmitter().off("message:new", handleNewMessage);
      eventEmitter.getEmitter().off("message:sent", handleMessageSent);
      eventEmitter.getEmitter().off("message:update", handleMessageUpdate);
      eventEmitter.getEmitter().off("newChat", handleNewChat);
    };
  }, []);

  return { chatDetails, loading, error };
};

const getLastMesssage = async (chatUUID) => {
  try {
    const lastMessage = await database.getLastMessage(chatUUID);

    return await messageUtils.format(lastMessage);
  } catch (error) {
    console.error("Error fetching last message:", error);
    return null;
  }
};

export default useChats;
