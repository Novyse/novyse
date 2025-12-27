import React from "react";
import { View } from "react-native";

import DefaultBar from "./default";
import JoinBar from "./join";

const BottomBar = ({
  chat,
  onJoin,
  newMessageText,
  textInputRef,
  onTextChange,
  onSendMessage,
  isFileMenuOpen,
  onToggleMenu,
  onToggleEmoji,
  onInputFocus,
  setBottomBarHeight,
}) => {
  const showJoinBar =
    !chat.uuid && ["GROUP", "CHANNEL", "FORUM"].includes(chat.type);

  return (
    <View
      onLayout={(event) =>
        setBottomBarHeight &&
        setBottomBarHeight(event.nativeEvent.layout.height)
      }
    >
      {showJoinBar ? (
        <JoinBar onJoin={onJoin} chat={chat} />
      ) : (
        <DefaultBar
          isFileMenuOpen={isFileMenuOpen}
          onToggleMenu={onToggleMenu}
          onToggleEmoji={onToggleEmoji}
          textInputRef={textInputRef}
          newMessageText={newMessageText}
          onTextChange={onTextChange}
          onSendMessage={onSendMessage}
          onInputFocus={onInputFocus}
        />
      )}
    </View>
  );
};

export default BottomBar;
