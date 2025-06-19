import { Platform } from "react-native";
import { LOG_LEVELS } from "../logging/LogLevels.js";
import { getConstraintsForPlatform } from "../config/mediaConstraints.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";
import { ERROR_CODES } from "../config/constants.js";
import { createMediaStream } from "../utils/compatibility.js";
import EventEmitter from "../utils/EventEmitter.js";
import methods from "../methods.js";

// Import WebRTC based on platform
let WebRTC;
if (Platform.OS === "web") {
  WebRTC = require("react-native-webrtc-web-shim");
} else {
  WebRTC = require("react-native-webrtc");
}

const mediaDevices = WebRTC.mediaDevices;

/**
 * Manages all local and remote media streams
 */
export class StreamManager {
  constructor(globalState, logger) {
    this.globalState = globalState;
    this.logger = logger;
    this.logger.info("StreamManager", "StreamManager initialized");
  }

  /**
   * Start local media stream
   * @param {boolean} audioOnly - Whether to capture only audio
   * @returns {MediaStream|null} The local stream or null if failed
   */
  async startLocalStream(audioOnly = true, audioProcessingOptions = {}) {
    this.logger.info("Avvio acquisizione stream locale", {
      component: "StreamManager",
      audioOnly,
      action: "startLocalStream",
      audioProcessing: /*!!audioProcessingOptions*/ true,
    });

    this.logger.info(
      "StreamManager",
      `Starting local stream (audioOnly: ${audioOnly})`
    );

    let localStream = this.globalState.getLocalStream();
    if (localStream) {
      this.logger.warning("StreamManager", "Local stream already active");
      return localStream;
    }

    try {
      // Get appropriate constraints for platform and scenario
      const scenario = audioOnly ? "audio_only" : "video_standard";
      const constraints = getConstraintsForPlatform(Platform.OS, scenario);

      this.logger.debug("StreamManager", "Using constraints:", constraints);

      localStream = await mediaDevices.getUserMedia(constraints);

      this.logger.info("StreamManager", "Local stream obtained successfully");
      this.logger.debug(
        "StreamManager",
        `Stream tracks: ${localStream.getTracks().length}`
      );

      // Applica audio processing se richiesto
      if (/*audioProcessingOptions &&*/ Platform.OS === "web") {
        localStream = this.applyAudioProcessing(
          localStream,
          audioProcessingOptions
        );
      } else if (audioProcessingOptions) {
        this.logger.warning(
          "Audio processing non supportato su questa piattaforma",
          {
            component: "StreamManager",
            platform: Platform.OS,
          }
        );
      }

      this.globalState.setLocalStream(localStream);

      // Add stream to existing peer connections
      this._addLocalStreamToAllPeers();

      return localStream;
    } catch (error) {
      this.logger.error(
        "StreamManager",
        "Error getting local stream:",
        error.message
      );

      // Handle specific error types gracefully
      if (error.name === ERROR_CODES.PERMISSION_DENIED) {
        this.logger.warning("StreamManager", "Media permission denied by user");
      } else if (error.name === ERROR_CODES.DEVICE_NOT_FOUND) {
        this.logger.warning("StreamManager", "No media devices found");
      } else if (error.name === ERROR_CODES.DEVICE_IN_USE) {
        this.logger.warning(
          "StreamManager",
          "Media device is in use by another application"
        );
      }

      throw error;
    }
  }

  applyAudioProcessing(stream) {
    if (!stream || Platform.OS !== "web") {
      return stream;
    }
    return stream;
  }

