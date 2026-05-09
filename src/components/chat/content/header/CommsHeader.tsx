import React, { useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import AppText from "@/src/components/AppText";

import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import Icon from "@/src/components/Icon";

import { ThemeContext } from "@/context/ThemeContext";
import { useCommsContext } from "@/context/CommsContext";
import { useActiveChatStore } from "@/context/ActiveChatContext";

import useCommsAction from "@/src/hooks/comms/useCommsAction";

interface CommsHeaderProps {
  connected: boolean;
  roomName: string;
  participantsCount?: number;
}

const CommsHeader: React.FC<CommsHeaderProps> = ({
  connected,
  roomName,
  participantsCount = 0,
}) => {
  const { theme } = useContext(ThemeContext);
  const { room, isSpeakingMap } = useCommsContext();
  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const setContentView = useActiveChatStore((state) => state.setContentView);
  const styles = createStyle(theme, connected);

  const localIdentity = room?.localParticipant?.identity;
  const isSpeaking = localIdentity ? isSpeakingMap.get(localIdentity) : false;

  const animatedMicStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isSpeaking ? 1 : 0, { duration: 150 }),
    };
  });

  if (!connected && !roomName) {
    return null;
  }

  const chatUUID = roomName.split("_")[0];
  const sub = roomName.split("_")[1];
  const {
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    join,
    leave,
  } = useCommsAction(chatUUID, sub);

  const handlePress = () => {
    if (selectedChatUUID === chatUUID) {
      setContentView("vocal");
      return;
    }
    setSelectedChatUUID(chatUUID);
  };

  return (
    <Pressable style={styles.headerMainRow} onPress={handlePress}>
      <View style={styles.headerLeft}>
        <Icon
          name="UserMultipleIcon"
          color={connected ? "#fff" : theme.text}
          style={styles.iconButtonSmall}
        />
        <AppText
          style={styles.participantsText}
          numberOfLines={1}
          translationKey="chat.comms.participantsInCall"
          translationOptions={{ count: participantsCount }}
        />
      </View>

      <View style={styles.headerRight}>
        {connected ? (
          <>
            <Icon
              name={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
              color={"#fff"}
              style={styles.iconButton}
              onPress={toggleVideo}
            />
            <Pressable style={styles.iconButton} onPress={toggleAudio}>
              <Icon
                name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                color={"#fff"}
              />
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  animatedMicStyle,
                  { pointerEvents: "none" },
                ]}
              >
                <Icon
                  name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                  color={"#2ECC71"}
                />
              </Animated.View>
            </Pressable>
            <Icon
              name={"Call02Icon"}
              color="red"
              hoverColor={theme.iconDanger}
              onPress={leave}
            />
          </>
        ) : (
          <Icon
            name="Call02Icon"
            color={"#2ECC71"}
            hoverColor={theme.iconSuccess}
            onPress={() => join()}
          />
        )}
      </View>
    </Pressable>
  );
};

function createStyle(theme: any, connected: boolean) {
  const HEADER_MAIN_HEIGHT = 60;
  const ICON_SIZE = 34;

  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: HEADER_MAIN_HEIGHT,
      width: "100%",
      paddingHorizontal: 10,
      borderRadius: 15,
      backgroundColor: "transparent",
      marginBottom: 10,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 50,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingRight: 4,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    iconButtonSmall: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    iconButtonAction: {
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    participantsText: {
      fontSize: 16,
      color: connected ? "#fff" : theme.text,
      fontWeight: "600",
    },
  });
}

export default CommsHeader;
