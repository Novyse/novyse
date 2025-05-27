import React, { useState, useEffect, useContext, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Platform, Dimensions } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserProfileAvatar from "./UserProfileAvatar";
import multiPeerWebRTCManager from "../utils/webrtcMethods";

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 4;

const VocalMembersLayout = ({ profiles, activeStreams = {} }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const { theme } = useContext(ThemeContext);

  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);
  // Calcolo ottimizzato del layout
  const calculateLayout = useCallback(() => {
    if (
      !containerDimensions.width ||
      !containerDimensions.height ||
      profiles.length === 0
    ) {
      return { numColumns: 0, rectWidth: 0, rectHeight: 0, margin: MARGIN };
    }

    const { width, height } = containerDimensions;
    const isPortrait = height > width; // Determina l'orientamento

    let numColumns, numRows;

    // Logica per l'orientamento verticale (portrait)
    if (isPortrait && profiles.length <= 2) {
      // Per 1 o 2 utenti in verticale, usa una colonna (uno sopra l'altro)
      numColumns = 1;
      numRows = profiles.length;
    } else {
      // Per altri casi, usa un layout bilanciato
      numColumns = Math.ceil(Math.sqrt(profiles.length));
      numRows = Math.ceil(profiles.length / numColumns);
      // In portrait, se ci sono poche righe, riduci il numero di colonne per sfruttare l'altezza
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(profiles.length / numColumns);
      }
    }    // Calcola lo spazio disponibile considerando solo il padding del container
    const containerPadding = MARGIN * 2; // Padding del container
    const availableWidth = width - containerPadding;
    const availableHeight = height - containerPadding;

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = Math.max(0, availableWidth / numColumns);
    const maxRectHeight = Math.max(0, availableHeight / numRows);
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO; // Larghezza basata su altezza
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO); // Altezza basata su larghezza

    // Scegli la dimensione che rispetta il rapporto e massimizza lo spazio
    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {
      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }

    // Assicurati che le dimensioni non siano negative o troppo piccole
    rectWidth = Math.max(50, rectWidth);
    rectHeight = Math.max(50 / ASPECT_RATIO, rectHeight);

    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, profiles.length]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();
  const renderProfile = (profile) => {
    const participantId = profile.from;
    const activeStream = activeStreams[participantId];
    const isLocalUser = participantId === multiPeerWebRTCManager.myId;
    
    // Determina quale stream utilizzare
    let streamToRender = null;
    if (isLocalUser && multiPeerWebRTCManager.localStream) {
      streamToRender = multiPeerWebRTCManager.localStream;
    } else if (activeStream?.stream) {
      streamToRender = activeStream.stream;
    } else if (multiPeerWebRTCManager.remoteStreams[participantId]) {
      streamToRender = multiPeerWebRTCManager.remoteStreams[participantId];
    }

    const hasVideo = streamToRender?.getVideoTracks().length > 0;
    const hasAudio = streamToRender?.getAudioTracks().length > 0;    return (      <Pressable 
        key={participantId} 
        style={[
          styles.profile,
          {
            width: rectWidth,
            height: rectHeight,
            marginRight: margin,
            marginBottom: margin,
          }
        ]}
      >
        <View style={styles.videoContainer}>
          {hasVideo && streamToRender ? (
            // Rendering video stream
            Platform.OS === "web" ? (
              <RTCView
                stream={streamToRender}
                style={styles.videoStream}
                muted={isLocalUser}
              />
            ) : (
              <RTCView
                streamURL={streamToRender.toURL()}
                style={styles.videoStream}
                muted={isLocalUser}
              />
            )
          ) : (            
            // Rendering avatar con gradiente se non c'è video
            <UserProfileAvatar 
              userHandle={activeStream?.userData?.handle || profile.handle || 'Loading...'}
              profileImageUri={activeStream?.userData?.profileImageUri || profile.profileImageUri}
              containerWidth={rectWidth}
              containerHeight={rectHeight}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[
        styles.grid, 
        { 
          width: containerDimensions.width,
          padding: margin,
        }
      ]}>
        {profiles.length > 0 ? (
          <>
            {profiles.map(renderProfile)}
          </>
        ) : (
          <Text style={styles.emptyChatText}>Nessun utente nella chat</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },  
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  profile: {
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 10,
  },
  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  profileText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  emptyChatText: {
    color: "white",
    fontSize: 20,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: 8,
    margin: 0,
    borderRadius: 8,
    alignContent: "center",
  },
});

export default VocalMembersLayout;