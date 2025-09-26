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
          const lastMessage = await database.getLastMessage(chat.uuid);

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
        console.log(
          "[useChats] Loaded details for",
          Object.keys(details).length,
          "chats"
        );
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

    const handleNewChat = (chat) => {
      setChatDetails((prevDetails) => ({
        ...prevDetails,
        [chat.uuid]: {
          uuid: chat.uuid,
          name: chat.name,
          handle: chat.handle,
          type: chat.type,
          profilePictureUUID: chat.profilePictureUUID,
          lastMessage: null,
        },
      }));
    };

    eventEmitter.getEmitter().on("newMessage", handleNewMessage);
    eventEmitter.getEmitter().on("newChat", handleNewChat);

    return () => {
      eventEmitter.getEmitter().off("newMessage", handleNewMessage);
    };
  }, []);

  return { chatDetails, loading, error };
};

export default useChats;
