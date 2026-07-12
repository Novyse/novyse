import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DefaultBar from "./default";

const BottomBar = ({
  chatType,
  newMessageText,
  files,
  textInputRef,
  onTextChange,
  onSendMessage,
  onFileAppend,
  isAttachMenuOpen,
  onToggleAttachMenu,
  isEmojiPickerVisible,
  onToggleEmoji,
  onInputFocus,
  setBottomBarHeight,
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
        chatType={chatType}
        isAttachMenuOpen={isAttachMenuOpen}
        onToggleAttachMenu={onToggleAttachMenu}
        isEmojiPickerVisible={isEmojiPickerVisible}
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
        onChangeMention={onChangeMention}
        onEndMention={onEndMention}
        onRecordingActivityChange={onRecordingActivityChange}
        onPressArrowUp={onPressArrowUp}
      />
    </View>
  );
};

export default BottomBar;
