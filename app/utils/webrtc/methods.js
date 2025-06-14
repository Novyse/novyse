import APIMethods from "../APImethods.js";
import WebRTCManager from "./index.js";
import eventEmitter from "../EventEmitter.js";
import localDatabase from "../localDatabaseMethods.js";
import SoundPlayer from "../sounds/SoundPlayer.js";
import { Platform } from "react-native";

const WebRTC = WebRTCManager;

// Import mediaDevices from react-native-webrtc
let mediaDevices;
if (Platform.OS === "web") {
  const WebRTCLib = require("react-native-webrtc-web-shim");
  mediaDevices = WebRTCLib.mediaDevices;
} else {
  const WebRTCLib = require("react-native-webrtc");
  mediaDevices = WebRTCLib.mediaDevices;
  MediaStream = WebRTCLib.MediaStream;
}

const self = {
  // quando io entro in una room
  async join(chatId, audioContext = null) {
    // Start local stream
    const stream = await WebRTC.startLocalStream(true); // audio only for now
    if (!stream) {
      throw new Error("Failed to get audio stream");
    } // Check if already in a vocal chat
    if (WebRTC.getChatId() != chatId) {
      await APIMethods.commsLeave(chatId);
    }
    // Join vocal chat
    const data = await APIMethods.commsJoin(chatId);
    if (!data.comms_joined) {
      throw new Error("Failed to join vocal chat");
    }

    // Rigenero

    await WebRTC.regenerate(data.from, chatId, stream);

    // Aggiungi il chat_id ai dati prima di emettere l'evento
    // e includi anche i dati dell'utente locale
    const localUserHandle = await localDatabase.fetchLocalUserHandle();
    const localUserData = await localDatabase.fetchLocalUserData();

    const dataWithChatId = {
      ...data,
      chat_id: chatId,
      handle: localUserHandle,
      profileImage: localUserData?.profileImage || null,
      profileImageUri: localUserData?.profileImage || null,
    };
    await handle.memberJoined(dataWithChatId);

    const commsData = await APIMethods.retrieveVocalUsers(chatId);
    WebRTC.setcommsData(commsData);
  },

  // quando io esco in una room
  async left() {
    const data = await APIMethods.commsLeave();

    //  if (!data.comms_left || false /* Force leave for now */) {
    //    throw new Error("Failed to leave comms");
    //  }

    WebRTC.setVideoEnabled(false); // Reset video state to enabled on leave

    await handle.memberLeft(data);

    // Close all peer connections and all local stream (both webcam and screen shares)
    await WebRTC.closeAllConnections();
  },
  // quando premo pulsante microfono
  async toggleAudio() {
    if (WebRTC.getLocalStream()) {
      const audioTrack = WebRTC.getLocalStream().getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  },

  togglePin: (rectangleId) => {
    return WebRTC.togglePinById(rectangleId);
  },

  // Switch microphone device  // Switch microphone device
  async switchMicrophone(deviceId) {
    try {
      if (!WebRTC.getLocalStream()) {
        console.warn("No local stream available for microphone switching");
        return false;
      }

      // Store current audio enabled state
      const currentAudioTrack = WebRTC.getLocalStream().getAudioTracks()[0];
      const wasAudioEnabled = currentAudioTrack
        ? currentAudioTrack.enabled
        : true;

      // Create new audio stream with selected device
      const newConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const newAudioStream = await mediaDevices.getUserMedia(newConstraints);
      const newAudioTrack = newAudioStream.getAudioTracks()[0];

      if (!newAudioTrack) {
        throw new Error("Failed to get audio track from new device");
      }

      // Set the same enabled state as the previous track
      newAudioTrack.enabled = wasAudioEnabled; // Replace the audio track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.getPeerConnections())) {
        const senders = pc.getSenders();
        const audioSender = senders.find(
          (sender) => sender.track && sender.track.kind === "audio"
        );

        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
          console.log(`Replaced audio track for peer ${peerId}`);
        }
      } // Replace the track in the local stream
      if (currentAudioTrack) {
        WebRTC.getLocalStream().removeTrack(currentAudioTrack);
        currentAudioTrack.stop();
      }

      WebRTC.getLocalStream().addTrack(newAudioTrack);

      await WebRTC.updateVAD();

      console.log(
        `Successfully switched to microphone device: ${deviceId || "default"}`
      );
      return true;
    } catch (error) {
      console.error("Error switching microphone:", error);
      throw error;
    }
  },
  // Switch camera device
  async switchCamera(deviceId) {
    try {
      if (!WebRTC.getLocalStream()) {
        console.warn("No local stream available for camera switching");
        return false;
      }

      // Check if video is currently enabled
      const currentVideoTrack = WebRTC.getLocalStream().getVideoTracks()[0];
      if (!currentVideoTrack) {
        console.warn("No video track available for camera switching");
        return false;
      }

      const wasVideoEnabled = currentVideoTrack.enabled;

      // Create new video stream with selected device
      const newConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
          facingMode: deviceId ? undefined : "user",
        },
      };
      let newVideoStream, newVideoTrack;
      try {
        newVideoStream = await mediaDevices.getUserMedia(newConstraints);
        newVideoTrack = newVideoStream.getVideoTracks()[0];

        if (!newVideoTrack) {
          throw new Error("Failed to get video track from new device");
        }
      } catch (permissionError) {
        // Handle permission denied gracefully
        if (
          permissionError.name === "NotAllowedError" ||
          permissionError.message.includes("Permission denied") ||
          permissionError.message.includes("cancelled by user")
        ) {
          console.log("Camera permission denied by user - silently ignoring");
          return false; // Return false instead of throwing, so the UI can stay in previous state
        }
        throw permissionError; // Re-throw other errors
      } // Set the same enabled state as the previous track
      newVideoTrack.enabled = wasVideoEnabled;

      // Replace the video track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.getPeerConnections())) {
        const senders = pc.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track && sender.track.kind === "video"
        );

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log(`Replaced video track for peer ${peerId}`);
        }
      } // Replace the track in the local stream
      if (currentVideoTrack) {
        WebRTC.getLocalStream().removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }
      WebRTC.notifyLocalStreamUpdate(
        get.myPartecipantId(),
        WebRTC.getLocalStream()
      );

      console.log(
        `Successfully switched to camera device: ${deviceId || "default"}`
      );
      return true;
    } catch (error) {
      console.error("Error switching camera:", error);
      throw error;
    }
  },
  // Switch mobile camera with facingMode (for mobile platforms)
  async switchMobileCamera(constraints, facingMode) {
    try {
      if (!WebRTC.getLocalStream()) {
        console.warn("No local stream available for mobile camera switching");
        return false;
      }

      // Get current video track
      const currentVideoTrack = WebRTC.getLocalStream().getVideoTracks()[0];
      let wasVideoEnabled = false;

      if (currentVideoTrack) {
        wasVideoEnabled = currentVideoTrack.enabled;
      } else {
        console.warn(
          "No current video track available for mobile camera switching"
        );
        return false;
      } // Try different constraint approaches for better mobile compatibility
      let newVideoStream;
      try {
        // First try with exact facingMode
        newVideoStream = await mediaDevices.getUserMedia(constraints);
      } catch (exactError) {
        // Handle permission denied gracefully even in exact mode
        if (
          exactError.name === "NotAllowedError" ||
          exactError.message.includes("Permission denied") ||
          exactError.message.includes("cancelled by user")
        ) {
          console.log(
            "Mobile camera permission denied by user - silently ignoring"
          );
          return false; // Return false instead of throwing, so the UI can stay in previous state
        }

        console.warn(
          "Exact facingMode failed, trying ideal:",
          exactError.message
        );

        try {
          // Fallback to ideal facingMode
          const fallbackConstraints = {
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: 16 / 9 },
            },
          };
          newVideoStream = await mediaDevices.getUserMedia(fallbackConstraints);
        } catch (idealError) {
          // Handle permission denied gracefully in ideal mode
          if (
            idealError.name === "NotAllowedError" ||
            idealError.message.includes("Permission denied") ||
            idealError.message.includes("cancelled by user")
          ) {
            console.log(
              "Mobile camera permission denied by user - silently ignoring"
            );
            return false;
          }

          console.warn(
            "Ideal facingMode failed, trying basic:",
            idealError.message
          );

          try {
            // Last resort: basic constraints
            const basicConstraints = {
              video: {
                facingMode: facingMode,
                width: 1280,
                height: 720,
              },
            };
            newVideoStream = await mediaDevices.getUserMedia(basicConstraints);
          } catch (basicError) {
            // Handle permission denied gracefully in basic mode
            if (
              basicError.name === "NotAllowedError" ||
              basicError.message.includes("Permission denied") ||
              basicError.message.includes("cancelled by user")
            ) {
              console.log(
                "Mobile camera permission denied by user - silently ignoring"
              );
              return false;
            }
            throw basicError; // Re-throw other errors
          }
        }
      }

      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        throw new Error("Failed to get video track from new mobile camera");
      } // Set the same enabled state as the previous track
      newVideoTrack.enabled = wasVideoEnabled;

      // Replace the video track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.getPeerConnections())) {
        const senders = pc.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track && sender.track.kind === "video"
        );

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log(
            `Replaced mobile video track for peer ${peerId} with facingMode: ${facingMode}`
          );
        }
      } // Replace the track in the local stream

      const localStream = WebRTC.getLocalStream();

      if (currentVideoTrack) {
        localStream.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }

      localStream.addTrack(newVideoTrack);

      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        newVideoTrack,
      ]);

      WebRTC.setLocalStream(updatedStream);

      // Notify UI of the stream update
      WebRTC.notifyLocalStreamUpdate(
        get.myPartecipantId(),
        WebRTC.getLocalStream()
      ); // Force local stream update for mobile platforms with delay

      console.log(
        `Successfully switched to mobile camera with facingMode: ${facingMode}`
      );
      return true;
    } catch (error) {
      console.error("Error switching mobile camera:", error);
      throw error;
    }
  },
  // quando premo pulsante video
  async toggleVideo() {
    try {
      if (!WebRTC.isVideoEnabled()) {
        // Attiva video
        const videoTrack = await WebRTC.addVideoTrack();
        if (videoTrack) {
          WebRTC.setVideoEnabled(true);
          return true;
        } else {
          // Permission was denied or failed to get video track, stay disabled
          console.log(
            "Video track permission denied or failed - staying disabled"
          );
          return false;
        }
      } else {
        // Disattiva video
        await WebRTC.removeVideoTracks();
        WebRTC.setVideoEnabled(false);
        return false;
      }
    } catch (err) {
      console.error("Errore nel toggle video:", err);
      // Don't throw error for permission denied cases
      if (
        err.name === "NotAllowedError" ||
        err.message.includes("Permission denied") ||
        err.message.includes("cancelled by user")
      ) {
        console.log("Video permission denied - staying in current state");
        return WebRTC.isVideoEnabled(); // Return current state
      }
    }
  },
  // quando premo pulsante screen share
  async addScreenShare() {
    try {
      // First, ask for screen share permission and get the media stream
      const screenStream = await WebRTC.acquireScreenStream(Platform.OS);

      if (!screenStream) {
        throw new Error("Failed to get screen share permission or stream");
      } // Now that we have permission and the stream, get the screen share ID from API

      const data = await APIMethods.startScreenShare(WebRTC.getChatId());

      if (data.screen_share_started) {
        SoundPlayer.getInstance().playSound("comms_stream_started");
        const screenShareUUID = data.screen_share_uuid;

        const result = await WebRTC.startScreenShare(
          screenShareUUID,
          screenStream
        );
        if (!result) {
          console.warn("[ScreenShare] Failed to add screen share stream");
          return null; // Return null if we couldn't add the stream
        }
        console.log(
          `[ScreenShare] Screen share started with UUID: ${screenShareUUID}`
        );

        return result;
      } else {
        console.warn("[ScreenShare] Failed to start screen share");
        // Clean up the stream if we failed to add it
        screenStream.getTracks().forEach((track) => track.stop());
        throw new Error("Failed to start screen share");
      }
    } catch (error) {
      // Handle permission denied gracefully at the top level
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("Permission denied") ||
        error.message.includes("cancelled by user") ||
        error.message.includes("Permission dismissed")
      ) {
        console.log(
          "Screen share permission denied by user - silently ignoring"
        );
        return null; // Return null instead of throwing, so the UI can stay in previous state
      }

      console.error("[ScreenShare] Error starting screen share:", error);
      throw new Error("Error starting screen share: " + error.message);
    }
  },

  // quando premo x per fermare lo screen share

  async stopScreenShare(screenShareUUID) {
    try {
      const data = await APIMethods.stopScreenShare(
        WebRTC.getChatId(),
        screenShareUUID
      );

      if (!data.screen_share_stopped) {
        console.warn("[ScreenShare] Failed to stop screen share");
        throw new Error("Failed to stop screen share");
      }
      WebRTC.removeScreenShareStream(screenShareUUID);
      console.log("[ScreenShare] Screen share stopped successfully");
    } catch (error) {
      console.error("[ScreenShare] Error stopping screen share:", error);
      throw new Error("Error stopping screen share: " + error.message);
    }
  },
};

