
/**
 * Costanti per la configurazione WebRTC
 */
export const WEBRTC_CONSTANTS = {
  // ===== RICONNESSIONE E STABILITÀ =====
  MAX_RECONNECTION_ATTEMPTS: 3,      // Massimo 3 tentativi come richiesto
  RECONNECTION_BASE_DELAY: 2000,     // 2 secondi delay base
  HEALTH_CHECK_INTERVAL: 5000,       // 5 secondi per health check
  CONNECTION_TIMEOUT: 30000,         // 30 secondi timeout per tentativi di connessione
  STABILIZATION_TIMEOUT: 15000,      // 15 secondi per stabilizzazione connessione
  
  // ===== ICE E CANDIDATI =====
  ICE_CANDIDATE_POOL_SIZE: 10,       // Pre-gather ICE candidates
  ICE_RETRY_MAX_ATTEMPTS: 3,         // Tentativi massimi per Android ICE candidates
  ICE_RETRY_BASE_DELAY: 100,         // Delay base per retry ICE (ms)
  
  // ===== RINEGOZIAZIONE =====
  NEGOTIATION_TIMEOUT: 10000,        // Timeout per rinegoziazione (10s)
  RENEGOTIATION_DELAY: 100,          // Delay prima della rinegoziazione (ms)
  
  // ===== STREAM E MEDIA =====
  SCREEN_SHARE_MAX_WIDTH: 1920,
  SCREEN_SHARE_MAX_HEIGHT: 1080,
  SCREEN_SHARE_MAX_FRAMERATE: 30,
  SCREEN_SHARE_MIN_FRAMERATE: 15,
  
  WEBCAM_DEFAULT_WIDTH: 1280,
  WEBCAM_DEFAULT_HEIGHT: 720,
  WEBCAM_MAX_WIDTH: 1920,
  WEBCAM_MAX_HEIGHT: 1080,
  
  // ===== BUFFER E LOGGING =====
  LOG_BUFFER_MAX_SIZE: 1000,         // Massimo numero di log in memoria
  
  // ===== TIMING =====
  HEALTH_CHECK_GRACE_PERIOD: 10000,  // Periodo di grazia per health check (10s)
  CONNECTION_RETRY_DELAY: 500,       // Delay tra tentativi di connessione (ms)
  CLEANUP_DELAY: 1000,               // Delay per cleanup dopo disconnessione (ms)
  
  // ===== SDP =====
  SDP_SEMANTICS: 'unified-plan',
  
  // ===== PLATFORM SPECIFIC =====
  ANDROID_SCREEN_CAPTURE_METHODS: [
    'getDisplayMedia',
    'getUserMediaWithScreenSource', 
    'cameraFallback'
  ]
};

/**
 * Error codes for WebRTC operations
 */
export const ERROR_CODES = {
  PERMISSION_DENIED: 'NotAllowedError',
  DEVICE_NOT_FOUND: 'NotFoundError',
  DEVICE_IN_USE: 'NotReadableError',
  OVER_CONSTRAINED: 'OverconstrainedError',
  ABORT_ERROR: 'AbortError',
  TYPE_ERROR: 'TypeError'
};

export const OFFER_OPTIONS = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
  voiceActivityDetection: true,
  iceRestart: true
};

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

export const VIDEO_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: WEBRTC_CONSTANTS.WEBCAM_DEFAULT_WIDTH },
  height: { ideal: WEBRTC_CONSTANTS.WEBCAM_DEFAULT_HEIGHT }
};

export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_WIDTH },
    height: { ideal: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_HEIGHT },
    frameRate: { ideal: 15, max: WEBRTC_CONSTANTS.SCREEN_SHARE_MAX_FRAMERATE }
  },
  audio: true // Include system audio if available
};

export default WEBRTC_CONSTANTS;
