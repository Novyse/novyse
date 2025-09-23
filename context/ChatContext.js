import React, { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);

  return (
    <ChatContext.Provider
      value={{
        selectedChatUUID,
        setSelectedChatUUID,
        selectedHandle,
        setSelectedHandle,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
