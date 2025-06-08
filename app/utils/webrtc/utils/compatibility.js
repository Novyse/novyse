import { Platform } from "react-native";
import logger from "../logging/WebRTCLogger.js";

/**
 * Gestione della compatibilità tra web e mobile per WebRTC
 */

// Import WebRTC libraries based on platform
let WebRTC;

try {
  if (Platform.OS === "web") {
    // Use react-native-webrtc-web-shim for web
    WebRTC = require("react-native-webrtc-web-shim");
    logger.info(
      "Compatibility",
      "Caricato react-native-webrtc-web-shim per web"
    );
  } else {
    // Use react-native-webrtc for mobile
    WebRTC = require("react-native-webrtc");
    logger.info("Compatibility", "Caricato react-native-webrtc per mobile");
  }
} catch (error) {
  logger.critical(
    "Compatibility",
    "Errore caricamento librerie WebRTC:",
    error
  );
  throw new Error(`Failed to load WebRTC libraries: ${error.message}`);
}

// Export WebRTC components
export const RTCPeerConnection = WebRTC.RTCPeerConnection;
export const RTCIceCandidate = WebRTC.RTCIceCandidate;
export const RTCSessionDescription = WebRTC.RTCSessionDescription;
export const mediaDevices = WebRTC.mediaDevices;
// Note: MediaStream might not be available on all Android versions, but we export it anyway
// Our createMediaStream function will handle the fallback
export const MediaStream = WebRTC.MediaStream || null;

/**
 * Platform-safe MediaStream factory
 * On some Android versions, MediaStream constructor might not be available
 */
export function createMediaStream(tracks = []) {
  try {
    // First try the standard MediaStream constructor
    if (MediaStream && typeof MediaStream === 'function') {
      return new MediaStream(tracks);
    }
  } catch (error) {
    logger.warn("Compatibility", "MediaStream constructor failed:", error.message);
  }
  
  // Fallback: Create a mock MediaStream object that behaves like a real one
  logger.info("Compatibility", "Using MediaStream polyfill for Android compatibility");
  
  const streamTracks = [...(tracks || [])];
  
  return {
    id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    // Track management methods
    getTracks: () => [...streamTracks],
    getAudioTracks: () => streamTracks.filter(t => t.kind === 'audio'),
    getVideoTracks: () => streamTracks.filter(t => t.kind === 'video'),
    
    addTrack: (track) => {
      if (!streamTracks.find(t => t.id === track.id)) {
        streamTracks.push(track);
      }
    },
    
    removeTrack: (track) => {
      const index = streamTracks.findIndex(t => t.id === track.id);
      if (index > -1) {
        streamTracks.splice(index, 1);
      }
    },
    
    clone: () => {
      const clonedTracks = streamTracks.map(track => {
        try {
          return track.clone ? track.clone() : track;
        } catch (e) {
          return track;
        }
      });
      return createMediaStream(clonedTracks);
    },
    
    // Additional properties for compatibility
    active: true,
    
    // Event handling (simplified)
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    
    // Make it look like a real MediaStream
    toString: () => '[object MediaStream]'
  };
}

/**
 * Verifica se le API WebRTC sono disponibili
 */
export function checkWebRTCSupport() {
  const checks = {
    RTCPeerConnection: !!RTCPeerConnection,
    RTCIceCandidate: !!RTCIceCandidate,
    RTCSessionDescription: !!RTCSessionDescription,
    mediaDevices: !!mediaDevices,
    getUserMedia: !!(mediaDevices && mediaDevices.getUserMedia),
    getDisplayMedia: !!(mediaDevices && mediaDevices.getDisplayMedia),
  };

  const isSupported = Object.values(checks).every((check) => check);

  logger.info("Compatibility", "WebRTC support check:", checks);

  if (!isSupported) {
    logger.error(
      "Compatibility",
      "WebRTC non completamente supportato su questo platform"
    );
  }

  return {
    isSupported,
    checks,
    platform: Platform.OS,
  };
}

/**
 * Ottieni constraints per getUserMedia ottimizzati per la piattaforma
 */
export function getPlatformOptimizedConstraints(type = "audio") {
  const baseConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };

  if (type === "video" || type === "both") {
    if (Platform.OS === "web") {
      baseConstraints.video = {
        facingMode: "user",
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      };
    } else {
      // Mobile constraints (more conservative)
      baseConstraints.video = {
        facingMode: "user",
        width: { ideal: 720, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      };
    }
  }

  if (type === "audio") {
    delete baseConstraints.video;
  }

  logger.debug(
    "Compatibility",
    `Generated ${type} constraints for ${Platform.OS}:`,
    baseConstraints
  );
  return baseConstraints;
}

