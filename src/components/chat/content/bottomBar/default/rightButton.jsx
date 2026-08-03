import React, { useContext } from "react";
import { StyleSheet } from "react-native";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/BlurredView";

const RightButton = ({
  isRecording,
  newMessageText,
  hasFiles,
  onSendMessage,
  handleStartRecording,
  handleStopAndSend,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <BlurredView style={styles.container}>
      {isRecording ? (
        <Icon
          name="SentIcon"
          onPress={() => handleStopAndSend()}
          style={styles.icon}
        />
      ) : newMessageText.length > 0 || hasFiles || isRecording ? (
        // There is text or files to send -> Send message BUTTON
        <Icon
          name="SentIcon"
          onPress={() => onSendMessage("message", newMessageText)}
          style={styles.icon}
        />
      ) : (
        // No text, no files, no recording -> Record voice message BUTTON
        <Icon
          name="Mic02Icon"
          onPress={handleStartRecording}
          style={styles.icon}
        />
      )}
    </BlurredView>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      justifyContent: "center",
      alignItems: "center",
      width: 45,
      height: 45,
      alignItems: "center",
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default RightButton;
