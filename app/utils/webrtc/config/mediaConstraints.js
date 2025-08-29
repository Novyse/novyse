import { WEBRTC_CONSTANTS } from "./constants.js";

/**
 * Media constraints for different scenarios
 */

// ===== QUALITY DEFINITIONS =====
const QUALITY_PRESETS = {
  HD: { width: 1280, height: 720 },
  FULL_HD: { width: 1920, height: 1080 },
  "2K": { width: 2560, height: 1440 },
  "4K": { width: 3840, height: 2160 }
};

// ===== AUDIO CONSTRAINTS =====
export const AUDIO_CONSTRAINTS = {
  STANDARD: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  },

  HIGH_QUALITY: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 2,
    sampleRate: 48000,
    latency: 0.01,
  }
};

// ===== VIDEO CONSTRAINTS BUILDER =====
function buildVideoConstraints(quality, fps, platform) {
  const qualitySettings = QUALITY_PRESETS[quality] || QUALITY_PRESETS.HD;
  const frameRate = Math.min(Math.max(fps || 30, 1), 120);
  
  // Platform-specific adjustments
  let constraints = {
    width: { ideal: qualitySettings.width },
    height: { ideal: qualitySettings.height },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: frameRate, max: frameRate }
  };

  // Mobile optimizations
  if (platform === "android" || platform === "ios") {
    // Reduce quality for mobile if too high
    if (quality === "4K" || quality === "2K") {
      constraints.width = { ideal: QUALITY_PRESETS.FULL_HD.width, max: qualitySettings.width };
      constraints.height = { ideal: QUALITY_PRESETS.FULL_HD.height, max: qualitySettings.height };
    }
    
    // Add mobile-specific settings
    constraints.facingMode = "user";
    
    // Limit fps on mobile for better performance
    if (frameRate > 30) {
      constraints.frameRate = { ideal: 30, max: 30 };
    }
  } else {
    // Web platform
    constraints.facingMode = "user";
  }

  return constraints;
}

/**
 * Get appropriate constraints based on platform, scenario ( OFF, AUDIO_ONLY, VIDEO_ONLY, BOTH ), quality ( HD, FULL_HD, 2K, 4K ) and fps (from 1 to 120)
 */
export function getConstraintsForPlatform(platform, scenario = "AUDIO_ONLY", quality = "HD", fps = 30) {
  const validFps = Math.min(Math.max(fps || 30, 1), 120);
  
  switch (scenario) {
    case "OFF":
      return null;

    case "AUDIO_ONLY":
      return {
        audio: AUDIO_CONSTRAINTS.HIGH_QUALITY,
        video: false
      };

    case "VIDEO_ONLY":
      return {
        audio: false,
        video: buildVideoConstraints(quality, validFps, platform)
      };

    case "BOTH":
      return {
        audio: AUDIO_CONSTRAINTS.STANDARD,
        video: buildVideoConstraints(quality, validFps, platform)
      };

    default:
      // Default to audio only for unknown scenarios
      return {
        audio: AUDIO_CONSTRAINTS.STANDARD,
        video: false
      };
  }
}

// ===== SCREEN SHARE CONSTRAINTS =====
export const SCREEN_SHARE_CONSTRAINTS = {
  WEB_STANDARD: {
    video: {
      width: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_WIDTH },
      height: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_HEIGHT },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: {
        ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_FRAMERATE,
        max: 60,
      },
    },
    audio: true,
  },

  ANDROID_NATIVE: {
    video: {
      mandatory: {
        chromeMediaSource: "screen",
        maxWidth: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_WIDTH,
        maxHeight: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_HEIGHT,
        maxFrameRate: WEBRTC_CONSTANTS.SCREEN_SHARE_MIN_FRAMERATE,
      },
    },
    audio: false,
  }
};

/**
 * Get screen share constraints for platform
 */
export function getScreenShareConstraints(platform, quality = "FULL_HD", fps = 30) {
  const qualitySettings = QUALITY_PRESETS[quality] || QUALITY_PRESETS.FULL_HD;
  const frameRate = Math.min(Math.max(fps || 30, 1), 60); // Screen share limited to 60fps
  
  if (platform === "android") {
    return {
      video: {
        mandatory: {
          chromeMediaSource: "screen",
          maxWidth: qualitySettings.width,
          maxHeight: qualitySettings.height,
          maxFrameRate: frameRate,
        },
      },
      audio: false,
    };
  }

  return {
    video: {
      width: { ideal: qualitySettings.width },
      height: { ideal: qualitySettings.height },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: { ideal: frameRate, max: frameRate },
    },
    audio: true,
  };
}

// ===== SDP OPTIONS =====
export const SDP_OPTIONS = {
  OFFER_OPTIONS: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
    iceRestart: false,
  },

  OFFER_OPTIONS_ICE_RESTART: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
    iceRestart: true,
  },

  ANSWER_OPTIONS: {
    voiceActivityDetection: true,
  },
};

// Default export for Expo Router compatibility
export default {
  AUDIO_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS,
  SDP_OPTIONS,
  getConstraintsForPlatform,
  getScreenShareConstraints,
  QUALITY_PRESETS,
};