import React, { useState, useCallback, useContext } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserProfileAvatar from "./UserProfileAvatar";
import multiPeerWebRTCManager from "../utils/webrtcMethods";

import utils from "../utils/webrtc/utils";
const { get } = utils;

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

  // Calcolo ottimizzato del layout considerando anche le screen share
  const calculateLayout = useCallback(() => {
    // Calcola il numero totale di elementi da visualizzare (utenti + screen shares)
    let totalElements = profiles.length;
    profiles.forEach(profile => {
      if (profile.active_screen_share && Array.isArray(profile.active_screen_share)) {
        totalElements += profile.active_screen_share.length;
      }
    });

    if (
      !containerDimensions.width ||
      !containerDimensions.height ||
      totalElements === 0
    ) {
      return { numColumns: 0, rectWidth: 0, rectHeight: 0, margin: MARGIN };
    }

    const { width, height } = containerDimensions;
    const isPortrait = height > width;

    let numColumns, numRows;

    // Logica specifica per 2 persone
    if (totalElements === 2) {
      numColumns = 2;
      numRows = 1;
    }
    // Logica per l'orientamento verticale (portrait) con più di 2 elementi
    else if (isPortrait && totalElements <= 3) {
      numColumns = 1;
      numRows = totalElements;
    } else {
      numColumns = Math.ceil(Math.sqrt(totalElements));
      numRows = Math.ceil(totalElements / numColumns);
      
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(totalElements / numColumns);
      }
    }

    // Calcola lo spazio disponibile
    const availableWidth = width - (MARGIN * 2);
    const availableHeight = height - (MARGIN * 2);

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO;
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO);

    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {
      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }

    rectWidth = Math.max(50, rectWidth);
    rectHeight = Math.max(50 / ASPECT_RATIO, rectHeight);

    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, profiles]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();  // Render function for screen shares
  const renderScreenShare = (profile, shareId) => {
    const activeStream = activeStreams[shareId];
    let streamToRender = null;
    
    if (activeStream?.stream) {
      streamToRender = activeStream.stream;
    } else if (multiPeerWebRTCManager.remoteStreams[shareId]) {
      streamToRender = multiPeerWebRTCManager.remoteStreams[shareId];
    }

    const hasVideo = streamToRender?.getVideoTracks().length > 0;
    const displayName = `${profile.handle || profile.from || 'Unknown'} : Screen Share`;

    return (
      <View
        key={shareId}
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
            <View style={styles.videoWrapper}>
              {Platform.OS === "web" ? (
                <RTCView
                  stream={streamToRender}
                  style={styles.videoStream}
                />
              ) : (
                <RTCView
                  streamURL={streamToRender.toURL()}
                  style={styles.videoStream}
                />
              )}
            </View>
          ) : (
            <UserProfileAvatar 
              userHandle={displayName}
              profileImageUri={null}
              containerWidth={rectWidth}
              containerHeight={rectHeight}
            />
          )}
        </View>
      </View>
    );
  };  // Render function for user profiles
  const renderProfile = (profile) => {
    const participantId = profile.from;
    const activeStream = activeStreams[participantId];
    const isLocalUser = participantId === get.myId();
    
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

    return (
      <View
        key={participantId} 
        style={[
          styles.profile,
          {
            width: rectWidth,
            height: rectHeight,
            margin: margin / 2,
          }
        ]}
      >
        <View style={styles.videoContainer}>
          {hasVideo && streamToRender ? (
            <View style={styles.videoWrapper}>
              {Platform.OS === "web" ? (
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
              )}
            </View>
          ) : (
            <UserProfileAvatar 
              userHandle={activeStream?.userData?.handle || profile.handle || 'Loading...'}
              profileImageUri={activeStream?.userData?.profileImageUri || profile.profileImageUri}
              containerWidth={rectWidth}
              containerHeight={rectHeight}
            />
          )}
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[
        styles.grid, 
        { 
          width: containerDimensions.width,
        }
      ]}>
        {profiles.length > 0 ? (
          <>
            {/* Render user profiles */}
            {profiles.map(renderProfile)}
            
            {/* Render screen shares */}
            {profiles.map(profile => {
              if (profile.active_screen_share && Array.isArray(profile.active_screen_share)) {
                return profile.active_screen_share.map(shareId => 
                  renderScreenShare(profile, shareId)
                );
              }
              return null;
            })}
          </>
        ) : (
          <Text style={styles.emptyChatText}>Nessun utente nella chat 😔</Text>
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
    justifyContent: "space-evenly", 
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
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
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