  /**
   * Add video track to existing local stream
   * @returns {MediaStreamTrack|null} The added video track or null if failed
   */
  async addVideoTrack() {
    this.logger.info("StreamManager", "Adding video track to local stream");

    try {
      // Get video constraints for current platform
      const constraints = getConstraintsForPlatform(
        Platform.OS,
        "video_standard"
      );
      const videoConstraints = { video: constraints.video };

      const videoStream = await mediaDevices.getUserMedia(videoConstraints);
      const videoTrack = videoStream.getVideoTracks()[0];

      let localStream = this.globalState.getLocalStream();
      if (localStream && videoTrack) {
        localStream.addTrack(videoTrack);
        this.globalState.setLocalStream(localStream);
        this.logger.info("StreamManager", "Video track added successfully");

        // Add track to all peer connections and wait for completion
        await this._addTrackToAllPeers(videoTrack);
        this.logger.info(
          "StreamManager",
          "Video track added to all peer connections"
        );

        const updatedStream = new MediaStream([
          ...localStream.getAudioTracks(),
          ...localStream.getVideoTracks(),
        ]);

        localStream = updatedStream;


        EventEmitter.sendLocalUpdateNeeded(
          this.globalState.getMyId(),
          this.globalState.getMyId(),
          localStream,
          "add_or_update"
        );

        this.logger.info(
          "StreamManager",
          "Emitted stream_added_or_updated event for video track addition"
        );

        return videoTrack;
      }

      // Trigger renegotiation after all track operations are complete
      // Use a slightly longer delay for Android to ensure track operations are fully processed
      const renegotiationDelay =
        Platform.OS === "android" ? 200 : WEBRTC_CONSTANTS.RENEGOTIATION_DELAY;
      this.logger.info(
        "StreamManager",
        `Scheduling renegotiation in ${renegotiationDelay}ms for ${Platform.OS}`
      );

      setTimeout(async () => {
        this.logger.info(
          "StreamManager",
          "Starting renegotiation after video track addition"
        );
        await this._renegotiateWithAllPeers();
      }, renegotiationDelay);

      return videoTrack;
    } catch (error) {
      // Handle permission denied gracefully for video
      if (
        error.name === ERROR_CODES.PERMISSION_DENIED ||
        error.message.includes("Permission denied")
      ) {
        this.logger.info(
          "StreamManager",
          "Video permission denied by user - silently ignoring"
        );
        return null; // Return null instead of throwing
      }

      this.logger.error(
        "StreamManager",
        "Error adding video track:",
        error.message
      );
      throw error;
    }
  }

  /**
 * Remove video tracks from local stream and all peer connections
 * @returns {Promise<void>}
 */
async removeVideoTracks() {
  try {
    const localStream = this.globalState.getLocalStream();
    if (!localStream) {
      this.logger.warning("StreamManager", "No local stream to remove video from");
      return;
    }

    // 🔥 STEP 1: Ferma le tracce video locali
    const videoTracks = localStream.getVideoTracks();
    for (const track of videoTracks) {
      this.logger.debug("StreamManager", `Stopping video track: ${track.id}`);
      track.stop();
      localStream.removeTrack(track);
    }

    // 🔥 STEP 2: USA replaceTrack(null) INVECE DI RIMUOVERE I SENDER
    const peerConnections = this.globalState.getAllPeerConnections();
    for (const [peerId, pc] of Object.entries(peerConnections)) {
      const videoSenders = pc.getSenders().filter(
        sender => sender.track && sender.track.kind === "video"
      );

      for (const sender of videoSenders) {
        this.logger.debug(
          "🔄 REPLACING video track with null (maintaining sender)",
          {
            component: "StreamManager",
            peerId,
            trackId: sender.track?.id,
          }
        );

        // 🔥 USA replaceTrack(null) PER MANTENERE IL SENDER ATTIVO
        await sender.replaceTrack(null);
      }
    }

    // Update local stream reference
    this.globalState.setLocalStream(localStream);

    // Notifica UI
    EventEmitter.sendLocalUpdateNeeded(
      this.globalState.getMyId(),
      this.globalState.getMyId(),
      localStream,
    );

    this.logger.info("StreamManager", "Video tracks removed successfully");
  } catch (error) {
    this.logger.error("StreamManager", "Error removing video tracks:", error);
    throw error;
  }
}

