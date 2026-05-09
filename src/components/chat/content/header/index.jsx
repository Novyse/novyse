import React, { useContext } from "react";
import { StyleSheet } from "react-native";

import HeaderBase from "@/src/components/HeaderBase";
import BlurredView from "@/src/components/BlurredView";

import MainHeader from "./main";
import SelectedHeader from "./SelectedHeader";
import AudioHeader from "./audio";
import PinnedMessageHeader from "./pinnedMessage";
import CommsHeader from "./CommsHeader";

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
  navToOverview,
  isSmallScreen,
  onReply,
  onForward,
  onDelete,
}) => {
  const styles = createStyle();

  const { currentUri } = useContext(AudioPlayerContext);

  const isVoiceActive = !!currentUri;

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

  return (
    <HeaderBase style={[styles.headerBase, { borderRadius: activeRadius }]}>
      <BlurredView
        style={[styles.headerColumnContainer, { borderRadius: activeRadius }]}
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
    </HeaderBase>
  );
};
function createStyle() {
  return StyleSheet.create({
    headerBase: {
      overflow: "hidden",
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
