import { useState, useEffect } from "react";
import Database from "../utils/storage/database";
import auth from "../utils/welcome/auth";

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

          let name = chat.name;
          let profilePictureUUID = chat.profile_picture_uuid;

          if (chat.type === "DM") {
            const user = await database.getUserByChatUUID(chat.uuid);
            name = user.name;
            profilePictureUUID = user.profile_picture_uuid;

            if (user.uuid === (await auth.getUserUUID())) {
              name = "Saved Messages";
              profilePictureUUID = null;
            }
          }

          details[chat.uuid] = {
            uuid: chat.uuid,
            name,
            handle: chat.handle,
            type: chat.type,
            profilePictureUUID,
            lastMessage,
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
  }, []);
  

  return { chatDetails, loading, error };
};

export default useChats;
