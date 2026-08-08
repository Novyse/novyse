import { useContext, useEffect } from "react";
import { View } from "react-native";

import { ThemeContext } from "@/src/context/ThemeContext";

import useVoiceRecord from "@/src/hooks/chat/useVoiceRecord";
import useScreenRecord from "@/src/hooks/chat/useScreenRecord";

import LeftButton from "./LeftButtonBottomBar";
import MiddleBar from "./MiddleBarBottomBar";
import RightButton from "./RightButtonBottomBar";

import MentionBar from "../actions/MentionBar";
import EditBar from "../actions/EditBar";
import ReplyBar from "../actions/ReplyBar";
import FilesBar from "../actions/FilesBar";
import ScreenRecordingPreview from "../actions/ScreenRecordingPreview";

const DefaultBottomBar = ({
  chatType,
  isAttachMenuOpen,
  onToggleAttachMenu,
  isEmojiPickerVisible,
  onToggleEmoji,
  textInputRef,
  newMessageText = "",
  files = [],
  onTextChange,
  onSendMessage,
  onFileAppend,
  onInputFocus,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  mentionMembers,
  onSelectMention,
  onChangeMention,
  onEndMention,
  onRecordingActivityChange,
  onPressArrowUp,
  startScreenRecordingRef,
}) => {
  const {
    isRecording,
    isPaused,
    recorderState,
    handleStartRecording,
    handleStopAndSend,
    handleStopAndDraft,
    handleTogglePause,
    handleCancelRecording,
  } = useVoiceRecord(onSendMessage, onRecordingActivityChange);

  const {
    isScreenRecording,
    isScreenRecordingPaused,
    screenRecordingState,
    handleStartScreenRecording,
    handleStopScreenAndDraft,
    handleStopScreenAndSend,
    handleToggleScreenPause,
    handleCancelScreenRecording,
  } = useScreenRecord(onRecordingActivityChange);

  useEffect(() => {
    if (startScreenRecordingRef) {
      startScreenRecordingRef.current = handleStartScreenRecording;
    }
  }, [startScreenRecordingRef, handleStartScreenRecording]);

  // Unified recording state
  const activeRecording = isScreenRecording || isRecording;
  const activePaused = isScreenRecording ? isScreenRecordingPaused : isPaused;
  const activeRecorderState = isScreenRecording
    ? screenRecordingState
    : recorderState;

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <ScreenRecordingPreview
        isScreenRecording={isScreenRecording}
        activeStream={screenRecordingState?.activeStream}
        theme={theme}
      />
      {/* Mention Bar */}
      {mentionMembers && mentionMembers.length > 0 && (
        <MentionBar members={mentionMembers} onSelectMember={onSelectMention} />
      )}

      {/* Edit Bar — takes priority over Reply Bar */}
      {editingMessage ? (
        <EditBar editingMessage={editingMessage} onCancelEdit={onCancelEdit} />
      ) : replyingTo && replyingTo.length > 0 ? (
        <ReplyBar replyingTo={replyingTo} onCancelReply={onCancelReply} />
      ) : null}

      <FilesBar />

      <View style={styles.inputRow}>
        <LeftButton
          isRecording={activeRecording}
          onCancelVocal={
            isScreenRecording
              ? handleCancelScreenRecording
              : handleCancelRecording
          }
          isAttachMenuOpen={isAttachMenuOpen}
          onToggleAttachMenu={onToggleAttachMenu}
        />
        <MiddleBar
          chatType={chatType}
          newMessageText={newMessageText}
          textInputRef={textInputRef}
          onTextChange={onTextChange}
          onInputFocus={onInputFocus}
          isEmojiPickerVisible={isEmojiPickerVisible}
          onToggleEmoji={onToggleEmoji}
          onSendMessage={onSendMessage}
          onFileAppend={onFileAppend}
          isRecording={activeRecording}
          isPaused={activePaused}
          recorderState={activeRecorderState}
          handleTogglePause={
            isScreenRecording ? handleToggleScreenPause : handleTogglePause
          }
          handleStopAndDraft={
            isScreenRecording
              ? () => handleStopScreenAndDraft(onFileAppend)
              : () => handleStopAndDraft(onFileAppend)
          }
          isScreenRecording={isScreenRecording}
          onCancelReply={onCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={onCancelEdit}
          replyingTo={replyingTo}
          onPressArrowUp={onPressArrowUp}
          onChangeMention={onChangeMention}
          onEndMention={onEndMention}
        />

        <RightButton
          isRecording={activeRecording}
          onSendMessage={onSendMessage}
          handleStartRecording={handleStartRecording}
          handleStopAndSend={
            isScreenRecording
              ? () => handleStopScreenAndSend(onSendMessage)
              : handleStopAndSend
          }
          newMessageText={newMessageText}
          hasFiles={files?.length > 0}
        />
      </View>
    </View>
  );
};

const createStyle = (theme) => ({
  container: {
    width: "100%",
    flexDirection: "column", // ora colonna
    backgroundColor: theme.background,
    paddingHorizontal: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 55,
    gap: 10,
  },
});

export default DefaultBottomBar;
