import React from "react";
import { View } from "react-native";

import { ChatContext } from "@/context/ActiveChatContext";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";

import useCommsData from "@/src/hooks/comms/useCommsData";

const VocalContent = () => {
  const { selectedChatUUID: chatUUIDorHandle } = React.useContext(ChatContext);
  const { room, participants } = useCommsData(chatUUIDorHandle, 0);

  return (
    <View style={{ flex: 1 }}>
      <CommsMembersLayout participants={participants} room={room} />

      {chatUUIDorHandle && (
        <CommsBottomBar chatUUID={chatUUIDorHandle} sub={0} />
      )}
    </View>
  );
};

export default VocalContent;
