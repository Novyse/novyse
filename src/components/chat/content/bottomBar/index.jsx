import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DefaultBar from "./default";
import JoinBar from "./join";

const BottomBar = ({
  chat,
  onJoin,
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
}) => {
  const showJoinBar =
    !chat.uuid && ["GROUP", "CHANNEL", "FORUM"].includes(chat.type);

  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(event) =>
        setBottomBarHeight &&
        setBottomBarHeight(event.nativeEvent.layout.height)
      }
      style={{ paddingBottom: insets.bottom + 5 }}
    >
      {showJoinBar ? (
        <JoinBar onJoin={onJoin} chat={chat} />
      ) : (
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
        />
      )}
    </View>
  );
};

export default BottomBar;
