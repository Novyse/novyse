import React, { useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";

import { ThemeContext } from "@/context/ThemeContext";
import { ChatContext } from "@/context/ActiveChatContext";

import useCommsData from "@/src/hooks/comms/useCommsData";

const VocalContent = ({ navigation, chatUUIDorHandle }) => {
  const {
    selectedChatUUID,
    setSelectedChatUUID,
    selectedHandle,
    setSelectedHandle,
  } = useContext(ChatContext);

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
    <View style={{ flex: 1 }}>
      <CommsMembersLayout participants={participants} room={room} />

      {selectedChatUUID && (
        <CommsBottomBar
          chatUUID={selectedChatUUID}
          sub={0}
          navigation={navigation}
        />
      )}
    </View>
  );
};

export default VocalContent;

const createStyle = (theme) => StyleSheet.create({});