const handle = {
  // quando un nuovo membro entra in una room
  async memberJoined(data) {
    // Solo se il membro che entra è nella stessa chat vocale
    if (WebRTC.getChatId() === data.chat_id) {
      SoundPlayer.getInstance().playSound("comms_join_vocal");
    }
    eventEmitter.emit("member_joined_comms", data);

    await WebRTC.handleUserJoined(data);
  },
  // quando un membro esce da una room
  async memberLeft(data) {
    // Solo se il membro che esce è nella stessa chat vocale
    if (WebRTC.getChatId() === data.chat_id) {
      SoundPlayer.getInstance().playSound("comms_leave_vocal");
    }
    eventEmitter.emit("member_left_comms", data);

    await WebRTC.handleUserLeft(data);
  },
  async screenShareStarted(data) {
    // Solo se il membro che ha iniziato lo screen share è nella stessa chat vocale
    if (WebRTC.getChatId() == data.chat_id) {
      SoundPlayer.getInstance().playSound("comms_stream_started");
    }

    eventEmitter.emit("screen_share_started", data);
  },
  async screenShareStopped(data) {
    // Solo se il membro che ha fermato lo screen share è nella stessa chat vocale
    if (WebRTC.getChatId() == data.chat_id) {
      SoundPlayer.getInstance().playSound("comms_stream_stopped");
    }

    eventEmitter.emit("screen_share_stopped", data);
  },
};

