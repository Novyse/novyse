import React, { useContext, useEffect } from "react";
import { StyleSheet } from "react-native";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";

import { ThemeContext } from "@/context/ThemeContext";
import { ChatContext } from "@/context/ChatContext";

import useCommsData from "@/src/hooks/comms/useCommsData";

import Header from "@/src/components/chat/content/Header";

const VocalContent = ({ navigation, route }) => {
  const { chatUUIDorHandle } = route.params || {};
  const {
    selectedChatUUID,
    setSelectedChatUUID,
    selectedHandle,
    setSelectedHandle,
    selectedChatName,
    selectedChatPictureUUID,
  } = useContext(ChatContext);

  const onBack = () => navigation.goBack();

  useEffect(() => {
    if (chatUUIDorHandle) {
      // Assume if it contains '-', it's a UUID, else handle
      if (chatUUIDorHandle.includes("-")) {
        setSelectedChatUUID(chatUUIDorHandle);
      } else {
        setSelectedHandle(chatUUIDorHandle);
      }
    }
  }, [chatUUIDorHandle, setSelectedChatUUID, setSelectedHandle]);

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { room, participants } = useCommsData(chatUUIDorHandle, 0);

  return (
    <>
      <Header
        chatUUIDorHandle={chatUUIDorHandle}
        selectedChatName={selectedChatName}
        selectedChatPictureUUID={selectedChatPictureUUID}
        contentView="vocal"
        navigation={navigation}
        onBack={onBack}
      />
      <CommsMembersLayout participants={participants} room={room} />

      {selectedChatUUID && (
        <CommsBottomBar chatUUID={selectedChatUUID} sub={0} navigation={navigation}/>
      )}
    </>
  );
};

export default VocalContent;

const createStyle = (theme) => StyleSheet.create({});