  /**
   * Close local stream and stop all tracks
   */
  closeLocalStream() {
    this.logger.info("StreamManager", "Closing local stream");

    const localStream = this.globalState.getLocalStream();
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        this.logger.debug("StreamManager", `Stopped ${track.kind} track`);
      });

      this.globalState.setLocalStream(null);

      EventEmitter.sendLocalUpdateNeeded(
        this.globalState.getMyId(),
        this.globalState.getMyId(),
        null // Clear local stream
      );

      this.logger.info("StreamManager", "Local stream closed successfully");
    }
  }
  // ===== PRIVATE METHODS =====

  /**
   * Add local stream to all existing peer connections
   */
  _addLocalStreamToAllPeers() {
    if (!this.globalState.localStream) return;

    Object.values(this.globalState.peerConnections).forEach((pc) => {
      this._addLocalTracksToPeerConnection(pc);
    });

    this.logger.debug(
      "StreamManager",
      "Local stream added to all peer connections"
    );
  }

  /**
   * Add local tracks to a specific peer connection
   * @param {RTCPeerConnection} pc - The peer connection
   */
  _addLocalTracksToPeerConnection(pc) {
    const localStream = this.globalState.getLocalStream();
    if (!localStream) return;

    localStream.getTracks().forEach((track) => {
      // Avoid duplicates
      const existingSender = pc
        .getSenders()
        .find((s) => s.track && s.track.id === track.id);
      if (!existingSender) {
        pc.addTrack(track, localStream);
        this.logger.debug(
          "StreamManager",
          `Added ${track.kind} track to peer connection`
        );
      }
    });
  }

  /**
 * Add a specific track to all peer connections
 * @param {MediaStreamTrack} track - The track to add
 */
