import { useState, useEffect, useCallback } from "react";
import database from "../../utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitterInstance from "../../utils/global/Events/EventEmitter.js";

const useChatPin = () => {
  const [pinnedChats, setPinnedChats] = useState([]);

  useEffect(() => {
    database.chat.pin.get().then((chats) => {
      setPinnedChats(chats);
    });
  }, []);

  useEffect(() => {
    const emitter = eventEmitterInstance.getEmitter();

    const handleChatUpdate = ({ chatUUID, action, data }) => {
      if (action === "pin_add") {
        const position = data?.position ?? 0;

        setPinnedChats((prev) => {
          // 1. Delete: Rimuove la chat se già presente
          let newChats = prev.filter((c) => c.chatUUID !== chatUUID);

          // 2. Shift: Incrementa di 1 la posizione di tutte le chat con position >= target position
          newChats = newChats.map((c) => {
            if (c.position >= position) {
              return { ...c, position: c.position + 1 };
            }
            return c;
          });

          // 3. Insert: Inserisce la nuova chat in position
          newChats.push({ chatUUID, position });

          // 4. Reorder: Riassegna posizioni consecutive
          newChats.sort((a, b) => a.position - b.position);
          return newChats.map((c, index) => ({ ...c, position: index }));
        });
      } else if (action === "pin_remove") {
        setPinnedChats((prev) => {
          // Rimuovi la chat e riordina per mantenere posizioni consecutive
          let newChats = prev.filter((c) => c.chatUUID !== chatUUID);
          newChats.sort((a, b) => a.position - b.position);
          return newChats.map((c, index) => ({ ...c, position: index }));
        });
      }
    };

    emitter.on("chat:update", handleChatUpdate);

    return () => {
      emitter.off("chat:update", handleChatUpdate);
    };
  }, []);

  const pinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      // Usa l'eventEmitter per mandare lo stato. In futuro lo stato sarà gestito in un context
      // Questo hook si occuperà solo di emettere questi eventi.
      await eventEmitterInstance.chat.update(chat.chatUUID, "pin_add", {
        position: chat.position,
      });
    }
    for (const chat of chats) {
      await gateway.chat.pin.add(chat.chatUUID, chat.position);
    }
  }, []);

  const unpinChats = useCallback(async (chats) => {
    for (const chat of chats) {
      await eventEmitterInstance.chat.update(chat.chatUUID, "pin_remove");
    }
    for (const chat of chats) {
      await gateway.chat.pin.remove(chat.chatUUID);
    }
  }, []);

  return {
    pinnedChats,
    pinChats,
    unpinChats,
  };
};

export default useChatPin;
