import WebSocketMethods from './webSocketMethods';

class VoiceActivityDetection {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isInitialized = false;
    this.isSpeaking = false;
    this.chatId = null;
    this.userId = null;
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
  }

  async initialize(audioStream, chatId, userId, onSpeakingStatusChange) {
    try {
      this.chatId = chatId;
      this.userId = userId;
      this.onSpeakingStatusChange = onSpeakingStatusChange;

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

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
    } catch (error) {
      console.error('Error initializing VAD:', error);
      return false;
    }
  }

  start() {
    if (!this.isInitialized || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.analyzeAudio();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
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
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;

    // Convert to dB scale (approximate)
    const volume = average > 0 ? 20 * Math.log10(average / 255) : -Infinity;

    // Determine speaking status based on volume
    if (volume > this.speakingThreshold) {
      this.speakingCount++;
      this.silenceCount = 0;

      if (this.speakingCount >= this.requiredSpeakingFrames && !this.isSpeaking) {
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

    // Notify local UI
    if (this.onSpeakingStatusChange) {
      this.onSpeakingStatusChange(this.userId, speaking);
    }

    // Send WebSocket notification
    if (this.chatId && this.userId) {
      WebSocketMethods.sendSpeakingStatus(this.chatId, this.userId, speaking);
    }
  }

  cleanup() {
    this.stop();

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.isInitialized = false;
    this.isSpeaking = false;
    this.onSpeakingStatusChange = null;
  }

  // Get current speaking status
  getCurrentSpeakingStatus() {
    return this.isSpeaking;
  }

  // Update chat and user info (for when switching chats)
  updateContext(chatId, userId) {
    this.chatId = chatId;
    this.userId = userId;
  }
}

// Create singleton instance
const voiceActivityDetection = new VoiceActivityDetection();
export default voiceActivityDetection;
