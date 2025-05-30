import React, { memo, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
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

// CSS Animation template per web
const PULSE_ANIMATION = `
  @keyframes pulse-speaking {
    0% {
      box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6);
      border-color: #00FF00;
    }
    50% {
      box-shadow: inset 0 0 25px rgba(0, 255, 0, 1), 0 0 30px rgba(0, 255, 0, 0.8);
      border-color: #22FF22;
    }
    100% {
      box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6);
      border-color: #00FF00;
    }
  }
`;

// Add CSS animation for web platform - only once per session
let animationAdded = false;
const addPulseAnimation = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined' && !animationAdded) {
    const existingStyle = document.getElementById('user-card-speaking-animation');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'user-card-speaking-animation';
      style.textContent = PULSE_ANIMATION;
      document.head.appendChild(style);
      animationAdded = true;
    }
  }
};

// Definizione degli stili
const styles = StyleSheet.create({
  profile: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  speakingOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    pointerEvents: 'none',
    zIndex: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 0,
  },
  speakingOverlay: {
    borderWidth: 2,
    borderColor: '#00FF00',
    opacity: 1,
    ...(Platform.OS === 'web' && {
      boxShadow: 'inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6)',
    }),
    ...(Platform.OS === 'ios' && {
      shadowColor: '#00FF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    }),    // Android: solo bordo semplice, nessun effetto shadow/elevation
    ...(Platform.OS === 'android' && {
      // Nessun effetto aggiuntivo per Android
    }),
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 8,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  blurredBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    // --- BLUR WEB ---
    ...(Platform.OS === 'web' && {
      filter: 'blur(32px) saturate(1.5)', // blur più forte e saturazione
      transform: 'scale(1.12)', // leggero zoom per evitare bordi
      opacity: 1,      backgroundColor: 'rgba(0,0,0,0.12)', // leggero overlay per contrasto
    }),
    // --- BLUR ANDROID ---
    ...(Platform.OS === 'android' && {
      opacity: 1,
      transform: [{ scale: 2 }], // zoom più forte per Android
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // overlay molto più scuro
    }),
    // --- BLUR iOS ---
    ...(Platform.OS === 'ios' && {
      opacity: 0.7,
      transform: [{ scale: 1.1 }],
    }),
  },
  videoStreamMain: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: 8,
    zIndex: 2,
  },
});

// Componente separato per il contenuto video memoizzato
const VideoContent = memo(({ 
  hasVideo, 
  streamToRender, 
  isLocalUser, 
  displayName, 
  profileImageUri, 
  width, 
  height 
}) => {
  return (
    <View style={styles.videoContainer}>
      {hasVideo && streamToRender ? (
        <View style={styles.videoWrapper}>
          {/* Sfondo sfocato - usa lo stesso stream ma ingrandito e sfocato */}
          {Platform.OS === "web" ? (
            <>
              <RTCView
                stream={streamToRender}
                style={[styles.videoStream, styles.blurredBackground, { objectFit: 'cover' }]}
                muted={isLocalUser}
              />
              {/* Overlay per migliorare il contrasto del blur su web */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.10)',
                borderRadius: 8,
                zIndex: 2,
              }} />
            </>
          ) : (
            <View style={styles.blurredBackground}>
              <RTCView
                streamURL={streamToRender.toURL()}
                style={[styles.videoStream, { objectFit: 'cover' }]}
                muted={isLocalUser}
              />
              <BlurView
                intensity={Platform.OS === 'android' ? 500 : 300}
                tint="dark"
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -5,
                  width: '110%',
                  height: '110%',
                  borderRadius: 8,
                  backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.25)',
                  zIndex: 2,
                }}
              />
            </View>
          )}
          
          {/* Video principale al centro */}
          {Platform.OS === "web" ? (
            <RTCView
              stream={streamToRender}
              style={[styles.videoStreamMain, { objectFit: 'contain' }]}
              muted={isLocalUser}
            />
          ) : (
            <RTCView
              streamURL={streamToRender.toURL()}
              style={[styles.videoStreamMain, { objectFit: 'contain' }]}
              muted={isLocalUser}
            />
          )}
        </View>
      ) : (
        <UserProfileAvatar 
          userHandle={displayName}
          profileImageUri={profileImageUri}
          containerWidth={width}
          containerHeight={height}
        />
      )}
    </View>
  );
});

VideoContent.displayName = 'VideoContent';

// UserCard component - Rappresenta la singola card di un utente o screen share
// Usa React.memo per evitare re-render se le sue prop non cambiano
const UserCard = memo(({ 
  profile, 
  activeStream, 
  isSpeaking = false, 
  width, 
  height, 
  margin,
  isScreenShare = false 
}) => {
  const { theme } = useContext(ThemeContext);
  
  // Add CSS animation on component mount for web
  useEffect(() => {
    addPulseAnimation();
  }, []);
  
  // Determina se è l'utente locale
  const isLocalUser = profile.from === get.myId();
  
  // Determina quale stream utilizzare
  let streamToRender = null;
  if (isLocalUser && multiPeerWebRTCManager.localStream) {
    streamToRender = multiPeerWebRTCManager.localStream;
  } else if (activeStream?.stream) {
    streamToRender = activeStream.stream;
  } else if (multiPeerWebRTCManager.remoteStreams[profile.from]) {
    streamToRender = multiPeerWebRTCManager.remoteStreams[profile.from];
  }

  const hasVideo = streamToRender?.getVideoTracks().length > 0;
  
  // Memoizza i valori per il componente VideoContent per prevenire re-render
  const videoProps = useMemo(() => ({
    hasVideo,
    streamToRender,
    isLocalUser,
    displayName: isScreenShare 
      ? `${profile.handle || profile.from || 'Unknown'} : Screen Share`
      : activeStream?.userData?.handle || profile.handle || 'Loading...',
    profileImageUri: isScreenShare 
      ? null 
      : activeStream?.userData?.profileImageUri || profile.profileImageUri,
    width,
    height  }), [hasVideo, streamToRender, isLocalUser, profile, activeStream, isScreenShare, width, height]);
  // Calcola lo stile del bordo speaking overlay dinamicamente
  const speakingOverlayStyle = useMemo(() => {
    if (isScreenShare || !isSpeaking) {
      return styles.speakingOverlayContainer;
    }
    
    const baseStyle = [
      styles.speakingOverlayContainer,
      styles.speakingOverlay
    ];
    
    // Aggiungi animazione solo su web
    if (Platform.OS === 'web') {
      baseStyle.push({
        animationName: 'pulse-speaking',
        animationDuration: '1.5s',
        animationIterationCount: 'infinite'
      });
    }
    
    return baseStyle;
  }, [isScreenShare, isSpeaking]);

  return (
    <View
      style={[
        styles.profile,
        {
          width,
          height,
          margin: margin / 2,
        }
      ]}
    >
      <View style={styles.videoContainer}>
        <VideoContent {...videoProps} />
        
        {/* Speaking border overlay - componente separato permanente */}
        <View 
          style={speakingOverlayStyle}
        />
      </View>
    </View>
  );
});

UserCard.displayName = 'UserCard';

export default UserCard;
