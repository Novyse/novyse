import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BlurredView from "@/src/components/BlurredView";
import ChatHeaderBackdrop from "./ChatHeaderBackdrop";
import { useScreen } from "@/src/context/ScreenContext";

import MainHeader from "./main";
import SelectedHeader from "./SelectedHeader";
import AudioHeader from "./audio";
import PinnedMessageHeader from "./pinnedMessage";
import CommsHeader from "./CommsHeader";

import { AudioPlayerContext } from "@/src/context/AudioPlayerContext";
import useChatStore from "@/src/context/ChatContext";
import { useCommsContext } from "@/src/context/CommsContext";

import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

const Header = ({
  chatUUIDorHandle,
  contentView,
  setContentView,
  selectedMessages,
  setSelectedMessages,
  onBack,
  navToOverview,
  isSmallScreen,
  onReply,
  onForward,
  onDelete,
}) => {
  const styles = createStyle();
  const insets = useSafeAreaInsets();
  const { isSmallScreen: isMobileLayout } = useScreen();
  const useFullWidthBackdrop = isMobileLayout;

  const { currentUri } = useContext(AudioPlayerContext);

  const isVoiceActive = !!currentUri;

  const setHeaderHeight = useActiveChatStore((state) => state.setHeaderHeight);

  const pinnedMessages = useChatStore((state) => {
    const chat = state.chats.find(
      (c) => c.uuid === chatUUIDorHandle || c.handle === chatUUIDorHandle,
    );
    return chat?.pinnedMessages;
  });

  const {
    name,
    profilePictureUUID,
    type: chatType,
    memberCount,
    onlineMembersCount,
    memberActivityData,
    lastAccessAt,
  } = useChatMetadata(chatUUIDorHandle);

  const { connected, room, participants } = useCommsContext();

  const hasPinnedMessage = pinnedMessages && pinnedMessages.length > 0;
  const hasComms = connected;

  const isHeaderExpanded = hasPinnedMessage || hasComms || isVoiceActive;

  const activeRadius = isHeaderExpanded ? 15 : 100;

  const [backdropHeight, setBackdropHeight] = React.useState(0);

  const handleContentLayout = React.useCallback(
    (e) => {
      const height = e.nativeEvent.layout.height;
      setBackdropHeight(height);

      if (setHeaderHeight) {
        setHeaderHeight(height);
      }
    },
    [setHeaderHeight],
  );

  return (
    <View
      style={[
        styles.root,
        useFullWidthBackdrop ? styles.rootMobile : { top: insets.top },
      ]}
    >
      {useFullWidthBackdrop && (
        <ChatHeaderBackdrop height={backdropHeight} />
      )}

      <View
        style={[
          styles.content,
          useFullWidthBackdrop
            ? { paddingTop: insets.top }
            : { paddingTop: 10 },
        ]}
        onLayout={handleContentLayout}
      >
        <BlurredView
          style={[styles.headerColumnContainer, { borderRadius: activeRadius }]}
          isBorderActive={false}
        >
          {(!selectedMessages || selectedMessages.length === 0) && (
            <MainHeader
              chatUUIDorHandle={chatUUIDorHandle}
              chatType={chatType}
              selectedChatName={name}
              selectedChatPictureUUID={profilePictureUUID}
              memberCount={memberCount}
              onlineMembersCount={onlineMembersCount}
              memberActivityData={memberActivityData}
              lastAccessAt={lastAccessAt}
              contentView={contentView}
              setContentView={setContentView}
              onBack={onBack}
              navToOverview={navToOverview}
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
      </View>
    </View>
  );
};

function createStyle() {
  return StyleSheet.create({
    root: {
      position: "absolute",
      left: 0,
      right: 0,
      width: "100%",
      zIndex: 1,
    },
    rootMobile: {
      top: 0,
    },
    content: {
      width: "100%",
      paddingHorizontal: 10,
      paddingBottom: 10,
    },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      paddingBottom: 0,
      paddingHorizontal: 8,
    },
  });
}

export default React.memo(Header);
