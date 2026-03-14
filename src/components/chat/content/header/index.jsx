import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderBase from "@/src/components/HeaderBase";
import BlurredView from "@/src/components/BlurredView";

import MainHeader from "./main";
import AudioHeader from "./audio";
import PinnedMessageHeader from "./pinnedMessage";

import { ThemeContext } from "@/context/ThemeContext";
import { AudioPlayerContext } from "@/context/AudioPlayerContext";
import useChatStore from "@/context/ChatContext";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";

const Header = ({
  chatUUIDorHandle,
  contentView,
  setContentView,
  isSmallScreen,
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
  const hasPinnedMessage = pinnedMessages && pinnedMessages.length > 0;

  const isHeaderExpanded = hasPinnedMessage || isVoiceActive;

  const activeRadius = isHeaderExpanded ? 15 : 100;

  return (
    <View style={styles.headerWrapper}>
      <HeaderBase style={[styles.headerBase, { borderRadius: activeRadius }]}>
        <BlurredView
          style={[styles.headerColumnContainer, { borderRadius: activeRadius }]}
        >
          <MainHeader
            chatUUIDorHandle={chatUUIDorHandle}
            selectedChatName={name}
            selectedChatPictureUUID={profilePictureUUID}
            contentView={contentView}
            setContentView={setContentView}
            isSmallScreen={isSmallScreen}
          />
          {hasPinnedMessage && (
            <PinnedMessageHeader pinnedMessages={pinnedMessages} />
          )}
          {isVoiceActive && <AudioHeader />}
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
