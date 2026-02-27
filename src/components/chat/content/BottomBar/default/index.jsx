import React, { useContext } from "react";
import { View, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import useVoiceRecord from "@/src/hooks/chat/useVoiceRecord";
import Icon from "@/src/components/Icon";

import LeftButton from "./leftButton";
import MiddleBar from "./middleBar";
import RightButton from "./rightButton";
import BlurredView from "@/src/components/BlurredView";

import MentionBar from "../actions/MentionBar";

const DefaultBar = ({
  isAttachMenuOpen,
  onToggleAttachMenu,
  onToggleEmoji,
  textInputRef,
  newMessageText = "",
  onTextChange,
  onSendMessage,
  onInputFocus,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  mentionMembers,
  onSelectMention,
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
      {/* Mention Bar */}
      {mentionMembers && mentionMembers.length > 0 && (
        <MentionBar members={mentionMembers} onSelectMember={onSelectMention} />
      )}

      {/* Edit Bar — takes priority over Reply Bar */}
      {editingMessage ? (
        <BlurredView style={styles.replyBarContainer}>
          <Icon
            name="PencilEdit02Icon"
            size={16}
            color={theme.icon}
          />
          <View style={styles.editBarAccent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyBarName, { color: theme.icon }]} numberOfLines={1}>
              Editing
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {editingMessage.content ?? ""}
            </Text>
          </View>
          <Icon
            name="Cancel01Icon"
            size={18}
            color={theme.placeholderText}
            onPress={onCancelEdit}
          />
        </BlurredView>
      ) : replyingTo ? (
        <BlurredView style={styles.replyBarContainer}>
          <View style={styles.replyBarAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBarName} numberOfLines={1}>
              {replyingTo.sender_name ?? replyingTo.senderUUID}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyingTo.text ?? replyingTo.content ?? ""}
            </Text>
          </View>
          <Icon
            name="Cancel01Icon"
            size={18}
            color={theme.placeholderText}
            onPress={onCancelReply}
          />
        </BlurredView>
      ) : null}
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
          onToggleEmoji={onToggleEmoji}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          isPaused={isPaused}
          recorderState={recorderState}
          handleTogglePause={handleTogglePause}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
        />

        <RightButton
          isRecording={isRecording}
          onSendMessage={onSendMessage}
          handleStartRecording={handleStartRecording}
          handleStopAndSend={handleStopAndSend}
          newMessageText={newMessageText}
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
