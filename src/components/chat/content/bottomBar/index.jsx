import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DefaultBar from "./default";

const BottomBar = ({
  newMessageText,
  files,
  textInputRef,
  onTextChange,
  onSendMessage,
  onFileAppend,
  isAttachMenuOpen,
  onToggleAttachMenu,
  onToggleEmoji,
  onInputFocus,
  setBottomBarHeight,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  mentionMembers,
  onSelectMention,
  onRecordingActivityChange,
  onPressArrowUp,
}) => {

  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(event) =>
        setBottomBarHeight &&
        setBottomBarHeight(event.nativeEvent.layout.height)
      }
      style={{ paddingBottom: insets.bottom + 5 }}
    >
      <DefaultBar
        isAttachMenuOpen={isAttachMenuOpen}
        onToggleAttachMenu={onToggleAttachMenu}
        onToggleEmoji={onToggleEmoji}
        textInputRef={textInputRef}
        newMessageText={newMessageText}
        files={files}
        onTextChange={onTextChange}
        onSendMessage={onSendMessage}
        onFileAppend={onFileAppend}
        onInputFocus={onInputFocus}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
        mentionMembers={mentionMembers}
        onSelectMention={onSelectMention}
        onRecordingActivityChange={onRecordingActivityChange}
        onPressArrowUp={onPressArrowUp}
      />
    </View>
  );
};

export default BottomBar;
