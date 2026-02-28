import { useState, useEffect } from "react";
import database from "@/src/utils/storage/database";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import messageUtils from "@/src/utils/chat/messageFormat";

const useMessage = (chatUUID, messageID) => {
  if (!chatUUID || !messageID) return { message: null };

  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchMessage = async () => {
      const message = await messageUtils.format(
        await database.message.get(chatUUID, messageID),
      );
      setMessage(message);
    };
    fetchMessage();

    const handleMessageUpdate = async (data) => {
      if (data.chatUUID === chatUUID && data.messageID === messageID) {
        fetchMessage();
      }
    };
    eventEmitter.getEmitter().on("message:update", handleMessageUpdate);
    return () => {
      eventEmitter.getEmitter().off("message:update", handleMessageUpdate);
    };
  }, [chatUUID, messageID, messageUtils]);

  return { message };
};

export default useMessage;
