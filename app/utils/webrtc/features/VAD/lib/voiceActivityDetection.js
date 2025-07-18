import { Platform } from "react-native";

class VoiceActivityDetection {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isInitialized = false;
    this.isSpeaking = false;

    this.onSpeakingStatusChange = null;

    // VAD parameters
    this.silenceThreshold = -30; // dB threshold for silence (less sensitive to avoid wind noise)
    this.speakingThreshold = -20; // dB threshold for speech (less sensitive to avoid wind noise)
    this.silenceCount = 0;
    this.speakingCount = 0;
    this.requiredSilenceFrames = 15; // ~300ms of silence to stop speaking
    this.requiredSpeakingFrames = 3; // ~60ms of speech to start speaking

    this.isRunning = false;
    this.animationFrame = null;

    // Mobile-specific properties
    this.mobileVADInterval = null;
    this.mobileAudioLevel = 0;
    this.mobileStream = null;
  }

  async initialize(audioStream, onSpeakingStatusChange) {
    try {
      this.onSpeakingStatusChange = onSpeakingStatusChange;

      if (Platform.OS === "web") {
        return await this.initializeWeb(audioStream);
      } else {
        return await this.initializeMobile(audioStream);
      }
    } catch (error) {
      console.error("Error initializing VAD:", error);
      return false;
    }
  }

  async initializeWeb(audioStream) {
    // Create audio context
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create microphone source
    this.microphone = this.audioContext.createMediaStreamSource(audioStream);
    this.microphone.connect(this.analyser);

    // Create data array for frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.isInitialized = true;
    return true;
  }

  async initializeMobile(audioStream) {
    // For mobile, we'll use a simpler approach with periodic checks
    // This is a fallback implementation since mobile doesn't have direct access to audio analysis
    this.mobileStream = audioStream;
    this.isInitialized = true;

    console.log("Mobile VAD initialized with simplified detection");
    return true;
  }

  start() {
    if (!this.isInitialized || this.isRunning) {
      return;
    }

    this.isRunning = true;

    if (Platform.OS === "web") {
      this.analyzeAudio();
    } else {
      this.startMobileVAD();
    }
  }

  startMobileVAD() {
    // For mobile, we'll simulate VAD by detecting when audio tracks are active
    // This is a simplified implementation
    this.mobileVADInterval = setInterval(() => {
      if (this.mobileStream) {
        const audioTracks = this.mobileStream.getAudioTracks();
        const hasActiveAudio = audioTracks.some(
          (track) => track.enabled && track.readyState === "live"
        );

        // Simple heuristic: if audio is active and we haven't been speaking, start speaking
        // If audio becomes inactive, stop speaking after a delay
        if (hasActiveAudio && !this.isSpeaking) {
          // For mobile, we'll use a more aggressive detection
          // In a real implementation, you might want to use native modules for actual audio level detection
          this.setSpeakingStatus(true);

          // Automatically stop speaking after a period (simulate speech detection)
          setTimeout(() => {
            if (this.isSpeaking) {
              this.setSpeakingStatus(false);
            }
          }, 2000); // 2 seconds of simulated speech
        }
      }
    }, 1000); // Check every second
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (Platform.OS === "web") {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    } else {
      if (this.mobileVADInterval) {
        clearInterval(this.mobileVADInterval);
        this.mobileVADInterval = null;
      }
    }

    // If we were speaking, notify that we stopped
    if (this.isSpeaking) {
      this.setSpeakingStatus(false);
    }
  }

  analyzeAudio() {
    if (!this.isRunning || !this.analyser) {
      return;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume
    const average =
      this.dataArray.reduce((sum, value) => sum + value, 0) /
      this.dataArray.length;

    // Convert to dB scale (approximate)
    const volume = average > 0 ? 20 * Math.log10(average / 255) : -Infinity;

    // Determine speaking status based on volume
    if (volume > this.speakingThreshold) {
      this.speakingCount++;
      this.silenceCount = 0;

      if (
        this.speakingCount >= this.requiredSpeakingFrames &&
        !this.isSpeaking
      ) {
        this.setSpeakingStatus(true);
      }
    } else if (volume < this.silenceThreshold) {
      this.silenceCount++;
      this.speakingCount = 0;

      if (this.silenceCount >= this.requiredSilenceFrames && this.isSpeaking) {
        this.setSpeakingStatus(false);
      }
    }

    // Continue analyzing
    this.animationFrame = requestAnimationFrame(() => this.analyzeAudio());
  }

  setSpeakingStatus(speaking) {
    if (this.isSpeaking === speaking) {
      return;
    }

    this.isSpeaking = speaking;
    if (this.onSpeakingStatusChange) {
      this.onSpeakingStatusChange(speaking);
    }
  }

  cleanup() {
    this.stop();

    if (Platform.OS === "web") {
      if (this.microphone) {
        this.microphone.disconnect();
        this.microphone = null;
      }

      if (this.audioContext && this.audioContext.state !== "closed") {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.analyser = null;
      this.dataArray = null;
    } else {
      this.mobileStream = null;
    }

    this.isInitialized = false;
    this.isSpeaking = false;
    this.onSpeakingStatusChange = null;
  }

  // Get current speaking status
  getCurrentSpeakingStatus() {
    return this.isSpeaking;
  }
}

// Create singleton instance
const voiceActivityDetection = new VoiceActivityDetection();
export default voiceActivityDetection;
