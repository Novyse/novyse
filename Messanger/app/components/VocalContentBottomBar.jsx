import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import VocalBottomBarButton from "./VocalBottomBarButton";
import { Platform } from "react-native";

const VocalContentBottomBar = ({
  chatId,
  selfJoined,
  selfLeft,
  WebRTC
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Start with video disabled
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleJoinVocal = async () => {
    try {
      setIsLoading(true);
      // Start with audio only
      const stream = await WebRTC.startLocalStream(true);
      if (!stream) {
        throw new Error("Failed to get audio stream");
      }

      const data = await APIMethods.commsJoin(chatId);
      if (data.comms_joined) {
        await selfJoined({
          from: data.from,
          handle: await localDatabase.fetchLocalUserHandle(),
          chat_id: chatId,
        });
        setIsJoinedVocal(true);
      }
    } catch (error) {
      console.error("Error joining vocal:", error);
      alert("Could not join vocal chat. Please check your microphone permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = () => {
    if (WebRTC.localStream) {
      const audioTrack = WebRTC.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        // Try to add video track
        const videoTrack = await WebRTC.addVideoTrack();
        if (videoTrack) {
          setIsVideoEnabled(true);
        }
      } else {
        // Remove video track if it exists
        const videoTrack = WebRTC.localStream?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          WebRTC.localStream.removeTrack(videoTrack);
          
          // Renegotiate with all peers
          for (const peerId of Object.keys(WebRTC.peerConnections)) {
            const pc = WebRTC.peerConnections[peerId];
            const sender = pc.getSenders().find(s => s.track === videoTrack);
            if (sender) {
              pc.removeTrack(sender);
              await WebRTC.createOffer(peerId);
            }
          }
          setIsVideoEnabled(false);
        }
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      alert("Could not toggle video. Please check your camera permissions.");
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await WebRTC.startScreenSharing();
        if (screenStream) {
          setIsScreenSharing(true);

          // Add listener for when user stops sharing via browser UI
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
        }
      } else {
        // Stop screen sharing
        const screenShareId = `screen_${WebRTC.myId}`;
        await WebRTC.stopScreenSharing(screenShareId);
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      alert("Could not share screen. Please check your permissions.");
      setIsScreenSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {!isJoinedVocal ? (
        <>
          {isLoading ? (
            <View style={styles.iconButton}>
              <ActivityIndicator color={theme.icon} size="small" />
            </View>
          ) : (
            <VocalBottomBarButton
              onPress={handleJoinVocal}
              iconName="phone"
              iconColor="green"
            />
          )}
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
              <VocalBottomBarButton
                onPress={handleScreenShare}
                iconName={isScreenSharing ? "stop-screen-share" : "screen-share"}
                iconColor={theme.icon}
              />
          <VocalBottomBarButton
            onPress={async () => {
              const data = await APIMethods.commsLeave();
              if (data.comms_left) {
                // Stop screen sharing if active when leaving
                if (isScreenSharing) {
                  const screenShareId = `screen_${WebRTC.myId}`;
                  await WebRTC.stopScreenSharing(screenShareId);
                }
                await selfLeft(data);
                setIsJoinedVocal(false);
                setIsVideoEnabled(false);
                setIsAudioEnabled(true);
                setIsScreenSharing(false);
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
    
    iconButton: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default VocalContentBottomBar;
