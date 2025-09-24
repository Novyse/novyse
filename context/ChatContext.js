import React, { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState(null);
  const [selectedChatPictureUUID, setSelectedChatPictureUUID] = useState(null);

  return (
    <ChatContext.Provider
      value={{
        selectedChatUUID,
        setSelectedChatUUID,
        selectedHandle,
        setSelectedHandle,
        selectedChatName,
        setSelectedChatName,
        selectedChatPictureUUID,
        setSelectedChatPictureUUID,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
