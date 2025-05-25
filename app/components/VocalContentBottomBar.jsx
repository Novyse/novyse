import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import VocalBottomBarButton from "./VocalBottomBarButton";

const audioOnly = true; // Imposta audioOnly a true per iniziare con l'audio

const VocalContentBottomBar= ({ chatId, selfJoined, selfLeft, WebRTC }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!audioOnly);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinVocal = async () => {
    try {
      setIsLoading(true);
      // Start with audio only
      const stream = await WebRTC.startLocalStream(audioOnly);
      if (!stream) {
        throw new Error("Failed to get audio stream");
      }

      if(WebRTC.chatId != chatId) {
        await APIMethods.commsLeave(chatId);
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
      alert(
        "Could not join vocal chat. Please check your microphone permissions."
      );
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
      }    }
  };
  
  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        // Attiva video
        const videoTrack = await WebRTC.addVideoTrack();
        if (videoTrack) {
          setIsVideoEnabled(true);
        }
      } else {
        // Disattiva video
        await WebRTC.removeVideoTracks();
        setIsVideoEnabled(false);
      }
    } catch (err) {
      console.error('Errore nel toggle video:', err);
      alert("Errore nel toggle video: " + err.message);
    }
  };

  return (
    <View style={styles.container}>
      {!isJoinedVocal ? (
        isLoading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : (
          <VocalBottomBarButton
            onPress={handleJoinVocal}
            iconName="phone"
            iconColor="green"
          />
        )
      ) : (
        <View style={styles.container}>
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
            onPress={async () => {
              const data = await APIMethods.commsLeave();
              if (data.comms_left) {
                await selfLeft(data);
                setIsJoinedVocal(false);
                setIsVideoEnabled(!audioOnly);
                setIsAudioEnabled(true);
              }
            }}
            iconName="phone"
            iconColor="red"
          />
        </View>
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
