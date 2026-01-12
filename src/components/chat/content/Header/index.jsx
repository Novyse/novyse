import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";

import HeaderBase from "@/src/components/HeaderBase";
import BlurredView from "@/src/components/BlurredView";

import MainHeader from "./main";
import AudioHeader from "./audio";
import PinnedMessageHeader from "./pinnedMessage";

import { ThemeContext } from "@/context/ThemeContext";
import { AudioPlayerContext } from "@/context/AudioPlayerContext";

const Header = ({
  selectedChatName,
  contentView,
  setContentView,
  isSmallScreen,
  onBack,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { currentUri } = useContext(AudioPlayerContext);

  const isVoiceActive = !!currentUri;
  const hasPinnedMessage = false; // Temp

  const isHeaderExpanded = hasPinnedMessage || isVoiceActive;

  const activeRadius = isHeaderExpanded ? 15 : 100;

  return (
    <View style={styles.headerWrapper}>
      <HeaderBase style={[styles.headerBase, { borderRadius: activeRadius }]}>
        <BlurredView
          style={[styles.headerColumnContainer, { borderRadius: activeRadius }]}
        >
          <MainHeader
            selectedChatName={selectedChatName}
            contentView={contentView}
            setContentView={setContentView}
            isSmallScreen={isSmallScreen}
            onBack={onBack}
          />
          {hasPinnedMessage && <PinnedMessageHeader />}
          {isVoiceActive && <AudioHeader />}
        </BlurredView>
      </HeaderBase>
    </View>
  );
};

function createStyle(theme) {
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