const check = {
  isInComms: () => {
    return WebRTC.getChatId() != null && WebRTC.getChatId() !== "";
  },
  isScreenShare: (participantId, streamUUID) => {
    return WebRTC.isScreenShare(participantId, streamUUID);
  },
};

const get = {
  commsId: () => {
    return WebRTC.getChatId();
  },
  myPartecipantId: () => {
    return WebRTC.getMyId();
  },
  commsData: async (chatId) => {
    let commsData = [];

    if (chatId != WebRTC.getChatId()) {
      // Different comms - always fetch from API
      commsData = await APIMethods.retrieveVocalUsers(chatId);
    } else {
      // Active comms data
      commsData = WebRTC.getCommsData();
    }

    // // Ensure local user is in the list with current screen shares (DA CAPIRE SE SERVE)
    // const localUserExists = usersList.some(
    //   (user) => user.from === myParticipantId
    // );

    // if (!localUserExists) {
    //   // Fetch local user handle and data only if not already present
    //   const localUserHandle = await localDatabase.fetchLocalUserHandle();
    //   const localUserData = await localDatabase.fetchLocalUserData();

    //   // Build local user object with active screen shares
    //   const activeScreenShares =
    //     WebRTC.getActiveScreenShares(myParticipantId);

    //   const localUser = {
    //     handle: localUserHandle,
    //     from: myParticipantId,
    //     profileImage: localUserData?.profileImage || null,
    //     active_screen_share: activeScreenShares || [], // Include active screen shares
    //   };

    //   usersList.push(localUser);
    // } else {
    //   // Update existing local user with current screen shares
    //   const localUserIndex = usersList.findIndex(
    //     (user) => user.from === myParticipantId
    //   );
    //   if (localUserIndex !== -1) {
    //     const activeScreenShares =
    //       WebRTC.getActiveScreenShares(myParticipantId);
    //     usersList[localUserIndex].active_screen_share =
    //       activeScreenShares || [];
    //   }
    // }

    return commsData;
  },
  activeStreams: () => {
    return WebRTC.getActiveStreams();
  },
  pinnedUser: () => {
    if (check.isInComms()) {
      return WebRTC.getPinnedUser();
    }
    return null;
  },
  microphoneStatus: () => {
    if (!check.isInComms()) {
      return true; // Da fixare con un pull dei dati dai settings @SamueleOrazioDurante
    }
    return (
      WebRTC.getLocalStream() &&
      WebRTC.getLocalStream().getAudioTracks()[0]?.enabled
    );
  },
  videoStatus: () => {
    if (!check.isInComms()) {
      return false; // Da fixare con un pull dei dati dai settings  @SamueleOrazioDurante
    }
    return (
      WebRTC.getLocalStream() &&
      WebRTC.getLocalStream().getVideoTracks()[0]?.enabled
    );
  },
  microphoneDeviceId: () => {
    try {
      if (!WebRTC.getLocalStream()) {
        return null;
      }

      const audioTrack = WebRTC.getLocalStream().getAudioTracks()[0];
      if (!audioTrack) {
        return null;
      }

      // Ottieni le settings del track che contengono il deviceId
      const settings = audioTrack.getSettings();
      return settings.deviceId || null;
    } catch (error) {
      console.error("Error getting current microphone device ID:", error);
      return null;
    }
  },

  // Ottieni il device ID della camera attualmente in uso
  videoDeviceId: () => {
    try {
      if (!WebRTC.getLocalStream()) {
        return null;
      }

      const videoTrack = WebRTC.getLocalStream().getVideoTracks()[0];
      if (!videoTrack) {
        return null;
      }

      // Ottieni le settings del track che contengono il deviceId
      const settings = videoTrack.getSettings();
      return settings.deviceId || null;
    } catch (error) {
      console.error("Error getting current camera device ID:", error);
      return null;
    }
  },
};

const set = {
  audioContext: (audioContext) => {
    WebRTC.setAudioContext(audioContext);
  },
};

export default { self, check, get, set };
