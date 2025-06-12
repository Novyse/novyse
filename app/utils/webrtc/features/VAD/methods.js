import { Platform } from "react-native";
import voiceActivityDetection from "./lib/voiceActivityDetection";
import eventEmitter from "../../../EventEmitter";

const VAD = {
  async initializeVoiceActivityDetection(localStream) {
    console.log("Attempting to initialize VAD...", {
      hasLocalStream: !!localStream,
      platform: Platform.OS,
      stream: localStream,
    });

    if (!localStream) {
      console.warn("Cannot initialize VAD: missing stream", {
        hasLocalStream: !!localStream,
      });
    }

      const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.error("VAD: No audio tracks in stream!");
    return false;
  }

    // 🔥 DEBUG TRACCE AUDIO PER VEDERE SE SONO ATTIVE
  audioTracks.forEach((track, index) => {
    console.log(`🎤 VAD Audio Track ${index}:`, {
      id: track.id,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    });
  });

    const success = await voiceActivityDetection.initialize(
      localStream,
      (isSpeaking) => {
        VAD.handleSpeakingStatusChange(isSpeaking);
      }
    );

    if (success) {
      voiceActivityDetection.start();
      console.log(
        `Voice Activity Detection initialized and started successfully for ${Platform.OS}`
      );
    } else {
      console.error("Failed to initialize Voice Activity Detection");
    }
  },

  handleSpeakingStatusChange(isSpeaking) {
    if (isSpeaking) {
      eventEmitter.emit("user_started_speaking");
    } else {
      eventEmitter.emit("user_stopped_speaking");
    }
  },

  stopVoiceActivityDetection() {
    voiceActivityDetection.cleanup();
  },
};

export default VAD;
