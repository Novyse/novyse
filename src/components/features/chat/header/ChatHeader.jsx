import React, { useContext } from "react";
import { useScreen } from "@/src/context/ScreenContext";
import AppHeader from "@/src/components/features/header/AppHeader";
import MainHeader from "./headers/ChatMainHeader";
import SelectedHeader from "./headers/ChatSelectedHeader";
import SearchHeader from "./headers/ChatSearchHeader";
import AudioHeader from "./headers/ChatAudioHeader";
import PinnedMessageHeader from "./headers/ChatPinnedMessagesHeader";
import CommsHeader from "./headers/ChatCommsHeader";
import { AudioPlayerContext } from "@/src/context/AudioPlayerContext";
import useChatStore from "@/src/context/ChatContext";
import { useCommsContext } from "@/src/context/CommsContext";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

const ChatHeader = ({
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
  const { isSmallScreen: isMobileLayout } = useScreen();
  const useFullWidthBackdrop = isMobileLayout;
  const { currentUri } = useContext(AudioPlayerContext);
  const isVoiceActive = !!currentUri;
  const setHeaderHeight = useActiveChatStore((state) => state.setHeaderHeight);
  const [searchMode, setSearchMode] = React.useState(false);
  const hasSelection = selectedMessages && selectedMessages.length > 0;

  React.useEffect(() => {
    setSearchMode(false);
  }, [chatUUIDorHandle]);

  React.useEffect(() => {
    if (hasSelection) setSearchMode(false);
  }, [hasSelection]);

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

  const chatData = useActiveChatStore((state) => state.activeChatData);
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const subType = chatData?.subs?.find((s) => s.id === selectedSub)?.type;

  const { connected, room, participants } = useCommsContext();
  const hasPinnedMessage = pinnedMessages && pinnedMessages.length > 0;
  const commsRoomChatUUID = room?.roomInfo?.name
    ? room.roomInfo.name.split("_")[0]
    : null;
  const hasComms = connected && commsRoomChatUUID === chatUUIDorHandle;
  const isHeaderExpanded = hasPinnedMessage || hasComms || isVoiceActive;

  const handleContentLayout = React.useCallback(
    (height) => {
      if (setHeaderHeight) {
        setHeaderHeight(height);
      }
    },

    [setHeaderHeight],
  );

  const rowContent = hasSelection ? (
    <SelectedHeader
      chatUUIDorHandle={chatUUIDorHandle}
      selectedMessages={selectedMessages}
      setSelectedMessages={setSelectedMessages}
      isSmallScreen={isSmallScreen}
      onReply={onReply}
      onForward={onForward}
      onDelete={onDelete}
    />
  ) : searchMode ? (
    <SearchHeader onClose={() => setSearchMode(false)} />
  ) : (
    <MainHeader
      chatUUIDorHandle={chatUUIDorHandle}
      chatType={chatType}
      subType={subType}
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
      onOpenSearch={() => setSearchMode(true)}
    />
  );

  return (
    <AppHeader
      expanded={isHeaderExpanded}
      fullWidthBackdrop={useFullWidthBackdrop}
      onLayout={handleContentLayout}
      footer={
        isHeaderExpanded ? (
          <>
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
          </>
        ) : null
      }
    >
      {rowContent}
    </AppHeader>
  );
};

export default React.memo(ChatHeader);
