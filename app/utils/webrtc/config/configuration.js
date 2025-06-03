/**
 * Configurazione WebRTC per ICE servers e altre impostazioni
 */
export const WEBRTC_CONFIGURATION = {
  iceServers: [
    {
      urls: "stun:oracle.israiken.it:3478",
      username: "test",
      credential: "test",
    },
    {
      urls: "turn:oracle.israiken.it:3478",
      username: "test",
      credential: "test",
    },
    // Add fallback public STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10, // Pre-gather ICE candidates
  sdpSemantics: "unified-plan",
};

/**
 * Ottieni la configurazione WebRTC validata
 * @returns {Object} Configurazione WebRTC
 */
export function getWebRTCConfiguration() {
  return WEBRTC_CONFIGURATION;
}

/**
 * Ottieni le opzioni per la creazione dell'offerta RTC
 * @returns {Object} Opzioni per la creazione dell'offerta
 */
export function getRTCOfferOptions() {
  return {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    iceRestart: false,
    voiceActivityDetection: true
  };
}

export default WEBRTC_CONFIGURATION;
