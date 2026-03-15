import React, { createContext, useState, useEffect } from "react";
import { router } from "expo-router";

import EventEmitter from "@/src/utils/global/Events/EventEmitter";
import auth from "@/src/utils/welcome/auth";

export const ChatContext = createContext();

// @SamueleOrazioDurante il context verrà riscritto in zustand per la draft, ogni chat avrà il suo active chat context con dentro le proprie variabili per tenere lo stato di ogni chat sepraatamente

export const ChatProvider = ({ children }) => {
  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [selectedSub, setSelectedSub] = useState(0);
  const [contentView, setContentView] = useState("chat");

  const [newMessageText, setNewMessageText] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState([]);

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
    if (selectedChatUUID) {
      router.push(`/app/chat/${selectedChatUUID}/${selectedSub}`);
    } else if (selectedHandle) {
      router.push(`/app/chat/${selectedHandle}/${selectedSub}`);
    }
    setNewMessageText("");
    setEditingMessage(null);
    setSelectedMessages([]);
    setReplyingTo([]);
  }, [selectedChatUUID, selectedHandle, selectedSub]);

  return (
    <ChatContext.Provider
      value={{
        selectedChatUUID,
        setSelectedChatUUID,
        selectedHandle,
        setSelectedHandle,
        selectedSub,
        setSelectedSub,
        contentView,
        setContentView,
        newMessageText,
        setNewMessageText,
        editingMessage,
        setEditingMessage,
        selectedMessages,
        setSelectedMessages,
        replyingTo,
        setReplyingTo,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
