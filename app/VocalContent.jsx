import React, { useContext } from "react";
import { StyleSheet, Linking, View, Text } from "react-native";

import SmartBackground from "./components/SmartBackground";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";

// Context
import { ChatContext } from "../context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";

// Hooks
import useCommData from "./hooks/comm/useCommData";
import useAudioContext from "./hooks/comm/useAudioContext";

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
      <View style={styles.alertContainer}>
        <Text style={styles.alertText}>
          La funzionalità vocale non è al momento disponibile e si sconsiglia il
          suo utilizzo. Per testare le chat vocali, visitare il link{" "}
          <Text
            style={styles.alertLink}
            onPress={() => Linking.openURL("https://novyse.com/preview")}
          >
            novyse.com/preview
          </Text>{" "}
          o attendere aggiornamenti futuri (versione &gt;0.10).
        </Text>
      </View>

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
    alertContainer: {
      backgroundColor: theme.errorText,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.iconCommsOutHover,
    },
    alertText: {
      fontSize: 14,
      color: theme.text,
      textAlign: "center",
      lineHeight: 20,
    },
    alertLink: {
      color: theme.link,
      textDecorationLine: "underline",
    },
  });
