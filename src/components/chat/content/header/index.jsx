import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderBase from "@/src/components/HeaderBase";
import BlurredView from "@/src/components/BlurredView";

import MainHeader from "./main";
import SelectedHeader from "./SelectedHeader";
import AudioHeader from "./audio";
import PinnedMessageHeader from "./pinnedMessage";
import CommsHeader from "./CommsHeader";

import { ThemeContext } from "@/context/ThemeContext";
import { AudioPlayerContext } from "@/context/AudioPlayerContext";
import useChatStore from "@/context/ChatContext";
import { useCommsContext } from "@/context/CommsContext";

import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";

const Header = ({
  chatUUIDorHandle,
  contentView,
  setContentView,
  selectedMessages,
  setSelectedMessages,
  onBack,
  isSmallScreen,
  onReply,
  onForward,
  onDelete,
}) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const styles = createStyle(theme, insets);

  const { currentUri } = useContext(AudioPlayerContext);

  const isVoiceActive = !!currentUri;

  const pinnedMessages = useChatStore((state) => {
    const chat = state.chats.find(
      (c) => c.uuid === chatUUIDorHandle || c.handle === chatUUIDorHandle,
    );
    return chat?.pinnedMessages;
  });

  const { name, profilePictureUUID } = useChatMetadata(chatUUIDorHandle);

  const { connected, room, participants } = useCommsContext();

  const hasPinnedMessage = pinnedMessages && pinnedMessages.length > 0;
  const hasComms = connected;

  const isHeaderExpanded = hasPinnedMessage || hasComms || isVoiceActive;

  const activeRadius = isHeaderExpanded ? 15 : 100;

  return (
    <View style={styles.headerWrapper}>
      <HeaderBase style={[styles.headerBase, { borderRadius: activeRadius }]}>
        <BlurredView
          style={[styles.headerColumnContainer, { borderRadius: activeRadius }]}
        >
          {(!selectedMessages || selectedMessages.length === 0) && (
            <MainHeader
              chatUUIDorHandle={chatUUIDorHandle}
              selectedChatName={name}
              selectedChatPictureUUID={profilePictureUUID}
              contentView={contentView}
              setContentView={setContentView}
              onBack={onBack}
              isSmallScreen={isSmallScreen}
            />
          )}
          {selectedMessages && selectedMessages.length > 0 && (
            <SelectedHeader
              chatUUIDorHandle={chatUUIDorHandle}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              isSmallScreen={isSmallScreen}
              onReply={onReply}
              onForward={onForward}
              onDelete={onDelete}
            />
          )}

          {hasPinnedMessage && (
            <PinnedMessageHeader pinnedMessages={pinnedMessages} />
          )}
          {isVoiceActive && <AudioHeader />}
          {hasComms && (
            <CommsHeader
              connected={connected}
              roomName={room?.roomInfo.name}
              participantsCount={participants.length}
            />
          )}
        </BlurredView>
      </HeaderBase>
    </View>
  );
};

function createStyle(theme, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
    },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingTop: insets.top,
    },
    headerBase: {
      overflow: "hidden",
    },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      paddingBottom: 0,
      paddingHorizontal: 8, //padding for everything inside the headerbar
    },
  });
}

export default React.memo(Header);
