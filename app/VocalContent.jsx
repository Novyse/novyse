import React, { useContext } from "react";
import { StyleSheet } from "react-native";

import SmartBackground from "./components/SmartBackground";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";

// Context
import { ChatContext } from "../context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";

// Hooks
import useCommData from "./hooks/useCommData";
import useAudioContext from "./hooks/useAudioContext";

const VocalContent = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { selectedCommUUID } = useContext(ChatContext);

  const { commData, activeStreams, loading, error } =
    useCommData(selectedCommUUID);
  const { audioContext } = useAudioContext();

  return (
    <SmartBackground
      backgroundKey="backgroundChatContentGradient"
      style={styles.container}
    >
      <VocalMembersLayout commData={commData} activeStreams={activeStreams} />

      {selectedCommUUID && (
        <VocalContentBottomBar commUUID={selectedCommUUID} />
      )}
    </SmartBackground>
  );
};

export default VocalContent;

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
      padding: 15,
      gap: 15,
    },
  });
