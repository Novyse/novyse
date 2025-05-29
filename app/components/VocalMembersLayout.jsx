import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import { View, StyleSheet, Text, Pressable, Platform, Dimensions, Animated } from "react-native";
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
  const pulseAnimations = useRef({});  // Initialize pulse animations for speaking detection (including screen shares)
  useEffect(() => {
    profiles.forEach(profile => {
      const userId = profile.from;
      if (userId && !pulseAnimations.current[userId]) {
        pulseAnimations.current[userId] = new Animated.Value(0);
      }
      
      // Add animations for screen shares (usando direttamente shareId che è già unico)
      if (profile.active_screen_share && Array.isArray(profile.active_screen_share)) {
        profile.active_screen_share.forEach(shareId => {
          if (!pulseAnimations.current[shareId]) {
            pulseAnimations.current[shareId] = new Animated.Value(0);
          }
        });
      }
    });
  }, [profiles]);  // Handle speaking state changes based on profiles' is_speaking property
  const speakingUsersMap = useMemo(() => {
    const currentSpeakingUsers = {};
    profiles.forEach(profile => {
      const userId = profile.from;
      if (profile.is_speaking) {
        currentSpeakingUsers[userId] = true;
      }
    });
    return currentSpeakingUsers;
  }, [profiles.map(p => `${p.from}:${p.is_speaking}`).join(',')]); // Only re-compute when speaking states change

  useEffect(() => {
    // Handle animations for all users
    Object.keys(pulseAnimations.current).forEach(animationKey => {
      const isSpeaking = speakingUsersMap[animationKey];
      const animation = pulseAnimations.current[animationKey];
      
      if (animation) {
        // Stop any existing animation first
        animation.stopAnimation();
        
        if (isSpeaking) {
          // Smooth entry animation then loop
          Animated.sequence([
            Animated.timing(animation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true, // Use native driver for better performance
            }),
            Animated.loop(
              Animated.sequence([
                Animated.timing(animation, {
                  toValue: 0.3,
                  duration: 800,
                  useNativeDriver: true,
                }),
                Animated.timing(animation, {
                  toValue: 1,
                  duration: 800,
                  useNativeDriver: true,
                }),
              ])
            )
          ]).start();
        } else {
          // Smooth exit animation
          Animated.timing(animation, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      }
    });
  }, [speakingUsersMap]);

  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);  // Calcolo ottimizzato del layout considerando anche le screen share
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
    const isLargeScreen = width > 600;

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
  }, [containerDimensions, profiles.length, profiles.map(p => p.active_screen_share?.length || 0).join(',')]); // Only depend on layout-affecting changes
  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();
  // Memoized render function for screen shares to prevent unnecessary re-renders
  const renderScreenShare = useCallback((profile, shareId) => {
    const participantId = profile.from;
    const userPulseAnim = pulseAnimations.current[participantId] || new Animated.Value(0);
    
    const activeStream = activeStreams[shareId];
    let streamToRender = null;
    
    if (activeStream?.stream) {
      streamToRender = activeStream.stream;
    } else if (multiPeerWebRTCManager.remoteStreams[shareId]) {
      streamToRender = multiPeerWebRTCManager.remoteStreams[shareId];
    }

    const hasVideo = streamToRender?.getVideoTracks().length > 0;

    // Create animated border effect that doesn't affect layout
    const borderColor = userPulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 255, 0, 0.8)'],
    });

    const borderWidth = userPulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 3],
    });

    const displayName = `${profile.handle || profile.from || 'Unknown'} : Screen Share`;    return (
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
      >        <View style={styles.videoContainer}>
          {hasVideo && streamToRender ? (
            <Animated.View style={[
              styles.videoWrapper,
              {
                borderColor: borderColor,
                borderWidth: borderWidth,
                borderRadius: 8,
                overflow: 'hidden',
              }
            ]}>
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
            </Animated.View>) : (
            <Animated.View style={[
              {
                borderColor: borderColor,
                borderWidth: borderWidth,
                borderRadius: 8,
                overflow: 'hidden',
              }
            ]}>
              <UserProfileAvatar 
                userHandle={displayName}
                profileImageUri={null}
                containerWidth={rectWidth}
                containerHeight={rectHeight}
              />            </Animated.View>
          )}
        </View>
      </View>
    );
  }, []); // NO dependencies to prevent re-renders
    // Memoized render function for user profiles to prevent unnecessary re-renders
  const renderProfile = useCallback((profile) => {
    const participantId = profile.from;
    const activeStream = activeStreams[participantId];
    const isLocalUser = participantId === get.myId();
    
    const pulseAnim = pulseAnimations.current[participantId] || new Animated.Value(0);
    
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

    // Create animated border effect that doesn't affect layout
    const borderColor = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 255, 0, 0.8)'],
    });

    const borderWidth = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 3],
    });    return (
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
      >        <View style={styles.videoContainer}>
          {hasVideo && streamToRender ? (
            <Animated.View style={[
              styles.videoWrapper,
              {
                borderColor: borderColor,
                borderWidth: borderWidth,
                borderRadius: 8,
                overflow: 'hidden',
              }
            ]}>
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
            </Animated.View>
          ) : (            <Animated.View style={[
              {
                borderColor: borderColor,
                borderWidth: borderWidth,
                borderRadius: 8,
                overflow: 'hidden',
              }
            ]}>
              <UserProfileAvatar 
                userHandle={activeStream?.userData?.handle || profile.handle || 'Loading...'}
                profileImageUri={activeStream?.userData?.profileImageUri || profile.profileImageUri}
                containerWidth={rectWidth}
                containerHeight={rectHeight}              />
            </Animated.View>
          )}
        </View>
      </View>
    );
  }, []); // NO dependencies to prevent re-renders

  return (
    <View style={styles.container} onLayout={onContainerLayout}>      <View style={[
        styles.grid, 
        { 
          width: containerDimensions.width,
          // Rimosso il padding per evitare problemi di layout
        }
      ]}>{profiles.length > 0 ? (
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
  },    grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly", 
    alignItems: "flex-start",
  },profile: {
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
    borderStyle: 'solid', 
  },  videoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 10,
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  speakingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 10,
    pointerEvents: 'none',
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