/**
 * Ottieni constraints per screen sharing ottimizzati per la piattaforma
 */
export function getPlatformScreenShareConstraints() {
  if (Platform.OS === "web") {
    return {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 15, max: 30 },
      },
      audio: true, // Include system audio if available
    };
  } else {
    // Android screen sharing constraints
    return {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 15, max: 24 },
      },
      audio: false, // Audio capture often problematic on Android
    };
  }
}

/**
 * Gestisce lo screen sharing in modo compatibile tra piattaforme
 */
export async function getScreenShareStream() {
  if (Platform.OS === "web") {
    return await getWebScreenShare();
  } else {
    return await getMobileScreenShare();
  }
}

/**
 * Screen sharing per web
 */
async function getWebScreenShare() {
  try {
    const constraints = getPlatformScreenShareConstraints();
    logger.debug(
      "Compatibility",
      "Attempting web screen share with constraints:",
      constraints
    );

    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    logger.info("Compatibility", "Web screen share successful");
    return stream;
  } catch (error) {
    logger.error("Compatibility", "Web screen share failed:", error);
    throw error;
  }
}

/**
 * Screen sharing per mobile (Android)
 */
async function getMobileScreenShare() {
  const constraints = getPlatformScreenShareConstraints();

  // Method 1: Try getDisplayMedia if available
  if (mediaDevices.getDisplayMedia) {
    try {
      logger.debug("Compatibility", "Attempting Android getDisplayMedia");
      const stream = await mediaDevices.getDisplayMedia(constraints);
      logger.info("Compatibility", "Android getDisplayMedia successful");
      return stream;
    } catch (error) {
      logger.warning(
        "Compatibility",
        "Android getDisplayMedia failed:",
        error.message
      );
    }
  }

  // Method 2: Try getUserMedia with screen source
  if (mediaDevices.getUserMedia) {
    try {
      logger.debug(
        "Compatibility",
        "Attempting Android getUserMedia with screen source"
      );
      const stream = await mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: "screen",
            maxWidth: constraints.video.width.max || 1920,
            maxHeight: constraints.video.height.max || 1080,
            maxFrameRate: constraints.video.frameRate.max || 24,
          },
        },
        audio: constraints.audio,
      });
      logger.info(
        "Compatibility",
        "Android getUserMedia with screen source successful"
      );
      return stream;
    } catch (error) {
      logger.warning(
        "Compatibility",
        "Android getUserMedia with screen source failed:",
        error.message
      );
    }
  }

  // Method 3: Fallback to camera
  try {
    logger.warning(
      "Compatibility",
      "Using camera fallback for Android screen sharing"
    );
    const stream = await mediaDevices.getUserMedia({
      video: {
        width: constraints.video.width,
        height: constraints.video.height,
        frameRate: constraints.video.frameRate,
        facingMode: { ideal: "environment" }, // Back camera
      },
      audio: false,
    });
    logger.info("Compatibility", "Android camera fallback successful");
    return stream;
  } catch (error) {
    logger.error(
      "Compatibility",
      "All Android screen sharing methods failed:",
      error
    );
    throw new Error(`Android screen sharing failed: ${error.message}`);
  }
}

/**
 * Verifica se lo screen sharing è supportato
 */
export function isScreenSharingSupported() {
  if (Platform.OS === "web") {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  } else {
    // Su mobile, screen sharing può essere disponibile tramite vari metodi
    return !!(
      mediaDevices &&
      (mediaDevices.getDisplayMedia || mediaDevices.getUserMedia)
    );
  }
}

/**
 * Ottieni informazioni sulla piattaforma corrente
 */
export function getPlatformInfo() {
  return {
    platform: Platform.OS,
    isWeb: Platform.OS === "web",
    isMobile: Platform.OS !== "web",
    webRTCSupport: checkWebRTCSupport(),
    screenSharingSupported: isScreenSharingSupported(),
  };
}

/**
 * Ottieni le librerie WebRTC per la piattaforma corrente
 * @returns {object} Oggetto contenente tutte le API WebRTC
 */
export function getWebRTCLib() {
  return {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
  };
}

export default {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  checkWebRTCSupport,
  getPlatformOptimizedConstraints,
  getPlatformScreenShareConstraints,
  getScreenShareStream,
  isScreenSharingSupported,
  getPlatformInfo,
  getWebRTCLib,
};
