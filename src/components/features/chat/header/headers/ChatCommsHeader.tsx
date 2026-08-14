import React, { useContext } from "react";
import { StyleSheet, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import Icon from "@/src/components/ui/icon/Icon";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";

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

  const localIdentity = room?.localParticipant?.identity;
  const isSpeaking = localIdentity ? isSpeakingMap.get(localIdentity) : false;


  const chatUUID = roomName?.split("_")[0] ?? "";
  const sub = roomName?.split("_")[1] ?? "";
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

  if (!connected && !roomName) {
    return null;
  }

  return (
    <AppHeaderRow
      left={
        <Pressable onPress={handlePress} style={styles.headerLeft}>
          <Icon
            name="UserGroupIcon"
            onPress={handlePress}
            style={headerIconButtonStyle.iconButton}
          />
          <Typography
            weight="semibold"
            numberOfLines={1}
            ellipsizeMode="tail"
            translationKey="chat.comms.participantsInCall"
            translationOptions={{ count: participantsCount }}
          />
        </Pressable>
      }
      right={
        connected ? (
          <>
            <Icon
              name={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
              style={headerIconButtonStyle.iconButton}
              onPress={toggleVideo}
            />
            <Icon
              name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
              style={headerIconButtonStyle.iconButton}
              onPress={toggleAudio}
            />
            <Icon
              name="Call02Icon"
              color={theme.iconDanger}
              hoverColor={theme.iconDanger}
              style={headerIconButtonStyle.iconButton}
              onPress={leave}
            />
          </>
        ) : (
          <Icon
            name="Call02Icon"
            color={theme.iconSuccess}
            hoverColor={theme.iconSuccess}
            style={headerIconButtonStyle.iconButton}
            onPress={() => join()}
          />
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
});

export default CommsHeader;
