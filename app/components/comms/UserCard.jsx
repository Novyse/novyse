import React, { memo, useContext, useMemo, useEffect, useState, useRef } from "react";
import { View, StyleSheet, Platform, TouchableOpacity, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext } from "@/context/ThemeContext";
import UserProfileAvatar from "./UserProfileAvatar";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  PinIcon,
  PinOffIcon,
  ComputerRemoveIcon,
  ArrowExpand01Icon,
  ArrowShrink02Icon,
} from "@hugeicons/core-free-icons";
// Importazioni native di expo-video
import { VideoView, useVideoPlayer, FullscreenMode } from 'expo-video';

// RTCView per la compatibilità web (VideoView non è per web)
let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

import methods from "../../utils/webrtc/methods";
const { get, check, self } = methods;

// Ottieni le dimensioni dell'intera finestra del dispositivo una sola volta (non usate direttamente per fullscreen di expo-video)
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const UserCard = memo(
  ({
    streamUUID,
    isLocal = false,
    isSpeaking = false,
    width, // Larghezza normale della card (quando non è fullscreen)
    height, // Altezza normale della card (quando non è fullscreen)
    margin,
    handle,
    isScreenShare = false,
    stream = null,
    isPinned = false,
    onPin,
    pinDisabled,
  }) => {
    const { theme } = useContext(ThemeContext);
    const videoRef = useRef(null); // Ref per VideoView
    const player = useVideoPlayer(null); // Hook per controllare il player
    const [isFullscreen, setIsFullscreen] = useState(false); // Stato per l'icona del pulsante e logica UI

    useEffect(() => {
      addPulseAnimation();

      // Collega il player al ref della VideoView SOLO su piattaforme native
      if (Platform.OS !== 'web' && videoRef.current && player) {
        player.attachPlayer(videoRef.current);
      }

      // Cleanup: Scollega il player e esci dal fullscreen SOLO su piattaforme native
      return () => {
        if (Platform.OS !== 'web' && player) { // Applica solo su native
          player.pause();
          player.setFullscreen(false); // Assicurati di uscire dal fullscreen
          player.detachPlayer();
        }
      };
    }, [player]);

    // Ascolta i cambiamenti di stato del fullscreen dal player SOLO su piattaforme native
    useEffect(() => {
        if (Platform.OS !== 'web') { // Applica solo su native
            const unsubscribe = player?.addListener('fullscreenupdate', ({ fullscreenEnter, fullscreenExit }) => {
                if (fullscreenEnter) {
                    setIsFullscreen(true);
                } else if (fullscreenExit) {
                    setIsFullscreen(false);
                }
            });

            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }
    }, [player]);

    // Metodo per entrare/uscire dal fullscreen usando l'API nativa di expo-video
    const toggleFullscreen = async () => {
      // Questa funzione sarà chiamata solo su piattaforme native grazie alla logica nel JSX
      if (!player) {
        console.warn("Video player non inizializzato.");
        return;
      }

      if (isFullscreen) {
        player.setFullscreen(false);
      } else {
        // Usa FullscreenMode.OVER_CURRENT_CONTEXT per sovrapporsi alla UI
        player.setFullscreen(true, FullscreenMode.OVER_CURRENT_CONTEXT);
      }
    };

    const userIsInComms = useMemo(() => check.isInComms(), []);
    const streamToRender = useMemo(() => {
      if (!userIsInComms) return null;
      return stream;
    }, [stream, userIsInComms]);

    let hasVideo = false;
    if (stream && stream.getVideoTracks) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks && videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            const isLive = videoTrack.readyState === "live";
            const isEnabled = videoTrack.enabled === true;

            if (isLive && isEnabled) {
                const isNotMuted = !videoTrack.muted;
                let hasActiveFrameRate = false;
                if (videoTrack.getSettings) {
                    const settings = videoTrack.getSettings();
                    hasActiveFrameRate = settings.frameRate !== undefined && settings.frameRate > 10;
                }
                hasVideo = isNotMuted && hasActiveFrameRate;
            }
        }
    }

    const staticDisplayName = useMemo(() => {
      return isScreenShare
        ? `${handle || "Unknown"} : Screen Share`
        : handle || "Unknown";
    }, [isScreenShare, handle]);

    const staticProfileImageUri = useMemo(() => null, []);

    const speakingOverlayStyle = useMemo(() => {
      const baseStyle = [styles.speakingOverlayContainer];
      if (!userIsInComms || isScreenShare || !isSpeaking) {
        return baseStyle;
      }
      baseStyle.push(styles.speakingOverlay);
      if (Platform.OS === "web") {
        baseStyle.push({
          animationName: "pulse-speaking",
          animationDuration: "1.5s",
          animationIterationCount: "infinite",
        });
      }
      return baseStyle;
    }, [userIsInComms, isScreenShare, isSpeaking]);

    const PinButton = () => (
        <TouchableOpacity
            style={[styles.buttonBase, styles.pinButton, pinDisabled && styles.pinButtonDisabled]}
            onPress={onPin}
            disabled={pinDisabled}
            activeOpacity={pinDisabled ? 1 : 0.7}
        >
            <HugeiconsIcon
                icon={isPinned ? PinOffIcon : PinIcon}
                size={24}
                color={pinDisabled ? "#666" : "#fff"}
                strokeWidth={1.5}
            />
        </TouchableOpacity>
    );

    const StopScreenShareButton = () => {
      const handleStopScreenShare = async () => {
        try {
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

    const shouldShowStopButton = isLocal && isScreenShare && !!streamUUID;

    return (
      <View style={[styles.profile, { width, height, margin: margin / 2 }]}>
        <View style={styles.videoContainer}>
          {/* Mostra VideoView SOLO su piattaforme native se ha video e stream */}
          {hasVideo && stream && Platform.OS !== "web" ? (
            <View style={styles.videoWrapper}>
              <VideoView
                ref={videoRef}
                player={player}
                style={styles.videoStreamMain}
                contentFit={'contain'} // O 'cover'
              />
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0,0,0,0.10)",
                  borderRadius: 8,
                  zIndex: 1,
                }}
              />
            </View>
          ) : (
            // Fallback per il web (usiamo RTCView) o se non c'è video o stream compatibile
            hasVideo && stream && Platform.OS === "web" ? (
               <View style={styles.videoWrapper}>
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
                  <RTCView
                      key={`main-${streamUUID}`}
                      stream={stream}
                      style={[styles.videoStreamMain, { objectFit: "contain" }]}
                      muted={isLocal}
                  />
               </View>
            ) : (
              <UserProfileAvatar
                userHandle={staticDisplayName}
                profileImageUri={staticProfileImageUri}
                containerWidth={width}
                containerHeight={height}
              />
            )
          )}
          <View style={speakingOverlayStyle} />

          {/* Pulsanti sempre visibili sopra il video */}
          <View style={styles.buttonsContainer}>
            {/* Il pulsante fullscreen è visibile SOLO su piattaforme native */}
            {hasVideo && stream && Platform.OS !== "web" && (
              <TouchableOpacity
                style={styles.buttonBase}
                onPress={toggleFullscreen}
              >
                <HugeiconsIcon
                  icon={isFullscreen ? ArrowShrink02Icon : ArrowExpand01Icon}
                  size={24}
                  color="#fff"
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            )}
            {onPin && check.isInComms() && <PinButton />}
            {shouldShowStopButton && <StopScreenShareButton />}
          </View>
        </View>
      </View>
    );
  }
);

