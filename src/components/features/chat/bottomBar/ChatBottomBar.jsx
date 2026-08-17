import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DefaultBar from "./default/DefaultBottomBar";
import ChannelBar from "./ChannelBar";

const ChatBottomBar = ({
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
  onStartMention,
  onChangeMention,
  onEndMention,
  onRecordingActivityChange,
  onPressArrowUp,
  startScreenRecordingRef,
  readOnly,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(event) =>
        setBottomBarHeight &&
        setBottomBarHeight(event.nativeEvent.layout.height)
      }
      style={{ paddingBottom: insets.bottom + 10 }}
    >
      {readOnly ? (
        <ChannelBar />
      ) : (
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
          onStartMention={onStartMention}
          onChangeMention={onChangeMention}
          onEndMention={onEndMention}
          onRecordingActivityChange={onRecordingActivityChange}
          onPressArrowUp={onPressArrowUp}
          startScreenRecordingRef={startScreenRecordingRef}
          readOnly={readOnly}
        />
      )}
    </View>
  );
};

export default ChatBottomBar;
