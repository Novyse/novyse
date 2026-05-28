import React, { useContext } from "react";
import { View } from "react-native";

import { ThemeContext } from "@/src/context/ThemeContext";

import useVoiceRecord from "@/src/hooks/chat/useVoiceRecord";

import LeftButton from "./leftButton";
import MiddleBar from "./middleBar";
import RightButton from "./rightButton";

import MentionBar from "../actions/MentionBar";
import EditBar from "../actions/EditBar";
import ReplyBar from "../actions/ReplyBar";
import FilesBar from "../actions/FilesBar";

const DefaultBar = ({
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
  onRecordingActivityChange,
  onPressArrowUp,
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

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
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
          isRecording={isRecording}
          onCancelVocal={handleCancelRecording}
          isAttachMenuOpen={isAttachMenuOpen}
          onToggleAttachMenu={onToggleAttachMenu}
        />
        <MiddleBar
          newMessageText={newMessageText}
          textInputRef={textInputRef}
          onTextChange={onTextChange}
          onInputFocus={onInputFocus}
          isEmojiPickerVisible={isEmojiPickerVisible}
          onToggleEmoji={onToggleEmoji}
          onSendMessage={onSendMessage}
          onFileAppend={onFileAppend}
          isRecording={isRecording}
          isPaused={isPaused}
          recorderState={recorderState}
          handleTogglePause={handleTogglePause}
          handleStopAndDraft={() => handleStopAndDraft(onFileAppend)}
          onCancelReply={onCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={onCancelEdit}
          replyingTo={replyingTo}
          onPressArrowUp={onPressArrowUp}
        />

        <RightButton
          isRecording={isRecording}
          onSendMessage={onSendMessage}
          handleStartRecording={handleStartRecording}
          handleStopAndSend={handleStopAndSend}
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
    alignItems: "center",
    minHeight: 55,
    gap: 10,
  },
  replyBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.backgroundCard,
    borderRadius: 18,
    marginBottom: 4,
    gap: 8,
  },
  replyBarAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    backgroundColor: theme.icon,
  },
  editBarAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    backgroundColor: theme.icon,
  },
  replyBarText: {
    color: theme.placeholderText,
    fontSize: 13,
  },
  replyBarName: {
    color: theme.text,
    fontWeight: "600",
    fontSize: 13,
  },
});

export default DefaultBar;
