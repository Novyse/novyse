import React, { createContext, useState, useEffect } from "react";
import { router } from "expo-router";

import EventEmitter from "@/src/utils/global/Events/EventEmitter";
import auth from "@/src/utils/welcome/auth";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);

  const [selectedSub, setSelectedSub] = useState(0);

  useEffect(() => {
    const handleNewChat = async (chat) => {
      let handle;
      if (chat.type === "DM") {
        const userUUID = await auth.getUserUUID();
        const otherUser = chat.members.find(
          (member) => member.uuid != userUUID,
        );
        handle = otherUser.handle;
      } else {
        handle = chat.handle;
      }

      if (selectedChatUUID === null && selectedHandle === handle) {
        setSelectedChatUUID(chat.uuid);
      }
    };

    EventEmitter.getEmitter().on("newChat", handleNewChat);

    return () => {
      EventEmitter.getEmitter().off("newChat", handleNewChat);
    };
  }, [selectedChatUUID, selectedHandle]);

  useEffect(() => {
    console.log("Selected chat changed:", { selectedChatUUID, selectedHandle });
    if (selectedChatUUID) {
      router.push(`/app/chat/${selectedChatUUID}`);
    } else if (selectedHandle) {
      router.push(`/app/chat/${selectedHandle}`);
    }
  }, [selectedChatUUID, selectedHandle]);

  return (
    <ChatContext.Provider
      value={{
        selectedChatUUID,
        setSelectedChatUUID,
        selectedHandle,
        setSelectedHandle,
        selectedSub,
        setSelectedSub,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
