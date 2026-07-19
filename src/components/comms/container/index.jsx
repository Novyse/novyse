import React from "react";
import { View } from "react-native";

import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";

import useCommsData from "@/src/hooks/comms/useCommsData";

const VocalContent = () => {
  const chatUUIDorHandle = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const { room, participants } = useCommsData(chatUUIDorHandle, selectedSub);

  return (
    <View style={{ flex: 1 }}>
      <CommsMembersLayout
        participants={participants}
        room={room}
        chatUUID={chatUUIDorHandle}
        sub={selectedSub}
      />

      {chatUUIDorHandle && (
        <CommsBottomBar chatUUID={chatUUIDorHandle} sub={selectedSub} />
      )}
    </View>
  );
};

export default VocalContent;
