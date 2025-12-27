import React, { useContext } from "react";
import { View } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import useVoiceRecord from "@/src/hooks/chat/useVoiceRecord";

import LeftButton from "./leftButton";
import MiddleBar from "./middleBar";
import RightButton from "./rightButton";

const DefaultBar = ({
  isFileMenuOpen,
  onToggleMenu,
  onToggleEmoji,
  textInputRef,
  newMessageText = "",
  onTextChange,
  onSendMessage,
  onInputFocus,
}) => {
  const {
    isRecording,
    isPaused,
    recorderState,
    handleStartRecording,
    handleStopAndSend,
    handleTogglePause,
    handleCancelRecording,
  } = useVoiceRecord(onSendMessage);

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <LeftButton
        isRecording={isRecording}
        onCancelVocal={handleCancelRecording}
        isFileMenuOpen={isFileMenuOpen}
        onToggleFileMenu={onToggleMenu}
      />
      <MiddleBar
        newMessageText={newMessageText}
        textInputRef={textInputRef}
        onTextChange={onTextChange}
        onInputFocus={onInputFocus}
        onToggleEmoji={onToggleEmoji}
        onSendMessage={onSendMessage}
        isRecording={isRecording}
        isPaused={isPaused}
        recorderState={recorderState}
        handleTogglePause={handleTogglePause}
      />

      <RightButton
        isRecording={isRecording}
        onSendMessage={onSendMessage}
        handleStartRecording={handleStartRecording}
        handleStopAndSend={handleStopAndSend}
        newMessageText={newMessageText}
      />
    </View>
  );
};

const createStyle = (theme) => ({
  container: {
    width: "100%",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 55,
    backgroundColor: theme.background,
    gap: 10,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 100,
    paddingHorizontal: 5,
    minHeight: 45,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    outlineStyle: "none",
    alignSelf: "stretch",
    marginLeft: 10,
    minWidth: 30,
  },
  icon: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  rightLeftButtons: {
    justifyContent: "center",
    alignItems: "center",
    width: 45,
    height: 45,
    alignItems: "center",
  },
});

export default DefaultBar;
