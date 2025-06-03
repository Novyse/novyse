import { WEBRTC_CONSTANTS } from './constants.js';

/**
 * Media constraints for different scenarios
 */

// ===== AUDIO CONSTRAINTS =====
export const AUDIO_CONSTRAINTS = {
  // Standard audio constraints
  STANDARD: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  },
  
  // High quality audio
  HIGH_QUALITY: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 2,
    sampleRate: 48000,
    latency: 0.01, // 10ms latency
  },
  
  // Audio only (no video)
  AUDIO_ONLY: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 44100,
  },
};

// ===== VIDEO CONSTRAINTS =====
export const VIDEO_CONSTRAINTS = {
  // Standard webcam video
  WEBCAM_STANDARD: {
    facingMode: "user",
    width: { ideal: WEBRTC_CONSTANTS.WEBCAM_DEFAULT_WIDTH },
    height: { ideal: WEBRTC_CONSTANTS.WEBCAM_DEFAULT_HEIGHT },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30, max: 30 },
  },
  
  // High quality webcam
  WEBCAM_HD: {
    facingMode: "user",
    width: { ideal: WEBRTC_CONSTANTS.WEBCAM_MAX_WIDTH, min: 1280 },
    height: { ideal: WEBRTC_CONSTANTS.WEBCAM_MAX_HEIGHT, min: 720 },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30, max: 60 },
  },
  
  // Low bandwidth video
  WEBCAM_LOW_BANDWIDTH: {
    facingMode: "user",
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    aspectRatio: { ideal: 4 / 3 },
    frameRate: { ideal: 15, max: 24 },
  },
  
  // Mobile optimized
  WEBCAM_MOBILE: {
    facingMode: "user",
    width: { ideal: 640, min: 320, max: 1280 },
    height: { ideal: 480, min: 240, max: 720 },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 24, max: 30 },
  },
};

// ===== SCREEN SHARE CONSTRAINTS =====
export const SCREEN_SHARE_CONSTRAINTS = {
  // Web screen sharing
  WEB_STANDARD: {
    video: {
      width: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_WIDTH },
      height: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_HEIGHT },
      aspectRatio: { ideal: 16 / 9 },
      frameRate: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_FRAMERATE, max: 60 },
    },
    audio: true, // Include system audio if available
  },
  
  // Android screen sharing (fallback to camera)
  ANDROID_FALLBACK: {
    video: {
      width: { ideal: 1920, min: 720 },
      height: { ideal: 1080, min: 480 },
      frameRate: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MIN_FRAMERATE, min: 15 },
      facingMode: { ideal: "environment" }, // Back camera
    },
    audio: false, // Audio often causes issues on Android
  },
  
  // Android native screen capture
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
  },
  
  // Low bandwidth screen sharing
  LOW_BANDWIDTH: {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 15, max: 24 },
    },
    audio: false,
  },
};

// ===== COMBINED CONSTRAINTS =====
export const MEDIA_CONSTRAINTS = {
  // Audio only call
  AUDIO_ONLY: {
    audio: AUDIO_CONSTRAINTS.STANDARD,
    video: false,
  },
  
  // Standard video call
  VIDEO_CALL_STANDARD: {
    audio: AUDIO_CONSTRAINTS.STANDARD,
    video: VIDEO_CONSTRAINTS.WEBCAM_STANDARD,
  },
  
  // High quality video call
  VIDEO_CALL_HD: {
    audio: AUDIO_CONSTRAINTS.HIGH_QUALITY,
    video: VIDEO_CONSTRAINTS.WEBCAM_HD,
  },
  
  // Mobile video call
  VIDEO_CALL_MOBILE: {
    audio: AUDIO_CONSTRAINTS.STANDARD,
    video: VIDEO_CONSTRAINTS.WEBCAM_MOBILE,
  },
  
  // Low bandwidth call
  VIDEO_CALL_LOW_BANDWIDTH: {
    audio: AUDIO_CONSTRAINTS.AUDIO_ONLY,
    video: VIDEO_CONSTRAINTS.WEBCAM_LOW_BANDWIDTH,
  },
};

// ===== OFFER/ANSWER OPTIONS =====
export const SDP_OPTIONS = {
  // Standard offer options
  OFFER_OPTIONS: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
    iceRestart: false,
  },
  
  // Offer with ICE restart
  OFFER_OPTIONS_ICE_RESTART: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
    iceRestart: true,
  },
  
  // Answer options
  ANSWER_OPTIONS: {
    voiceActivityDetection: true,
  },
};

/**
 * Get appropriate constraints based on platform and scenario
 */
export function getConstraintsForPlatform(platform, scenario = 'standard') {
  const isAndroid = platform === 'android';
  const isWeb = platform === 'web';
  const isIOS = platform === 'ios';
  
  switch (scenario) {
    case 'audio_only':
      return MEDIA_CONSTRAINTS.AUDIO_ONLY;
      
    case 'video_standard':
      if (isAndroid) {
        return MEDIA_CONSTRAINTS.VIDEO_CALL_MOBILE;
      }
      return MEDIA_CONSTRAINTS.VIDEO_CALL_STANDARD;
      
    case 'video_hd':
      if (isAndroid) {
        return MEDIA_CONSTRAINTS.VIDEO_CALL_STANDARD;
      }
      return MEDIA_CONSTRAINTS.VIDEO_CALL_HD;
      
    case 'low_bandwidth':
      return MEDIA_CONSTRAINTS.VIDEO_CALL_LOW_BANDWIDTH;
      
    case 'screen_share':
      if (isAndroid) {
        return SCREEN_SHARE_CONSTRAINTS.ANDROID_NATIVE;
      }
      return SCREEN_SHARE_CONSTRAINTS.WEB_STANDARD;
      
    default:
      return MEDIA_CONSTRAINTS.AUDIO_ONLY;
  }
}

/**
 * Get screen share constraints for platform
 */
export function getScreenShareConstraints(platform) {
  if (platform === 'android') {
    return {
      native: SCREEN_SHARE_CONSTRAINTS.ANDROID_NATIVE,
      fallback: SCREEN_SHARE_CONSTRAINTS.ANDROID_FALLBACK,
    };
  }
  
  return {
    standard: SCREEN_SHARE_CONSTRAINTS.WEB_STANDARD,
    lowBandwidth: SCREEN_SHARE_CONSTRAINTS.LOW_BANDWIDTH,
  };
}

// Default export for Expo Router compatibility
export default {
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS,
  MEDIA_CONSTRAINTS,
  SDP_OPTIONS,
  getConstraintsForPlatform,
  getScreenShareConstraints
};
