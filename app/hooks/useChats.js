import { useState, useEffect } from "react";
import Database from "../utils/storage/database";
import utils from "../utils/chat";
import eventEmitter from "../utils/global/Events/EventEmitter";

const useChats = () => {
  const [chatDetails, setChatDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        const database = await Database.create();
        const chats = await database.getChats();
        const details = {};
        for (const chat of chats) {
          const lastMessage = await getLastMesssage(chat.uuid);

          const { name, profilePictureUUID } =
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

    const handleNewMessage = (message) => {
      const chatUUID = message.chatUUID;
      setChatDetails((prevDetails) => {
        if (prevDetails[chatUUID]) {
          return {
            ...prevDetails,
            [chatUUID]: {
              ...prevDetails[chatUUID],
              lastMessage: message,
            },
          };
        }
        return prevDetails;
      });
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

    eventEmitter.getEmitter().on("newMessage", handleNewMessage);
    eventEmitter.getEmitter().on("newChat", handleNewChat);

    return () => {
      eventEmitter.getEmitter().off("newMessage", handleNewMessage);
      eventEmitter.getEmitter().off("newChat", handleNewChat);
    };
  }, []);

  return { chatDetails, loading, error };
};

const getLastMesssage = async (chatUUID) => {
  try {
    const database = await Database.create();
    const lastMessage = await database.getLastMessage(chatUUID);
    if (lastMessage && lastMessage.type && lastMessage.type == "system") {
      lastMessage.text = await utils.getSystemMessageText(lastMessage);
    }
    return lastMessage;
  } catch (error) {
    console.error("Error fetching last message:", error);
    return null;
  }
};

export default useChats;
