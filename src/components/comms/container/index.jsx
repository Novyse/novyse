import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";

import { ThemeContext } from "@/context/ThemeContext";

import useCommsData from "@/src/hooks/comms/useCommsData";

const VocalContent = ({ chatUUIDorHandle }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

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

const createStyle = (theme) => StyleSheet.create({});
