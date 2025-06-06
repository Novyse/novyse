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
}

const self = {
  // quando io entro in una room
  async join(chatId) {
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
    } // Rigenero
    await WebRTC.regenerate(data.from, chatId, null);

    // Aggiungi il chat_id ai dati prima di emettere l'evento
    // e includi anche i dati dell'utente locale
    const localUserHandle = await localDatabase.fetchLocalUserHandle();
    const localUserData = await localDatabase.fetchLocalUserData();

    // Initialize local user data in GlobalState to ensure it includes screen shares
    WebRTC.initializeLocalUserData(localUserHandle, {
      profileImage: localUserData?.profileImage || null,
      profileImageUri: localUserData?.profileImage || null,
    });

    const dataWithChatId = {
      ...data,
      chat_id: chatId,
      handle: localUserHandle,
      profileImage: localUserData?.profileImage || null,
      profileImageUri: localUserData?.profileImage || null,
    };
    await handle.memberJoined(dataWithChatId);

    const existingUsers = await APIMethods.retrieveVocalUsers(chatId);
    WebRTC.setExistingUsers(existingUsers);
  },

  // quando io esco in una room
  async left() {
    const data = await APIMethods.commsLeave();

    //  if (!data.comms_left || false /* Force leave for now */) {
    //    throw new Error("Failed to leave comms");
    //  }

    await handle.memberLeft(data);

    // Close all peer connections and local stream
    await WebRTC.closeAllConnections();
    WebRTC.closeLocalStream();
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
      WebRTC.getLocalStream().addTrack(newVideoTrack); // Notify UI of the stream update
      WebRTC.notifyStreamUpdate();
      // Also emit event for local stream update so VocalContent updates local video preview
      WebRTC.executeCallback("onLocalStreamReady", WebRTC.getLocalStream()); // Emit stream_added_or_updated event for local user
      eventEmitter.emit("stream_added_or_updated", {
        participantId: WebRTC.getMyId(),
        stream: WebRTC.getLocalStream(),
        streamType: "webcam",
        userData: { handle: "You" }, // Local user identifier
      });

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
      if (currentVideoTrack) {
        WebRTC.getLocalStream().removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }

      WebRTC.getLocalStream().addTrack(newVideoTrack);

      // Notify UI of the stream update
      WebRTC.notifyStreamUpdate(); // Force local stream update for mobile platforms with delay
      setTimeout(() => {
        WebRTC.executeCallback("onLocalStreamReady", WebRTC.getLocalStream());
        // Emit a more specific event for mobile camera switching
        eventEmitter.emit("mobile_camera_switched", {
          participantId: WebRTC.getMyId(),
          stream: WebRTC.getLocalStream(),
          streamType: "webcam",
          facingMode: facingMode,
          timestamp: Date.now(), // Add timestamp to force re-render
          userData: { handle: "You" },
        }); // Also emit the standard stream update event
        eventEmitter.emit("stream_added_or_updated", {
          participantId: WebRTC.getMyId(),
          stream: WebRTC.getLocalStream(),
          streamType: "webcam",
          timestamp: Date.now(), // Add timestamp to force re-render
          userData: { handle: "You" },
        });
      }, 200); // Increased delay for Android compatibility

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
      let screenStream;
      if (Platform.OS === "web") {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              aspectRatio: { ideal: 16 / 9 },
            },
            audio: true, // Include system audio if available
          });
        } catch (permissionError) {
          // Handle permission denied gracefully for web
          if (
            permissionError.name === "NotAllowedError" ||
            permissionError.message.includes("Permission denied") ||
            permissionError.message.includes("cancelled by user") ||
            permissionError.message.includes("Permission dismissed")
          ) {
            console.log(
              "Screen share permission denied by user - silently ignoring"
            );
            return null; // Return null instead of throwing, so the UI can stay in previous state
          }
          throw permissionError; // Re-throw other errors
        }
      } else {
        // For mobile platforms, try different methods
        try {
          if (mediaDevices.getDisplayMedia) {
            try {
              screenStream = await mediaDevices.getDisplayMedia({
                video: {
                  width: { ideal: 1920, min: 720, max: 1920 },
                  height: { ideal: 1080, min: 480, max: 1080 },
                  frameRate: { ideal: 15, max: 30 },
                },
                audio: false,
              });
            } catch (displayError) {
              // Handle permission denied gracefully for mobile getDisplayMedia
              if (
                displayError.name === "NotAllowedError" ||
                displayError.message.includes("Permission denied") ||
                displayError.message.includes("cancelled by user")
              ) {
                console.log(
                  "Mobile screen share permission denied by user - silently ignoring"
                );
                return null;
              }
              throw displayError;
            }
          } else {
            // Fallback for platforms without getDisplayMedia
            try {
              screenStream = await mediaDevices.getUserMedia({
                video: {
                  mandatory: {
                    chromeMediaSource: "screen",
                    maxWidth: 1920,
                    maxHeight: 1080,
                    maxFrameRate: 15,
                  },
                },
                audio: false,
              });
            } catch (screenError) {
              // Handle permission denied gracefully for getUserMedia with screen source
              if (
                screenError.name === "NotAllowedError" ||
                screenError.message.includes("Permission denied") ||
                screenError.message.includes("cancelled by user")
              ) {
                console.log(
                  "Mobile screen share permission denied by user - silently ignoring"
                );
                return null;
              }
              throw screenError;
            }
          }
        } catch (mobileError) {
          // Handle permission denied gracefully even in mobile error handling
          if (
            mobileError.name === "NotAllowedError" ||
            mobileError.message.includes("Permission denied") ||
            mobileError.message.includes("cancelled by user")
          ) {
            console.log(
              "Mobile screen share permission denied by user - silently ignoring"
            );
            return null;
          }

          console.warn(
            "Mobile screen capture failed, using camera fallback:",
            mobileError.message
          );
          try {
            screenStream = await mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1920, min: 720 },
                height: { ideal: 1080, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                facingMode: { ideal: "environment" },
              },
              audio: false,
            });
          } catch (cameraError) {
            // Handle permission denied gracefully for camera fallback
            if (
              cameraError.name === "NotAllowedError" ||
              cameraError.message.includes("Permission denied") ||
              cameraError.message.includes("cancelled by user")
            ) {
              console.log(
                "Camera fallback permission denied by user - silently ignoring"
              );
              return null;
            }
            throw cameraError;
          }
        }
      }

      if (!screenStream) {
        throw new Error("Failed to get screen share permission or stream");
      } // Now that we have permission and the stream, get the screen share ID from API
      const data = await APIMethods.startScreenShare(WebRTC.getChatId());

      if (data.screen_share_started) {
        const screenShareId = data.screen_share_id;

        const result = WebRTC.addScreenShareStream(screenShareId, screenStream);
        if (result) {
          console.log(
            `[ScreenShare] Screen share started with ID: ${screenShareId}`
          );
          return result;
        } else {
          console.warn("[ScreenShare] Failed to start screen share");
          // Clean up the stream if we failed to add it
          screenStream.getTracks().forEach((track) => track.stop());
          throw new Error("Failed to start screen share");
        }
      } else {
        throw new Error("Screen share couldnt be started");
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

  async stopScreenShare(screenShareId) {
    try {
      const data = await APIMethods.stopScreenShare(
        WebRTC.getChatId(),
        screenShareId
      );

      if (!data.screen_share_stopped) {
        console.warn("[ScreenShare] Failed to stop screen share");
        throw new Error("Failed to stop screen share");
      }

      WebRTC.removeScreenShareStream(screenShareId);
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
};

const get = {
  commsId: () => {
    return WebRTC.getChatId();
  },
  myPartecipantId: () => {
    return WebRTC.getMyId();
  },
  commsMembers: async (chatId) => {
    let usersList = [];

    if (chatId != WebRTC.getChatId()) {
      // Different chat - always fetch from API
      usersList = await APIMethods.retrieveVocalUsers(chatId);
    } else {
      // Same chat - check if we have sufficient remote user data
      const webrtcUserData = Object.values(WebRTC.getUserData());
      const myParticipantId = WebRTC.getMyId();

      // Filter out local user to count remote users
      const remoteUsers = webrtcUserData.filter(
        (user) => user.from !== myParticipantId
      );

      // If we have remote users in WebRTC userData, use it; otherwise fetch from API
      if (remoteUsers.length > 0) {
        console.log(
          "[methods] Using WebRTC userData (has remote users):",
          remoteUsers.length
        );
        usersList = webrtcUserData;
      } else {
        console.log(
          "[methods] No remote users in WebRTC userData, fetching from API"
        );
        usersList = await APIMethods.retrieveVocalUsers(chatId);
      }

      // Ensure local user is in the list with current screen shares
      const localUserExists = usersList.some(
        (user) => user.from === myParticipantId
      );

      if (!localUserExists) {
        // Fetch local user handle and data only if not already present
        const localUserHandle = await localDatabase.fetchLocalUserHandle();
        const localUserData = await localDatabase.fetchLocalUserData();

        // Build local user object with active screen shares
        const activeScreenShares =
          WebRTC.getActiveScreenShares(myParticipantId);

        const localUser = {
          handle: localUserHandle,
          from: myParticipantId,
          profileImage: localUserData?.profileImage || null,
          active_screen_share: activeScreenShares || [], // Include active screen shares
        };

        usersList.push(localUser);
      } else {
        // Update existing local user with current screen shares
        const localUserIndex = usersList.findIndex(
          (user) => user.from === myParticipantId
        );
        if (localUserIndex !== -1) {
          const activeScreenShares =
            WebRTC.getActiveScreenShares(myParticipantId);
          usersList[localUserIndex].active_screen_share =
            activeScreenShares || [];
        }
      }
    }

    return usersList;
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
  localStream: () => {
    return WebRTC.getLocalStream();
  },
  remoteStreams: () => {
    return WebRTC.getRemoteStreams();
  },
};

const set = {
  audioContext: (audioContext) => {
    WebRTC.setAudioContext(audioContext);
  },
};

const pin = {
  toggle: (rectangleId) => {
    return WebRTC.togglePinById(rectangleId);
  },
  clear: () => {
    return WebRTC.setPinnedUser(null);
  },
};

export default { self, check, get, set, pin };