// ------- SPEECH DETECTION ANIMATION (Mantenuto per consistenza) -------
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
// Questo componente è ora ridondante e può essere rimosso per semplicità,
// dato che la logica di rendering condizionale è già nella UserCard.
// L'ho mantenuto per ora ma suggerisco di incorporare direttamente la logica
// di hasVideo e stream all'interno della UserCard.
const VideoContent = memo(
  ({
    streamUUID,
    isScreenShare, // Non usato direttamente qui, ma passato per completezza
    hasVideo,
    stream,
    isLocal,
    displayName,
    profileImageUri,
    width,
    height,
    videoRef, // Riceve il ref per VideoView
    player, // Riceve il player instance
  }) => {
    // La logica videoSource e player.play/setMuted è ora gestita nel `UserCard` stesso
    // o dalla `VideoView` direttamente con il `player` e `stream` (implicito per RTCView)

    return (
      <View style={styles.videoContainer}>
        {/* Mostra VideoView su mobile se ha videoSource e non è web */}
        {hasVideo && stream && Platform.OS !== "web" ? (
          <View style={styles.videoWrapper}>
            <VideoView
              ref={videoRef}
              player={player}
              style={styles.videoStreamMain}
              contentFit={'contain'} // O 'cover'
            />
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(0,0,0,0.10)",
                borderRadius: 8,
                zIndex: 1,
              }}
            />
          </View>
        ) : (
          // Fallback per il web (usiamo RTCView) o se non c'è video o source compatibile
          hasVideo && stream && Platform.OS === "web" ? (
             <View style={styles.videoWrapper}>
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
                <RTCView
                    key={`main-${streamUUID}`}
                    stream={stream}
                    style={[styles.videoStreamMain, { objectFit: "contain" }]}
                    muted={isLocal}
                />
             </View>
          ) : (
            <UserProfileAvatar
              userHandle={displayName}
              profileImageUri={profileImageUri}
              containerWidth={width}
              containerHeight={height}
            />
          )
        )}
      </View>
    );
  }
);

VideoContent.displayName = "VideoContent";
UserCard.displayName = "UserCard";

const styles = StyleSheet.create({
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
    ...(Platform.OS === "android" && {}),
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
  videoStreamMain: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    zIndex: 2,
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
    ...(Platform.OS === "web" && {
      filter: "blur(32px) saturate(1.5)",
      transform: "scale(1.12)",
      opacity: 1,
      backgroundColor: "rgba(0,0,0,0.12)",
    }),
    ...(Platform.OS === "android" && {
      opacity: 1,
      transform: "scale(1.12)",
      backgroundColor: "rgba(0, 0, 0, 0.12)",
    }),
    ...(Platform.OS === "ios" && {
      opacity: 0.7,
      transform: [{ scale: 1.1 }],
    }),
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
  pinButton: {},
  pinButtonDisabled: {
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: "rgba(255, 0, 0, 0.7)",
  },
});

export default UserCard;