import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import VocalBottomBarButton from "./VocalBottomBarButton";


const VocalContentBottomBar = ({ chatId, selfJoined, selfLeft, WebRTC }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Start with video disabled
  const [isLoading, setIsLoading] = useState(false);

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
      }
    }
  };

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      // Attiva video: aggiungi la traccia video e rinegozia
      try {
        const videoStream = await WebRTC.addVideoTrack(); // Implementa questo metodo nel tuo WebRTC manager!
        if (videoStream) {
          setIsVideoEnabled(true);
          // Rinegozia con tutti i peer
          for (const peerId of Object.keys(WebRTC.peerConnections)) {
            await WebRTC.createOffer(peerId);
          }
        }
      } catch (err) {
        alert("Errore nell'attivare la webcam: " + err.message);
      }
    } else {
      // Disattiva video: rimuovi la traccia video e rinegozia
      try {
        const videoTrack = WebRTC.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          WebRTC.localStream.removeTrack(videoTrack);
          // Rimuovi la traccia da tutte le peer connection
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
      } catch (err) {
        alert("Errore nel disattivare la webcam: " + err.message);
      }
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
            iconName={isVideoEnabled ? "videocam-off" : "videocam"}
            iconColor={theme.icon}
          />
          <VocalBottomBarButton
            onPress={async () => {
              const data = await APIMethods.commsLeave();
              if (data.comms_left) {
                
                await selfLeft(data);
                
                await selfLeft(data);
                setIsJoinedVocal(false);
                setIsVideoEnabled(false);
                setIsAudioEnabled(true);
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