async _addTrackToAllPeers(track) {
  try {
    const localStream = this.globalState.getLocalStream();
    if (!localStream) {
      this.logger.error("StreamManager", "Local stream not available");
      return;
    }

    const peerConnections = this.globalState.getAllPeerConnections();
    const webcamStreamUUID = this.globalState.getMyId();

    for (const [peerId, pc] of Object.entries(peerConnections)) {
      // 🔥 PRIMA VERIFICA SE ESISTE GIÀ UN SENDER PER QUESTO TIPO DI TRACCIA
      if (track.kind === "video") {
        const existingVideoSender = pc.getSenders().find(
          sender => sender.track && sender.track.kind === "video"
        );

        if (existingVideoSender) {
          // 🔥 USA replaceTrack INVECE DI CREARE UN NUOVO TRANSCEIVER
          this.logger.debug(
            "🔄 REPLACING existing video track instead of adding new one",
            {
              component: "StreamManager",
              peerId,
              oldTrackId: existingVideoSender.track?.id,
              newTrackId: track.id,
            }
          );

          await existingVideoSender.replaceTrack(track);
          
          // Non serve rinegoziazione quando usiamo replaceTrack
          this.logger.debug(
            "✅ Video track replaced successfully",
            {
              component: "StreamManager",
              peerId,
              trackKind: track.kind,
            }
          );
          continue; // Passa al prossimo peer
        }
      }

      // Se non esiste un sender per video, crea nuovo transceiver (solo per la prima volta)
      const already = pc.getSenders().find((s) => s.track && s.track.id === track.id);
      if (!already) {
        if (track.kind === "video") {
          // Per video, usa addTransceiver per controllo completo
          const transceiver = pc.addTransceiver(track, {
            direction: "sendrecv",
            streams: [localStream],
          });

          const streamMappingManager = this.globalState.getStreamMappingManager?.();
          if (streamMappingManager) {
            if (!pc._pendingMappings) {
              pc._pendingMappings = [];
            }

            pc._pendingMappings.push({
              transceiver,
              remoteParticipantUUID: peerId,
              streamUUID: webcamStreamUUID,
            });

            this.logger.debug(
              "🔥 WEBCAM MAPPING AGGIUNTO AI PENDING:",
              {
                component: "StreamManager",
                peerId,
                streamUUID: webcamStreamUUID,
                trackKind: track.kind,
                pendingCount: pc._pendingMappings.length,
              }
            );
          }

          this.logger.debug(
            "StreamManager",
            `Added new video track to peer ${peerId}`
          );
        } else {
          // Per audio, usa addTransceiver come prima
          const transceiver = pc.addTransceiver(track, {
            direction: "sendrecv",
            streams: [localStream],
          });

          const streamMappingManager = this.globalState.getStreamMappingManager?.();
          if (streamMappingManager) {
            if (!pc._pendingMappings) {
              pc._pendingMappings = [];
            }

            pc._pendingMappings.push({
              transceiver,
              remoteParticipantUUID: peerId,
              streamUUID: webcamStreamUUID,
            });

            this.logger.debug(
              "🔥 WEBCAM AUDIO MAPPING AGGIUNTO AI PENDING:",
              {
                component: "StreamManager",
                peerId,
                streamUUID: webcamStreamUUID,
                trackKind: track.kind,
                pendingCount: pc._pendingMappings.length,
              }
            );
          }

          this.logger.debug(
            "StreamManager",
            `Added ${track.kind} track to peer ${peerId}`
          );
        }

        // 🔥 FORZA RINEGOZIAZIONE SOLO SE ABBIAMO CREATO UN NUOVO TRANSCEIVER
        if (pc.signalingState === "stable") {
          this.logger.debug(
            "🔥 FORCING IMMEDIATE RENEGOTIATION FOR NEW TRANSCEIVER:",
            {
              component: "StreamManager",
              peerId,
              streamUUID: webcamStreamUUID,
              trackKind: track.kind,
            }
          );

          const peerConnectionManager = this.globalState.getPeerConnectionManager?.();
          if (peerConnectionManager) {
            await peerConnectionManager._performDirectRenegotiation(pc, peerId);
          }
        }
      }
    }
  } catch (error) {
    this.logger.error("StreamManager", "Error adding track to peers:", error);
    throw error;
  }
}
  /**
   * Remove video tracks from all peer connections
   */
  async _removeVideoTracksFromAllPeers() {
    for (const [peerId, pc] of Object.entries(
      this.globalState.peerConnections
    )) {
      if (
        pc.connectionState === "connected" ||
        pc.connectionState === "connecting"
      ) {
        const senders = pc.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === "video") {
            try {
              await pc.removeTrack(sender);
              this.logger.debug(
                "StreamManager",
                `Removed video track from peer ${peerId}`
              );
            } catch (error) {
              this.logger.error(
                "StreamManager",
                `Error removing video track from peer ${peerId}:`,
                error.message
              );
            }
          }
        }
      }
    }
  }
  /**
   * Trigger renegotiation with all peers
   */
  async _renegotiateWithAllPeers() {
    this.logger.info(
      "StreamManager",
      "Triggering renegotiation with all peers"
    );

    if (!this.renegotiateCallback) {
      this.logger.error(
        "StreamManager",
        "No renegotiation callback set - cannot renegotiate"
      );
      return;
    }

    const peerCount = Object.keys(this.globalState.peerConnections).length;
    this.logger.info(
      "StreamManager",
      `Starting renegotiation with ${peerCount} peers`
    );

    try {
      await this.renegotiateCallback();
      this.logger.info("StreamManager", "Renegotiation completed successfully");
    } catch (error) {
      this.logger.error(
        "StreamManager",
        "Error during renegotiation:",
        error.message
      );
    }
  }
  /**
   * Identify track type (webcam vs screen share)
   * @param {string} participantId - The participant ID
   * @param {MediaStreamTrack} track - The track
   * @param {MediaStream[]} streams - The streams
   * @returns {Object} { isScreenShare, streamId }
   */
  _identifyTrackType(participantId, track, streams) {
    let isScreenShare = false;
    let streamId = null;

    // Get the event stream ID for reference
    const eventStreamId = streams.length > 0 ? streams[0].id : track.id; // STEP 1: Check userData.active_screen_share first (this is set by EventReceiver)
    if (
      this.globalState.userData[participantId] &&
      this.globalState.userData[participantId].active_screen_share &&
      Array.isArray(
        this.globalState.userData[participantId].active_screen_share
      ) &&
      this.globalState.userData[participantId].active_screen_share.length > 0
    ) {
      this.logger.info(
        "StreamManager",
        `User ${participantId} has active screen shares in userData: ${JSON.stringify(
          this.globalState.userData[participantId].active_screen_share
        )}`
      );

      // Enhanced screen share detection - includes more checks
      const isLikelyScreenShare =
        track.label.includes("screen") ||
        track.label.includes("Screen") ||
        track.id.includes("screen") ||
        eventStreamId.includes("screen") ||
        // Additional check: if this user already has a webcam stream and this is a video track,
        // it's likely a screen share
        (track.kind === "video" &&
          this.globalState.remoteStreams[participantId] &&
          this.globalState.remoteStreams[participantId]
            .getTracks()
            .some((t) => t.kind === "video"));

      if (isLikelyScreenShare) {
        isScreenShare = true;
        // CRITICAL FIX: Don't always use active_screen_share[0]!
        // Instead, try to match the stream with existing screen shares
        // or create a new one if needed

        // Try to find a matching streamId by looking at stream characteristics
        const possibleStreamIds =
          this.globalState.userData[participantId].active_screen_share;

        // Enhanced matching logic
        if (eventStreamId.includes("screen")) {
          // If event stream ID clearly indicates screen share, use it
          streamId = eventStreamId;
        } else {
          // Check if we need to use the first available screen share ID
          // This handles the case where the first screen share doesn't have obvious markers
          streamId = possibleStreamIds[0];
        }

        this.logger.info(
          "StreamManager",
          `Identified as screen share track from userData for ${participantId}: ${streamId}, available: ${JSON.stringify(
            possibleStreamIds
          )}, hasExistingWebcam: ${!!this.globalState.remoteStreams[
            participantId
          ]
            ?.getTracks()
            .some((t) => t.kind === "video")}`
        );
      } else {
        this.logger.info(
          "StreamManager",
          `User has active screen shares but track doesn't look like screen share - track.label: ${track.label}, track.id: ${track.id}, eventStreamId: ${eventStreamId}`
        );
      }
    }

    // STEP 2: Check metadata if not identified yet
    if (
      !isScreenShare &&
      this.globalState.remoteStreamMetadata[participantId]
    ) {
      for (const [metaStreamId, streamType] of Object.entries(
        this.globalState.remoteStreamMetadata[participantId]
      )) {
        if (streamType === "screenshare") {
          if (
            eventStreamId.includes(metaStreamId) ||
            metaStreamId.includes("screen")
          ) {
            isScreenShare = true;
            streamId = metaStreamId;
            this.logger.info(
              "StreamManager",
              `Identified as screen share track from metadata for ${participantId}: ${streamId}`
            );
            break;
          }
        }
      }
    }

    // STEP 3: Fallback: identify by track/stream labels
    if (!isScreenShare) {
      const isScreenShareFallback =
        track.label.includes("screen") ||
        track.label.includes("Screen") ||
        track.id.includes("screen") ||
        (streams.length > 0 && streams[0].id.includes("screen"));

      if (isScreenShareFallback) {
        isScreenShare = true;
        streamId = streams.length > 0 ? streams[0].id : `screen_${Date.now()}`;
        this.logger.info(
          "StreamManager",
          `Identified as screen share track from label for ${participantId}: ${streamId}`
        );

        // Update metadata
        if (!this.globalState.remoteStreamMetadata[participantId]) {
          this.globalState.remoteStreamMetadata[participantId] = {};
        }
        this.globalState.remoteStreamMetadata[participantId][streamId] =
          "screenshare";
      }
    }

    // If we identified this as a screen share, make sure the information is consistent
    if (isScreenShare && streamId) {
      // Make sure this streamId is also registered in userData.active_screen_share
      if (this.globalState.userData[participantId]) {
        if (!this.globalState.userData[participantId].active_screen_share) {
          this.globalState.userData[participantId].active_screen_share = [];
        }

        if (
          !this.globalState.userData[
            participantId
          ].active_screen_share.includes(streamId)
        ) {
          this.globalState.userData[participantId].active_screen_share.push(
            streamId
          );
          this.logger.info(
            "StreamManager",
            `Added ${streamId} to userData.active_screen_share for ${participantId}`
          );
        }
      }
    }
    return { isScreenShare, streamId };
  }
  

  /**
   * Set renegotiation callback (called from main manager)
   * @param {Function} callback - The renegotiation callback
   */
  setRenegotiateCallback(callback) {
    this.renegotiateCallback = callback;
  }
}

// Default export for Expo Router compatibility
export default StreamManager;
