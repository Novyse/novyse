import WebRTCManager from "./index.js";

import eventEmitter from "../global/Events/EventEmitter.js";
import SocketIO from "../backend-services/socket-io.js";

import Database from "../storage/database";

import SoundPlayer from "../sounds/SoundPlayer.js";
import settingsManager from "../global/SettingsManager.js";
import { Platform } from "react-native";

const WebRTC = WebRTCManager;

let MediaStream;
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
  async join(commUUID) {
    // Start local stream using settings parameters
    const commsSettings =
      await settingsManager.getPageParameters("settings.comms");
    const stream = await WebRTC.startLocalStream(commsSettings);
    if (!stream) {
      console.warn("Entry without stream");
    }

    // Check if already in a vocal chat
    if (WebRTC.getCommUUID() != commUUID) {
      await SocketIO.send().leaveComm(WebRTC.getCommUUID());
    }

    // Join vocal chat
    const database = await Database.create();
    const user = await database.getLocalUser();
    const user_handle = user.handle;
    await SocketIO.send().joinComm(commUUID, user_handle);
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout waiting for comms_joined")),
        10000
      );
      SocketIO.getSocket().once("comms_joined", (data) => {
        if (data && data.commUUID === commUUID) {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });

    if (!result.success) {
      throw new Error("Failed to join vocal chat");
    }

    // Rigenero

    await WebRTC.regenerate(result.data.deviceUUID, commUUID, stream);

    if (
      commsSettings.entryMode === "VIDEO_ONLY" ||
      commsSettings.entryMode === "BOTH"
    ) {
      WebRTC.setVideoEnabled(true); // Set video state to enabled on join if entry mode includes video
    } else {
      WebRTC.setVideoEnabled(false); // Set video state to disabled on join if entry mode is audio only or off
    }

    await handle.memberJoined(result.data);

    const commData = await get.commData(commUUID, true);
    await WebRTC.setCommData(commData);
  },

  // quando io esco in una room
  async left() {
    await SocketIO.send().leaveComm(WebRTC.getCommUUID());
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout waiting for comms_left")),
        10000
      );
      SocketIO.getSocket().once("comms_left", (data) => {
        if (data.commUUID === WebRTC.getCommUUID()) {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });
    const data = result.data;

    WebRTC.setVideoEnabled(false); // Reset video state to enabled on leave

    await handle.memberLeft(data);

    // Close all peer connections and all local stream (both webcam and screen shares)
    await WebRTC.closeAllConnections();
  },

  async toggleAudio() {
    let localStream = WebRTC.getLocalStream();

    if (!localStream) {
      console.warn("No local stream available for toggle audio, creating...");
      const commsSettings =
        await settingsManager.getPageParameters("settings.comms");
      commsSettings.entryMode = "AUDIO_ONLY"; // Force audio only for initial stream if none
      localStream = await WebRTC.startLocalStream(commsSettings);
      await WebRTC.updateVAD();
      console.info("Local stream created for toggle audio");
      return true;
    }

    const audioTrack = WebRTC.getLocalStream().getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      await WebRTC.updateVAD();
      return audioTrack.enabled;
    } else {
      const commsSettings =
        await settingsManager.getPageParameters("settings.comms");
      const newAudioTrack = await WebRTC.addAudioTrack(commsSettings);
      if (newAudioTrack) {
        await WebRTC.updateVAD();
        return true;
      }
    }

    return false;
  },

  togglePin: (rectangleId) => {
    return WebRTC.togglePinById(rectangleId);
  },

  // Switch microphone device
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
      // Apply audio processing using StreamManager
      let processedStream = newAudioStream;
      if (Platform.OS === "web") {
        processedStream =
          await WebRTC.streamManager.applyAudioProcessing(newAudioStream);
      }

      const newAudioTrack = processedStream.getAudioTracks()[0];

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
      let localStream = WebRTC.getLocalStream();
      if (!localStream) {
        console.warn("No local stream available for camera switching");
        return false;
      }

      // Check if video is currently enabled
      const currentVideoTrack = localStream.getVideoTracks()[0];
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
        localStream.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }

      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        newVideoTrack,
      ]);
      localStream = updatedStream; // Update localStream reference

      WebRTC.setLocalStream(localStream);

      WebRTC.notifyLocalStreamUpdate(get.deviceUUID(), localStream);

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
      WebRTC.notifyLocalStreamUpdate(get.deviceUUID(), WebRTC.getLocalStream());

      console.log(
        `Successfully switched to mobile camera with facingMode: ${facingMode}`
      );
      return true;
    } catch (error) {
      console.error("Error switching mobile camera:", error);
      throw error;
    }
  },

  async toggleVideo() {
    try {
      let localStream = WebRTC.getLocalStream();

      if (!localStream) {
        console.warn("No local stream available for toggle video, creating...");
        const commsSettings =
          await settingsManager.getPageParameters("settings.comms");
        commsSettings.entryMode = "VIDEO_ONLY"; // Force video only for initial stream if none
        localStream = await WebRTC.startLocalStream(commsSettings);
      }

      WebRTC.setLocalStream(localStream);

      if (!WebRTC.isVideoEnabled()) {
        // Attiva video con parametri specifici
        const commsSettings =
          await settingsManager.getPageParameters("settings.comms");
        const videoTrack = await WebRTC.addVideoTrack(commsSettings);
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
        return false;
      } else {
        throw err;
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

      await SocketIO.send().startScreenShare(WebRTC.getCommUUID());
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(new Error("Timeout waiting for comms_screen_share_started")),
          10000
        );
        SocketIO.getSocket().once("comms_screen_share_started", (data) => {
          if (data.commUUID === WebRTC.getCommUUID()) {
            clearTimeout(timeout);
            resolve(data);
          }
        });
      });

      if (response.success) {
        SoundPlayer.getInstance().playSound("comms_stream_started");
        const screenShareUUID = response.data.screenShareUUID;

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

  async stopScreenShare(screenShareUUID) {
    try {
      await SocketIO.send().stopScreenShare(
        WebRTC.getCommUUID(),
        screenShareUUID
      );
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(new Error("Timeout waiting for comms_screen_share_stopped")),
          10000
        );
        SocketIO.getSocket().once("comms_screen_share_stopped", (data) => {
          if (data.commUUID === WebRTC.getCommUUID()) {
            clearTimeout(timeout);
            resolve(data);
          }
        });
      });

      if (!response.success) {
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
  async memberJoined(data) {
    if (WebRTC.getCommUUID() === data.commUUID) {
      SoundPlayer.getInstance().playSound("comms_join_vocal");
    }
    await eventEmitter.commsJoin(data);

    await WebRTC.handleUserJoined(data);
  },
  async memberLeft(data) {
    if (WebRTC.getCommUUID() === data.commUUID) {
      SoundPlayer.getInstance().playSound("comms_leave_vocal");
    }
    await eventEmitter.commsLeave(data);

    await WebRTC.handleUserLeft(data);
  },
  async screenShareStarted(data) {
    if (WebRTC.getCommUUID() == data.commUUID) {
      SoundPlayer.getInstance().playSound("comms_stream_started");
    }

    eventEmitter.emit("comms_screen_share_start", data);
  },
  async screenShareStopped(data) {
    if (WebRTC.getCommUUID() == data.commUUID) {
      SoundPlayer.getInstance().playSound("comms_stream_stopped");
    }

    eventEmitter.emit("comms_screen_share_stop", data);
  },
};

