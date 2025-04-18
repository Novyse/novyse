import React, { useContext, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import VocalBottomBarButton from "./VocalBottomBarButton";
import { Platform } from "react-native";

const VocalContentBottomBar = ({
  chatId,
  selfJoined,
  selfLeft,
  WebRTC,
  onScreenShare,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const toggleAudio = () => {
    if (WebRTC.localStream) {
      const audioTrack = WebRTC.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (WebRTC.localStream) {
      const videoTrack = WebRTC.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <View style={styles.container}>
      {!isJoinedVocal ? (
        <>
          <VocalBottomBarButton
            onPress={async () => {
              const data = await APIMethods.commsJoin(chatId);
              if (data.comms_joined) {
                selfJoined({
                  from: data.from,
                  handle: await localDatabase.fetchLocalUserHandle(),
                  chat_id: chatId,
                });
                setIsJoinedVocal(true);
              }
            }}
            iconName="phone"
            iconColor="green"
          />
        </>
      ) : (
        <>
          <VocalBottomBarButton
            onPress={toggleAudio}
            iconName={isAudioEnabled ? "mic" : "mic-off"}
            iconColor={theme.icon}
          />
          <VocalBottomBarButton
            onPress={toggleVideo}
            iconName={isVideoEnabled ? "videocam" : "videocam-off"}
            iconColor={theme.icon}
          />
          {Platform.OS === "web" && (
            <VocalBottomBarButton
              onPress={onScreenShare}
              iconName="screen-share"
              iconColor="white"
            />
          )}
          <VocalBottomBarButton
            onPress={async () => {
              const data = await APIMethods.commsLeave();
              if (data.comms_left) {
                selfLeft(data);
                setIsJoinedVocal(false);
              }
            }}
            iconName="phone"
            iconColor="red"
          />
        </>
      )}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 15,
    },
  });

export default VocalContentBottomBar;
