import React, { memo, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext } from "@/context/ThemeContext";
import UserProfileAvatar from "./UserProfileAvatar";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  PinIcon,
  PinOffIcon,
  ComputerRemoveIcon,
} from "@hugeicons/core-free-icons";

import methods from "../../utils/webrtc/methods";
const { get, check, self } = methods;

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

// Componente separato per il contenuto video memoizzato
const VideoContent = memo(
  ({
    hasVideo,
    streamToRender,
    isLocalUser,
    displayName,
    profileImageUri,
    width,
    height,
    videoStreamKey,
    userData,
    streamType,
  }) => {
    return (
      <View style={styles.videoContainer}>
        {hasVideo && streamToRender ? (
          <View style={styles.videoWrapper}>
            {/* Sfondo sfocato - usa lo stesso stream ma ingrandito e sfocato */}
            {Platform.OS === "web" ? (
              <>
                <RTCView
                  key={`bg-${videoStreamKey || "default"}`}
                  stream={streamToRender}
                  style={[
                    styles.videoStream,
                    styles.blurredBackground,
                    { objectFit: "cover" },
                  ]}
                  muted={isLocalUser}
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
                    key={`bg-mobile-${videoStreamKey || "default"}`}
                    streamURL={streamToRender.toURL()}
                    style={[styles.videoStream, { objectFit: "cover" }]}
                    muted={isLocalUser}
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
                key={`main-${videoStreamKey || "default"}`}
                stream={streamToRender}
                style={[styles.videoStreamMain, { objectFit: "contain" }]}
                muted={isLocalUser}
              />
            ) : (
              <RTCView
                key={`main-mobile-${videoStreamKey || "default"}`}
                streamURL={streamToRender.toURL()}
                style={[styles.videoStreamMain, { objectFit: "contain" }]}
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
  }
);

VideoContent.displayName = "VideoContent";

// UserCard component - Rappresenta la singola card di un utente o screen share
// Usa React.memo per evitare re-render se le sue prop non cambiano
const UserCard = memo(
  ({
    profile,
    activeStream,
    isSpeaking = false,
    width,
    height,
    margin,
    isScreenShare = false,
    videoStreamKey,
    isPinned = false,
    onPin,
    pinDisabled,
  }) => {
    const { theme } = useContext(ThemeContext);

    // Add CSS animation on component mount for web
    useEffect(() => {
      addPulseAnimation();
    }, []);    // Determina se è l'utente locale - memoizzato per evitare re-calcoli
    const isLocalUser = useMemo(() => {
      return isScreenShare
        ? profile.from.includes(get.myPartecipantId()) // Per screen share, controlla se l'ID contiene il nostro ID
        : profile.from === get.myPartecipantId();
    }, [isScreenShare, profile.from]);

    // Check if current user is in comms - memoizzato per evitare re-calcoli
    const userIsInComms = useMemo(() => check.isInComms(), []);    // Determina quale stream utilizzare - memoizzato per stabilità
    const streamToRender = useMemo(() => {
      if (!userIsInComms) return null;
      
      if (isScreenShare && activeStream?.stream) {
        // For screen shares, ALWAYS use the activeStream.stream if available
        return activeStream.stream;
      } else if (isLocalUser) {
        // For local users, prefer activeStream if available (for better re-rendering), fallback to get.localStream()
        return activeStream?.stream || get.localStream();
      } else if (activeStream?.stream) {
        return activeStream.stream;
      } else if (get.remoteStreams()[profile.from]) {
        return get.remoteStreams()[profile.from];
      }
      return null;    }, [userIsInComms, isScreenShare, activeStream?.stream, isLocalUser, profile.from, videoStreamKey, activeStream?.timestamp]);
    
    // Determina se ha video - memoizzato separatamente
    const hasVideo = useMemo(() => {
      return userIsInComms && streamToRender?.getVideoTracks().length > 0;
    }, [userIsInComms, streamToRender, videoStreamKey]);
    
    // Memoizza i dati statici separatamente per evitare che cambino quando speaking cambia
    const staticDisplayName = useMemo(() => {
      return isScreenShare
        ? `${profile.handle || profile.from || "Unknown"} : Screen Share`
        : activeStream?.userData?.handle || profile.handle || "Loading...";
    }, [isScreenShare, profile.handle, profile.from, activeStream?.userData?.handle]);
    
    const staticProfileImageUri = useMemo(() => {
      return isScreenShare
        ? null
        : activeStream?.userData?.profileImageUri || profile.profileImageUri;
    }, [isScreenShare, activeStream?.userData?.profileImageUri, profile.profileImageUri]);
    
    const staticStreamType = useMemo(() => {
      return activeStream?.streamType || (isScreenShare ? "screenshare" : "webcam");
    }, [activeStream?.streamType, isScreenShare]);

    // Memoizza i valori per il componente VideoContent per prevenire re-render
    // Nota: Escludiamo deliberatamente profile e activeStream dalle dipendenze per evitare re-render quando speaking cambia
    const videoProps = useMemo(
      () => ({
        hasVideo,
        streamToRender,
        isLocalUser,
        displayName: staticDisplayName,
        profileImageUri: staticProfileImageUri,
        width,
        height,
        videoStreamKey,
        userData: { ...((activeStream?.userData || profile) || {}) }, // Crea una copia per evitare riferimenti mutabili
        streamType: staticStreamType,
      }),      [
        hasVideo,
        streamToRender,
        isLocalUser,
        staticDisplayName,
        staticProfileImageUri,
        width,
        height,
        videoStreamKey,
        staticStreamType,
        activeStream?.timestamp, // Add timestamp to force re-render when stream updates
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
        style={[
          styles.pinButton,
          pinDisabled && styles.pinButtonDisabled, // Aggiungi stile disabled
        ]}
        onPress={onPin}
        disabled={pinDisabled} // Disabilita il pulsante
        activeOpacity={pinDisabled ? 1 : 0.7}
      >
        <HugeiconsIcon
          icon={isPinned ? PinOffIcon : PinIcon}
          size={24}
          color={pinDisabled ? "#666" : "#fff"} // Colore grigio se disabilitato
          strokeWidth={1.5}
        />
      </TouchableOpacity>
    );
    // Componente del pulsante stop screen share (solo per screen share locali)
    const StopScreenShareButton = () => {
      const handleStopScreenShare = async () => {
        try {
          if (activeStream?.streamId) {
            await self.stopScreenShare(activeStream.streamId);
          }
        } catch (error) {
          console.error("Error stopping screen share:", error);
        }
      };

      return (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopScreenShare}
          activeOpacity={0.7}
        >
          <HugeiconsIcon icon={ComputerRemoveIcon} size={20} color="#fff" />
        </TouchableOpacity>
      );
    }; // Determina se mostrare il pulsante stop screen share
    const shouldShowStopButton =
      isScreenShare && isLocalUser && !!activeStream?.streamId;

    return (
      <View
        style={[
          styles.profile,
          {
            width,
            height,
            margin: margin / 2,
          },
        ]}
      >
        <View style={styles.videoContainer}>
          <VideoContent {...videoProps} />
          <View style={speakingOverlayStyle} />
          {onPin && check.isInComms() && <PinButton />}
          {shouldShowStopButton && <StopScreenShareButton />}
        </View>
      </View>
    );
  }
);

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
  pinButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  pinButtonDisabled: {
    opacity: 0.5,
  },
  pinIconPinned: {
    backgroundColor: "#000",
  },
  stopButton: {
    position: "absolute",
    top: 8,
    right: 56,
    zIndex: 20,
    backgroundColor: "rgba(255, 0, 0, 0.7)", // Rosso traslucido
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default UserCard;