const check = {
  isInComms: () => {
    return WebRTC.getCommUUID() != null && WebRTC.getCommUUID() !== "";
  },
  isScreenShare: (deviceUUID, streamUUID) => {
    return WebRTC.isScreenShare(deviceUUID, streamUUID);
  },
};

const get = {
  commUUID: () => {
    return WebRTC.getCommUUID();
  },
  deviceUUID: () => {
    return WebRTC.getDeviceUUID();
  },
  commData: async (commUUID, force = false) => {
    let commData = {};

    if (force || commUUID != WebRTC.getCommUUID()) {
      // Different comms - always fetch from Socket-IO
      await SocketIO.send().retrieveCommData(commUUID);
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(new Error("Timeout waiting for comms_retrieve_comms_data")),
          10000
        );
        SocketIO.getSocket().once("comms_retrieve_comms_data", (data) => {
          if (data.commUUID === commUUID) {
            clearTimeout(timeout);
            resolve(data);
          }
        });
      });
      if (response.success) {
        // Process the array from SocketIO into the expected map format
        response.data.forEach((item) => {
          commData[item.deviceUUID] = {
            userData: {
              userUUID: item.userUUID,
              handle: item.handle,
              deviceUUID: item.deviceUUID,
              commUUID: item.commUUID,
              webcamOn: item.webcamOn,
              isSpeaking: item.speaking,
            },
            activeScreenShares: item.screenShare || [],
          };
        });
      }
    } else {
      // Active comms data (already a map)
      commData = WebRTC.getAllCommsData();
    }
    return commData;
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
  microphoneStatus: async () => {
    if (!check.isInComms()) {
      const entryMode = await settingsManager.getSingleParameter(
        "settings.comms.entryMode"
      );
      console.info("Entry mode:", entryMode);
      if (entryMode === "AUDIO_ONLY" || entryMode === "BOTH") {
        return true;
      }
      return false;
    }
    return (
      WebRTC.getLocalStream() &&
      WebRTC.getLocalStream().getAudioTracks()[0]?.enabled
    );
  },
  videoStatus: async () => {
    if (!check.isInComms()) {
      const entryMode = await settingsManager.getSingleParameter(
        "settings.comms.entryMode"
      );
      if (entryMode === "VIDEO_ONLY" || entryMode === "BOTH") {
        return true;
      }
      return false;
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

  audioDevices: async () => {
    try {
      const devices = await mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.error("Error getting audio devices:", error);
      return [];
    }
  },

  // Ottieni tutti i dispositivi video disponibili
  videoDevices: async () => {
    try {
      const devices = await mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error getting video devices:", error);
      return [];
    }
  },
};

const set = {
  audioContext: (audioContext) => {
    WebRTC.setAudioContext(audioContext);
  },
};

export default { self, check, get, set };
