import React, { createContext, useState, useEffect } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState(null);
  const [selectedChatPictureUUID, setSelectedChatPictureUUID] = useState(null);

  const [selectedSub, setSelectedSub] = useState(0);
  const [selectedCommUUID, setSelectedCommUUID] = useState(null);

  useEffect(() => {
    if (selectedChatUUID !== null) {
      setSelectedCommUUID(selectedChatUUID + "_" + selectedSub);
    } else {
      setSelectedCommUUID(null);
    }
  }, [selectedChatUUID, selectedSub]);

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
        selectedSub,
        setSelectedSub,
        selectedCommUUID,
        setSelectedCommUUID,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};