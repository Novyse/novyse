import React, { memo, useContext, useMemo, useEffect, useState, useRef } from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext } from "@/context/ThemeContext";
import UserProfileAvatar from "./UserProfileAvatar";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  PinIcon,
  PinOffIcon,
  ComputerRemoveIcon,
  FullScreenIcon,
} from "@hugeicons/core-free-icons";

import methods from "../../utils/webrtc/methods";
const { get, check, self } = methods;

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// UserCard component - Rappresenta la singola card di un utente o screen share
// Usa React.memo per evitare re-render se le sue prop non cambiano
const UserCard = memo(
  ({
    streamUUID,
    isLocal = false,
    isSpeaking = false,
    width,
    height,
    margin,
    handle,
    isScreenShare = false,
    webcamOn = true,
    stream = null,
    isPinned = false,
    onPin,
    isFullScreen = false,
    onFullScreen,
    buttonsDisabled,
  }) => {
    const { theme } = useContext(ThemeContext); 
    const userCardRef = useRef(null);

    useEffect(() => {
      addPulseAnimation();
    }, []);

    // Handle fullscreen effect when isFullScreen changes
    useEffect(() => {
      if (Platform.OS === "web" && isFullScreen && userCardRef.current) {
        if (userCardRef.current.requestFullscreen) {
          userCardRef.current.requestFullscreen().catch(console.error);
        }
      }
    }, [isFullScreen]);

    // Listen for fullscreen changes to sync state
    useEffect(() => {
      if (Platform.OS === "web") {
        const handleFullscreenChange = () => {
          const isCurrentlyFullscreen = !!document.fullscreenElement;
          
          // If we exit fullscreen but isFullScreen is still true, call onFullScreen with streamUUID to toggle off
          if (!isCurrentlyFullscreen && isFullScreen && onFullScreen) {
            onFullScreen(streamUUID);
          }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
          document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
      }
    }, [isFullScreen, onFullScreen, streamUUID]);

    // Check if current user is in comms - memoizzato per evitare re-calcoli
    const userIsInComms = useMemo(() => check.isInComms(), []);
    // Determina quale stream utilizzare - memoizzato per stabilità
    const streamToRender = useMemo(() => {
      if (!userIsInComms) return null;
      return stream;
    }, [stream]);

    let hasVideo = false;

    if (isScreenShare) {
      if (stream && stream.getVideoTracks) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks && videoTracks.length > 0) {
          const videoTrack = videoTracks[0];

          // Controlli base
          const isLive = videoTrack.readyState === "live";
          const isEnabled = videoTrack.enabled === true;
          hasVideo = isLive && isEnabled;
        }
      }
    } else {
      hasVideo = webcamOn; // Se è uno screen share, non controlliamo webcamOn
    }

    hasVideo = hasVideo && check.isInComms(); // Assicura che l'utente sia in comms

    // Memoizza i dati statici separatamente per evitare che cambino quando speaking cambia
    const staticDisplayName = useMemo(() => {
      return isScreenShare
        ? `${handle || "Unknown"} : Screen Share`
        : handle || "Unknown";
    }, [isScreenShare, handle]);

    const staticProfileImageUri = useMemo(() => {
      return null;
    }, []);

    const videoProps = useMemo(
      () => ({
        streamUUID,
        isScreenShare,
        hasVideo,
        stream: streamToRender,
        isLocal,
        displayName: staticDisplayName,
        profileImageUri: staticProfileImageUri,
        width,
        height,
        isFullScreen,
      }),
      [
        streamUUID,
        isScreenShare,
        hasVideo,
        streamToRender,
        isLocal,
        staticDisplayName,
        staticProfileImageUri,
        width,
        height,
        webcamOn,
        isFullScreen,
      ]
    );

    // Calcola lo stile del bordo speaking overlay dinamicamente
    const speakingOverlayStyle = useMemo(() => {
      const baseStyle = [styles.speakingOverlayContainer];

      // Non mostrare il bordo speaking se l'utente non è in comms, è uno screen share, o non sta parlando
      if (!userIsInComms || isScreenShare || !isSpeaking) {
        return baseStyle;
      }

      baseStyle.push(styles.speakingOverlay);

      // Aggiungi animazione solo su web
      if (Platform.OS === "web") {
        baseStyle.push({
          animationName: "pulse-speaking",
          animationDuration: "1.5s",
          animationIterationCount: "infinite",
        });
      }

      return baseStyle;
    }, [userIsInComms, isScreenShare, isSpeaking, isPinned]);

    // Componente del pulsante pin
    const PinButton = () => (
      <TouchableOpacity
        style={[styles.buttonBase, buttonsDisabled && styles.pinButtonDisabled]}
        onPress={onPin}
        disabled={buttonsDisabled}
        activeOpacity={buttonsDisabled ? 1 : 0.7}
      >
        <HugeiconsIcon
          icon={isPinned ? PinOffIcon : PinIcon}
          size={24}
          color={buttonsDisabled ? "#666" : "#fff"}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
    );

    // Componente del pulsante stop screen share (solo per screen share locali)
    const StopScreenShareButton = () => {
      const handleStopScreenShare = async () => {
        try {
          // Use the streamUUID prop first, fallback to activeStream.streamUUID
          const uuidToStop = streamUUID;
          if (uuidToStop) {
            console.log(
              `[UserCard] Stopping screen share with UUID: ${uuidToStop}`
            );
            await self.stopScreenShare(uuidToStop);
          } else {
            console.error(
              "[UserCard] No streamUUID available to stop screen share"
            );
          }
        } catch (error) {
          console.error("Error stopping screen share:", error);
        }
      };

      return (
        <TouchableOpacity
          style={[styles.buttonBase, styles.stopButton]}
          onPress={handleStopScreenShare}
          activeOpacity={0.7}
        >
          <HugeiconsIcon icon={ComputerRemoveIcon} size={20} color="#fff" />
        </TouchableOpacity>
      );
    };

    // Componente del pulsante full screen
    const FullScreenButton = () => (
      <TouchableOpacity
        style={[styles.buttonBase, buttonsDisabled && styles.pinButtonDisabled]}
        onPress={onFullScreen}
        disabled={buttonsDisabled}
        activeOpacity={buttonsDisabled ? 1 : 0.7}
      >
        <HugeiconsIcon
          icon={isFullScreen ? PinOffIcon : FullScreenIcon}
          size={24}
          color={buttonsDisabled ? "#666" : "#fff"}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
    );

    // Determina se mostrare il pulsante stop screen share
    const shouldShowStopButton =
      isLocal && isScreenShare && !!streamUUID && !buttonsDisabled;
    const shouldShowPinButton = onPin && !buttonsDisabled;

    const shouldShowFullScreenButton =
      onFullScreen && !isFullScreen && hasVideo && !buttonsDisabled;

    return (
      <View
        ref={userCardRef}
        style={[
          styles.profile,
          {
            width,
            height,
            margin: margin / 2,
          },
          isFullScreen && styles.fullScreenProfile,
        ]}
      >
        <View style={styles.videoContainer}>
          <VideoContent {...videoProps} />
          <View style={speakingOverlayStyle} />
          {/* Pulsanti sempre visibili sopra il video */}
          <View style={styles.buttonsContainer}>
            {shouldShowPinButton && <PinButton />}
            {shouldShowStopButton && <StopScreenShareButton />}
            {shouldShowFullScreenButton && <FullScreenButton />}
          </View>
        </View>
      </View>
    );
  }
);

