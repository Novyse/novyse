import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import VocalBottomBarButton from "./VocalBottomBarButton";

const VocalContentBottomBar= ({ chatId, selfJoined, selfLeft, WebRTC }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
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
      }    }
  };
  
  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        // Attiva video: aggiungi la traccia video con constraints specifici        console.log('Attivando video...');
        
        // Usa constraints specifici per mantenere aspect ratio
        const videoConstraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16/9 },
            facingMode: 'user'
          }
        };
        
        const videoStream = await WebRTC.addVideoTrack(videoConstraints);
        if (videoStream) {
          setIsVideoEnabled(true);
          
          // Rinegozia con tutti i peer
          for (const peerId of Object.keys(WebRTC.peerConnections)) {
            await WebRTC.createOffer(peerId);
          }
          
          console.log('Video attivato con successo');
          
          // Forza l'aggiornamento dell'interfaccia
          if (WebRTC.onStreamUpdate) {
            WebRTC.onStreamUpdate();
          }
        }
      } else {
        // Disattiva video: rimuovi completamente la traccia video
        console.log('Disattivando video...');
        if (WebRTC.localStream) {
          const videoTracks = WebRTC.localStream.getVideoTracks();
          console.log(`Trovate ${videoTracks.length} tracce video da rimuovere`);
          
          // Ferma e rimuovi tutte le tracce video
          videoTracks.forEach(track => {
            console.log(`Fermando traccia video: ${track.id}, stato: ${track.readyState}`);
            track.stop();
            WebRTC.localStream.removeTrack(track);
          });
          
          // Rimuovi le tracce dalle peer connections
          for (const peerId of Object.keys(WebRTC.peerConnections)) {
            const pc = WebRTC.peerConnections[peerId];
            const senders = pc.getSenders();
            
            senders.forEach(sender => {
              if (sender.track && sender.track.kind === 'video') {
                console.log(`Rimuovendo sender video per peer: ${peerId}`);
                pc.removeTrack(sender);
              }
            });
            
            // Rinegozia la connessione
            await WebRTC.createOffer(peerId);
          }
          
          setIsVideoEnabled(false);
          
          // Attende un momento per assicurarsi che le tracce siano completamente rimosse
          setTimeout(() => {
            // Forza l'aggiornamento dell'interfaccia
            if (WebRTC.onStreamUpdate) {
              WebRTC.onStreamUpdate();
            }
            
            // Notifica anche il cambio di stream locale
            if (WebRTC.onLocalStreamReady) {
              WebRTC.onLocalStreamReady(WebRTC.localStream);
            }
          }, 100);
          
          console.log('Video disattivato con successo');
        }
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
                setIsVideoEnabled(true);
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
