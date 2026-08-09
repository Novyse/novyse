import React, { useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import Icon from "@/src/components/ui/icon/Icon";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import {
  HEADER_ROW_HEIGHT,
  ICON_BUTTON_SIZE,
} from "@/constants/headers";

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
        <Icon name="UserMultipleIcon" onPress={()=>{}} />
        <Typography
          style={styles.participantsText}
          numberOfLines={1}
          ellipsizeMode="tail"
          translationKey="chat.comms.participantsInCall"
          translationOptions={{ count: participantsCount }}
        />
      </View>

      <View style={styles.headerRight}>
        {connected ? (
          <>
            <Icon
              name={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
              style={styles.iconButton}
              onPress={toggleVideo}
            />
            <Pressable style={styles.iconButton} onPress={toggleAudio}>
              <Icon name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"} />
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  animatedMicStyle,
                  {
                    pointerEvents: "none",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Icon
                  name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                  color={theme.iconSuccess}
                />
              </Animated.View>
            </Pressable>
            <Icon
              name={"Call02Icon"}
              color={theme.iconDanger}
              hoverColor={theme.iconDanger}
              style={styles.iconButton}
              onPress={leave}
            />
          </>
        ) : (
          <Icon
            name="Call02Icon"
            color={theme.iconSuccess}
            hoverColor={theme.iconSuccess}
            style={styles.iconButton}
            onPress={() => join()}
          />
        )}
      </View>
    </Pressable>
  );
};

function createStyle(theme: any, connected: boolean) {
  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: HEADER_ROW_HEIGHT,
      width: "100%",
      // paddingHorizontal: 6,
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    headerLeft: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 4,
      overflow: "hidden",
    },
    headerRight: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    participantsText: {
      flex: 1,
      flexShrink: 1,
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
    },
  });
}

export default CommsHeader;