// ------- SPEECH DETECTION ANIMATION -------

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
  if (
    Platform.OS === "web" &&
    typeof document !== "undefined" &&
    !animationAdded
  ) {
    const existingStyle = document.getElementById(
      "user-card-speaking-animation"
    );
    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = "user-card-speaking-animation";
      style.textContent = PULSE_ANIMATION;
      document.head.appendChild(style);
      animationAdded = true;
    }
  }
};

// ------- SPEECH DETECTION ANIMATION -------

// Componente separato per il contenuto video memoizzato
const VideoContent = memo(
  ({
    streamUUID,
    isScreenShare,
    hasVideo,
    stream,
    isLocal,
    displayName,
    profileImageUri,
    width,
    height,
    isFullScreen,
  }) => {
    return (
      <View style={styles.videoContainer}>
        {hasVideo && stream ? (
          <View style={styles.videoWrapper}>
            {/* Sfondo sfocato - usa lo stesso stream ma ingrandito e sfocato */}
            {Platform.OS === "web" ? (
              <>
                <RTCView
                  key={`bg-${streamUUID}`}
                  stream={stream}
                  style={[
                    styles.videoStream,
                    styles.blurredBackground,
                    { objectFit: "cover" },
                  ]}
                  muted={isLocal}
                />
                {/* Overlay per migliorare il contrasto del blur su web */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.10)",
                    borderRadius: 8,
                    zIndex: 2,
                  }}
                />
              </>
            ) : (
              <View style={styles.blurredBackground}>
                <>
                  <RTCView
                    key={`bg-mobile-${streamUUID}`}
                    streamURL={stream.toURL()}
                    style={[styles.videoStream, { objectFit: "cover" }]}
                    muted={isLocal}
                  />
                  <BlurView
                    experimentalBlurMethod="dimezisBlurView"
                    intensity={100}
                    tint="dark"
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      borderRadius: 20,
                      zIndex: 2,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      borderRadius: 20,
                      zIndex: 3,
                      backgroundColor: "rgba(10,10,10,0.45)", // molto più scuro
                      // Simula "fumo" con un gradiente verticale scuro
                      ...(Platform.OS === "android" &&
                        {
                          // Il supporto ai gradienti inline su React Native è limitato, quindi usiamo un overlay molto scuro
                        }),
                    }}
                  />
                </>
              </View>
            )}
            {Platform.OS === "web" ? (
              <RTCView
                key={`main-${streamUUID}`}
                stream={stream}
                style={[
                  styles.videoStreamMain, 
                  { objectFit: "contain" },
                  isFullScreen && styles.fullScreenVideo
                ]}
                muted={isLocal}
              />
            ) : (
              <RTCView
                key={`main-mobile-${streamUUID}`}
                streamURL={stream.toURL()}
                style={[
                  styles.videoStreamMain, 
                  { objectFit: "contain" },
                  isFullScreen && styles.fullScreenVideo
                ]}
                muted={isLocal}
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
  }
);

VideoContent.displayName = "VideoContent";
UserCard.displayName = "UserCard";

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    padding: 20,
    margin: 16,
    textAlign: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 20,
  },
  profile: {
    backgroundColor: "transparent",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  speakingOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    pointerEvents: "none",
    zIndex: 10,
    borderWidth: 0,
    borderColor: "transparent",
    opacity: 0,
  },
  speakingOverlay: {
    borderWidth: 2,
    borderColor: "#00FF00",
    opacity: 1,
    ...(Platform.OS === "web" && {
      boxShadow:
        "inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6)",
    }),
    ...(Platform.OS === "ios" && {
      shadowColor: "#00FF00",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    }),
    // Android: solo bordo semplice, nessun effetto shadow/elevation
    ...(Platform.OS === "android" &&
      {
        // Nessun effetto aggiuntivo per Android
      }),
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: 8,
    position: "relative",
    backgroundColor: "#000",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  blurredBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
    overflow: "hidden",
    borderRadius: 8,
    // --- BLUR WEB ---
    ...(Platform.OS === "web" && {
      filter: "blur(32px) saturate(1.5)", // blur più forte e saturazione
      transform: "scale(1.12)", // leggero zoom per evitare bordi
      opacity: 1,
      backgroundColor: "rgba(0,0,0,0.12)", // leggero overlay per contrasto
    }),
    // --- BLUR ANDROID ---
    ...(Platform.OS === "android" && {
      opacity: 1,
      transform: "scale(1.12)",
      backgroundColor: "rgba(0, 0, 0, 0.12)",
    }),
    // --- BLUR iOS ---
    ...(Platform.OS === "ios" && {
      opacity: 0.7,
      transform: [{ scale: 1.1 }],
    }),
  },
  videoStreamMain: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: 8,
    zIndex: 2,
  },
  pinButtonDisabled: {
    opacity: 0.5,
  },
  pinIconPinned: {
    backgroundColor: "#000",
  },
  buttonsContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    zIndex: 20,
    gap: 8,
  },
  buttonBase: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  stopButton: {
    backgroundColor: "rgba(255, 0, 0, 0.7)",
  },
  fullScreenProfile: {
    ...(Platform.OS === "web" && {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 9999,
      margin: 0,
    }),
  },
  fullScreenVideo: {
    ...(Platform.OS === "web" && {
      width: "100%",
      height: "100%",
    }),
  },
});

export default UserCard;
