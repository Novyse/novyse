import { Platform } from "react-native";
import { LOG_LEVELS } from '../logging/LogLevels.js';
import { getConstraintsForPlatform } from '../config/mediaConstraints.js';
import { WEBRTC_CONSTANTS } from '../config/constants.js';
import { ERROR_CODES } from '../config/constants.js';

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
    
    this.logger.info('StreamManager', 'StreamManager initialized');
  }
  
  /**
   * Start local media stream
   * @param {boolean} audioOnly - Whether to capture only audio
   * @returns {MediaStream|null} The local stream or null if failed
   */
  async startLocalStream(audioOnly = true) {
    this.logger.info('StreamManager', `Starting local stream (audioOnly: ${audioOnly})`);
    
    if (this.globalState.localStream) {
      this.logger.warning('StreamManager', 'Local stream already active');
      return this.globalState.localStream;
    }
    
    try {
      // Get appropriate constraints for platform and scenario
      const scenario = audioOnly ? 'audio_only' : 'video_standard';
      const constraints = getConstraintsForPlatform(Platform.OS, scenario);
      
      this.logger.debug('StreamManager', 'Using constraints:', constraints);
      
      const stream = await mediaDevices.getUserMedia(constraints);
      
      this.logger.info('StreamManager', 'Local stream obtained successfully');
      this.logger.debug('StreamManager', `Stream tracks: ${stream.getTracks().length}`);
      
      this.globalState.localStream = stream;
      
      // Notify UI callback
      if (this.globalState.callbacks.onLocalStreamReady) {
        this.globalState.callbacks.onLocalStreamReady(stream);
      }
      
      // Add stream to existing peer connections
      this._addLocalStreamToAllPeers();
      
      return stream;
      
    } catch (error) {
      this.logger.error('StreamManager', 'Error getting local stream:', error.message);
      
      // Handle specific error types gracefully
      if (error.name === ERROR_CODES.PERMISSION_DENIED) {
        this.logger.warning('StreamManager', 'Media permission denied by user');
      } else if (error.name === ERROR_CODES.DEVICE_NOT_FOUND) {
        this.logger.warning('StreamManager', 'No media devices found');
      } else if (error.name === ERROR_CODES.DEVICE_IN_USE) {
        this.logger.warning('StreamManager', 'Media device is in use by another application');
      }
      
      throw error;
    }
  }
  
  /**
   * Add video track to existing local stream
   * @returns {MediaStreamTrack|null} The added video track or null if failed
   */
  async addVideoTrack() {
    this.logger.info('StreamManager', 'Adding video track to local stream');
    
    try {
      // Get video constraints for current platform
      const constraints = getConstraintsForPlatform(Platform.OS, 'video_standard');
      const videoConstraints = { video: constraints.video };
      
      const videoStream = await mediaDevices.getUserMedia(videoConstraints);
      const videoTrack = videoStream.getVideoTracks()[0];
      
      if (this.globalState.localStream && videoTrack) {
        this.globalState.localStream.addTrack(videoTrack);
        
        this.logger.info('StreamManager', 'Video track added successfully');
        
        // Add track to all peer connections
        await this._addTrackToAllPeers(videoTrack);
        
        // Notify UI
        if (this.globalState.callbacks.onLocalStreamReady) {
          this.globalState.callbacks.onLocalStreamReady(this.globalState.localStream);
        }
        
        // Trigger renegotiation after a short delay
        setTimeout(async () => {
          await this._renegotiateWithAllPeers();
        }, WEBRTC_CONSTANTS.RENEGOTIATION_DELAY);
        
        return videoTrack;
      }
      
      return null;
      
    } catch (error) {
      // Handle permission denied gracefully for video
      if (error.name === ERROR_CODES.PERMISSION_DENIED || 
          error.message.includes("Permission denied")) {
        this.logger.info('StreamManager', 'Video permission denied by user - silently ignoring');
        return null; // Return null instead of throwing
      }
      
      this.logger.error('StreamManager', 'Error adding video track:', error.message);
      throw error;
    }
  }
  
  /**
   * Remove all video tracks from local stream
   */
  async removeVideoTracks() {
    this.logger.info('StreamManager', 'Removing video tracks from local stream');
    
    if (!this.globalState.localStream) {
      this.logger.warning('StreamManager', 'No local stream to remove video tracks from');
      return;
    }
    
    const videoTracks = this.globalState.localStream.getVideoTracks();
    
    // Stop and remove tracks from local stream
    videoTracks.forEach((track) => {
      track.stop();
      this.globalState.localStream.removeTrack(track);
    });
    
    this.logger.info('StreamManager', `Removed ${videoTracks.length} video tracks`);
    
    // Remove tracks from peer connections
    await this._removeVideoTracksFromAllPeers();
    
    // Notify UI
    if (this.globalState.callbacks.onLocalStreamReady) {
      this.globalState.callbacks.onLocalStreamReady(this.globalState.localStream);
    }
    
    // Trigger renegotiation
    setTimeout(async () => {
      await this._renegotiateWithAllPeers();
    }, WEBRTC_CONSTANTS.RENEGOTIATION_DELAY);
  }
  
  /**
   * Close local stream and stop all tracks
   */
  closeLocalStream() {
    this.logger.info('StreamManager', 'Closing local stream');
    
    if (this.globalState.localStream) {
      this.globalState.localStream.getTracks().forEach((track) => {
        track.stop();
        this.logger.debug('StreamManager', `Stopped ${track.kind} track`);
      });
      
      this.globalState.localStream = null;
      
      // Notify UI
      if (this.globalState.callbacks.onLocalStreamReady) {
        this.globalState.callbacks.onLocalStreamReady(null);
      }
      
      this.logger.info('StreamManager', 'Local stream closed successfully');
    }
  }
  /**
   * Handle incoming remote stream track
   * @param {string} participantId - The participant ID
   * @param {RTCTrackEvent} event - The track event
   */
  handleRemoteTrack(participantId, event) {
    this.logger.info('StreamManager', 
      `Received remote track from ${participantId}: ${event.track.kind} with label: ${event.track.label}`);
    
    const track = event.track;
    const streams = event.streams;
    
    this.logger.debug('StreamManager', {
      trackId: track.id,
      trackLabel: track.label,
      trackKind: track.kind,
      streamIds: streams.map(s => s.id)
    });

    // Check userData for active screen shares FIRST (this data is set by EventReceiver)
    const hasActiveScreenShare = 
      this.globalState.userData[participantId] && 
      this.globalState.userData[participantId].active_screen_share && 
      Array.isArray(this.globalState.userData[participantId].active_screen_share) && 
      this.globalState.userData[participantId].active_screen_share.length > 0;
    
    // Early detection of potential screen share tracks by examining track properties
    const looksLikeScreenShare = 
      track.label.includes("screen") || 
      track.label.includes("Screen") || 
      track.id.includes("screen") ||
      (streams.length > 0 && streams[0].id && streams[0].id.includes("screen"));
    
    // Log screen share detection status for debugging
    if (hasActiveScreenShare) {  
      this.logger.info('StreamManager', `User ${participantId} has active screen shares in userData: ${JSON.stringify(this.globalState.userData[participantId].active_screen_share)}`);
      this.logger.info('StreamManager', `Track appears to be screen share: ${looksLikeScreenShare ? 'YES' : 'NO'}`);
    }
    
    // CRITICAL PART: If this user has active_screen_share entries AND this looks like a screen share track,
    // bypass regular identification and directly handle it as a screen share
    if (hasActiveScreenShare && looksLikeScreenShare) {
      const activeScreenShareId = this.globalState.userData[participantId].active_screen_share[0];
      this.logger.info('StreamManager', `FAST PATH: Handling as screen share track with id: ${activeScreenShareId}`);
      this._handleScreenShareTrack(participantId, track, activeScreenShareId, streams);
      this._setupTrackEventHandlers(participantId, track);
      return;
    }
    
    // Standard path: Use _identifyTrackType for normal classification
    const { isScreenShare, streamId } = this._identifyTrackType(participantId, track, streams);
    
    if (isScreenShare) {
      this.logger.info('StreamManager', `Identified as screen share track, forwarding to _handleScreenShareTrack with streamId: ${streamId}`);
      this._handleScreenShareTrack(participantId, track, streamId, streams);
    } else {
      this.logger.info('StreamManager', `Identified as webcam track, forwarding to _handleWebcamTrack`);
      this._handleWebcamTrack(participantId, track, streams);
    }
    
    // Setup track event handlers
    this._setupTrackEventHandlers(participantId, track);
    
    // Notify UI
    this._notifyStreamUpdate();
  }
  
  /**
   * Remove remote stream for participant
   * @param {string} participantId - The participant ID
   */
  removeRemoteStream(participantId) {
    this.logger.info('StreamManager', `Removing remote stream for ${participantId}`);
    
    // Remove regular stream
    if (this.globalState.remoteStreams[participantId]) {
      const stream = this.globalState.remoteStreams[participantId];
      stream.getTracks().forEach(track => {
        track.stop();
        this.logger.debug('StreamManager', `Stopped remote ${track.kind} track`);
      });
      
      delete this.globalState.remoteStreams[participantId];
    }
    
    // Remove screen share streams
    if (this.globalState.remoteScreenStreams[participantId]) {
      Object.values(this.globalState.remoteScreenStreams[participantId]).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      delete this.globalState.remoteScreenStreams[participantId];
    }
    
    // Remove metadata
    if (this.globalState.remoteStreamMetadata[participantId]) {
      delete this.globalState.remoteStreamMetadata[participantId];
    }
    
    // Remove from audio context if applicable
    if (this.globalState.audioContextRef && this.globalState.audioContextRef.removeAudio) {
      this.globalState.audioContextRef.removeAudio(participantId);
    }
    
    this.logger.info('StreamManager', `Remote stream for ${participantId} removed successfully`);
    
    this._notifyStreamUpdate();
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
    
    this.logger.debug('StreamManager', 'Local stream added to all peer connections');
  }
  
  /**
   * Add local tracks to a specific peer connection
   * @param {RTCPeerConnection} pc - The peer connection
   */
  _addLocalTracksToPeerConnection(pc) {
    if (!this.globalState.localStream) return;
    
    this.globalState.localStream.getTracks().forEach((track) => {
      // Avoid duplicates
      const existingSender = pc.getSenders().find((s) => s.track && s.track.id === track.id);
      if (!existingSender) {
        pc.addTrack(track, this.globalState.localStream);
        this.logger.debug('StreamManager', `Added ${track.kind} track to peer connection`);
      }
    });
  }
  
  /**
   * Add a specific track to all peer connections
   * @param {MediaStreamTrack} track - The track to add
   */
  async _addTrackToAllPeers(track) {
    for (const [peerId, pc] of Object.entries(this.globalState.peerConnections)) {
      if (pc.connectionState === "connected" || pc.connectionState === "connecting") {
        try {
          await pc.addTrack(track, this.globalState.localStream);
          this.logger.debug('StreamManager', `Added ${track.kind} track to peer ${peerId}`);
        } catch (error) {
          this.logger.error('StreamManager', `Error adding track to peer ${peerId}:`, error.message);
        }
      }
    }
  }
  
  /**
   * Remove video tracks from all peer connections
   */
  async _removeVideoTracksFromAllPeers() {
    for (const [peerId, pc] of Object.entries(this.globalState.peerConnections)) {
      if (pc.connectionState === "connected" || pc.connectionState === "connecting") {
        const senders = pc.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === "video") {
            try {
              await pc.removeTrack(sender);
              this.logger.debug('StreamManager', `Removed video track from peer ${peerId}`);
            } catch (error) {
              this.logger.error('StreamManager', `Error removing video track from peer ${peerId}:`, error.message);
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
    this.logger.debug('StreamManager', 'Triggering renegotiation with all peers');
    
    // This will be called from the main manager
    if (this.renegotiateCallback) {
      await this.renegotiateCallback();
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
    const eventStreamId = streams.length > 0 ? streams[0].id : track.id;
    
    // STEP 1: Check userData.active_screen_share first (this is set by EventReceiver)
    if (this.globalState.userData[participantId] && 
        this.globalState.userData[participantId].active_screen_share && 
        Array.isArray(this.globalState.userData[participantId].active_screen_share) && 
        this.globalState.userData[participantId].active_screen_share.length > 0) {
      
      this.logger.info('StreamManager', `User ${participantId} has active screen shares in userData: ${JSON.stringify(this.globalState.userData[participantId].active_screen_share)}`);
      
      // If the track has "screen" markers in the ID or labels, and the user has active screen shares,
      // we can safely assume this is a screen share track
      const isLikelyScreenShare = 
        track.label.includes("screen") ||
        track.label.includes("Screen") ||
        track.id.includes("screen") ||
        eventStreamId.includes("screen");
      
      if (isLikelyScreenShare) {
        isScreenShare = true;
        // Use the first active screen share ID from userData as our streamId
        streamId = this.globalState.userData[participantId].active_screen_share[0];
        this.logger.info('StreamManager', `Identified as screen share track from userData for ${participantId}: ${streamId}`);
      }
    }
    
    // STEP 2: Check metadata if not identified yet
    if (!isScreenShare && this.globalState.remoteStreamMetadata[participantId]) {
      for (const [metaStreamId, streamType] of Object.entries(this.globalState.remoteStreamMetadata[participantId])) {
        if (streamType === "screenshare") {
          if (eventStreamId.includes(metaStreamId) || metaStreamId.includes("screen")) {
            isScreenShare = true;
            streamId = metaStreamId;
            this.logger.info('StreamManager', `Identified as screen share track from metadata for ${participantId}: ${streamId}`);
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
        this.logger.info('StreamManager', `Identified as screen share track from label for ${participantId}: ${streamId}`);
        
        // Update metadata
        if (!this.globalState.remoteStreamMetadata[participantId]) {
          this.globalState.remoteStreamMetadata[participantId] = {};
        }
        this.globalState.remoteStreamMetadata[participantId][streamId] = "screenshare";
      }
    }
    
    // If we identified this as a screen share, make sure the information is consistent
    if (isScreenShare && streamId) {
      // Make sure this streamId is also registered in userData.active_screen_share
      if (this.globalState.userData[participantId]) {
        if (!this.globalState.userData[participantId].active_screen_share) {
          this.globalState.userData[participantId].active_screen_share = [];
        }
        
        if (!this.globalState.userData[participantId].active_screen_share.includes(streamId)) {
          this.globalState.userData[participantId].active_screen_share.push(streamId);
          this.logger.info('StreamManager', `Added ${streamId} to userData.active_screen_share for ${participantId}`);
        }
      }
    }
      return { isScreenShare, streamId };
  };/**
   * Handle screen share track
   * @param {string} participantId - The participant ID
   * @param {MediaStreamTrack} track - The track
   * @param {string} streamId - The stream ID
   * @param {MediaStream[]} streams - The streams
   */
  _handleScreenShareTrack(participantId, track, streamId, streams) {
    this.logger.info('StreamManager', `Handling screen share track: ${participantId}/${streamId}`);
    
    // Initialize screen streams structure
    if (!this.globalState.remoteScreenStreams[participantId]) {
      this.globalState.remoteScreenStreams[participantId] = {};
    }
    
    // Create or get screen share stream
    if (!this.globalState.remoteScreenStreams[participantId][streamId]) {
      // If stream was provided in the event, use it
      const eventStream = streams && streams.length > 0 ? streams[0] : null;
      
      if (eventStream) {
        this.logger.info('StreamManager', `Using existing stream from event for ${streamId}`);
        this.globalState.remoteScreenStreams[participantId][streamId] = eventStream;
      } else {
        // Create a new MediaStream
        this.logger.info('StreamManager', `Creating new MediaStream for ${streamId}`);
        this.globalState.remoteScreenStreams[participantId][streamId] = new WebRTC.MediaStream();
      }
    }
    
    const stream = this.globalState.remoteScreenStreams[participantId][streamId];
    
    // Check if track is already in stream to avoid duplicates
    const hasTrack = stream.getTracks().some(t => t.id === track.id);
    if (!hasTrack) {
      stream.addTrack(track);
      this.logger.info('StreamManager', `Screen share track added: ${participantId}/${streamId} (${track.kind})`);
    } else {
      this.logger.info('StreamManager', `Track already exists in stream, not adding again: ${track.id}`);
    }
    
    // Get user data from multiple sources to ensure consistency
    let userData = this.globalState.userData[participantId];
    
    // If userData not found in globalState, try to get it from active screen shares
    if (!userData && this.globalState.screenShares && this.globalState.screenShares[participantId]) {
      userData = this.globalState.screenShares[participantId].userData;
      this.logger.info('StreamManager', 'Using userData from screenShares state:', userData);
    }
    
    // If still no userData, create a minimal one to prevent errors
    if (!userData) {
      this.logger.warn('StreamManager', 'No user data found for participant, creating minimal userData:', participantId);
      userData = {
        userId: participantId,
        username: `User ${participantId}`,
        profilePicture: null
      };
    }

    // CRITICAL FIX: Add the screen share to userData if not already present
    // This ensures the metadata and stream are properly linked
    if (!this.globalState.userData[participantId]) {
      this.globalState.userData[participantId] = userData;
    }
    
    // Add screen share to userData and ensure it has active_screen_share array
    if (!this.globalState.userData[participantId].active_screen_share) {
      this.globalState.userData[participantId].active_screen_share = [];
    }
    
    // Add to active_screen_share if not already present
    if (!this.globalState.userData[participantId].active_screen_share.includes(streamId)) {
      this.globalState.userData[participantId].active_screen_share.push(streamId);
    }
    
    // Add screen share to globalState using the correct method
    this.globalState.addScreenShare(participantId, streamId, stream);
    
    // Also add to remoteStreamMetadata for consistency
    if (!this.globalState.remoteStreamMetadata[participantId]) {
      this.globalState.remoteStreamMetadata[participantId] = {};
    }
    this.globalState.remoteStreamMetadata[participantId][streamId] = "screenshare";
    
    this.logger.info('StreamManager', `Screen share added to all required state objects for ${participantId}/${streamId}`);

    // Store consistent stream info for UI consumption
    const streamInfo = {
      participantId,
      stream: stream,
      streamType: "screenshare", // Explicitly mark as screen share
      streamId: streamId,
      userData: { ...this.globalState.userData[participantId] }, // Use updated userData
      trackInfo: {
        kind: track.kind,
        id: track.id,
        label: track.label
      }
    };

    // Store the stream info in globalState for consistency checking
    if (!this.globalState.remoteStreamInfo) {
      this.globalState.remoteStreamInfo = {};
    }
    this.globalState.remoteStreamInfo[streamId] = streamInfo;
    
    // Emit event for UI with the actual stream
    if (this.globalState.eventEmitter) {
      this.logger.info('StreamManager', `Emitting stream_added_or_updated event for screen share: ${participantId}/${streamId}`);
      this.globalState.eventEmitter.emit("stream_added_or_updated", streamInfo);
    }
  }
    /**
   * Handle webcam track
   * @param {string} participantId - The participant ID
   * @param {MediaStreamTrack} track - The track
   * @param {MediaStream[]} streams - The streams
   */
  _handleWebcamTrack(participantId, track, streams) {
    this.logger.info('StreamManager', `Handling webcam track: ${participantId} (${track.kind})`);
    
    // Double-check this isn't a screen share track that got misrouted
    // Even though _identifyTrackType should have caught this, we'll check again just to be safe
    const userData = this.globalState.userData[participantId];
    const isScreenShareUser = userData && userData.active_screen_share && 
                             Array.isArray(userData.active_screen_share) && 
                             userData.active_screen_share.length > 0;
                             
    // If the track looks like a screen share and the user has active screen shares, handle as screen share
    const isScreenShareTrack = 
      track.label.includes("screen") || 
      track.label.includes("Screen") || 
      track.id.includes("screen") ||
      (streams.length > 0 && streams[0].id.includes("screen"));
      
    if (isScreenShareUser && isScreenShareTrack) {
      this.logger.warn('StreamManager', `Track appears to be a screen share but was routed to _handleWebcamTrack, redirecting: ${participantId} (${track.kind})`);
      
      // Get the screen share ID from userData
      const streamId = userData.active_screen_share[0];
      
      // Handle as a screen share track instead
      this._handleScreenShareTrack(participantId, track, streamId, streams);
      return;
    }
    
    // Initialize remote stream if needed
    if (!this.globalState.remoteStreams[participantId]) {
      this.globalState.remoteStreams[participantId] = new WebRTC.MediaStream();
    }
    
    const stream = this.globalState.remoteStreams[participantId];
    
    // Check if track is already in stream to avoid duplicates
    const hasTrack = stream.getTracks().some(t => t.id === track.id);
    if (!hasTrack) {
      stream.addTrack(track);
      this.logger.info('StreamManager', `Webcam track added: ${participantId} (${track.kind})`);
    } else {
      this.logger.info('StreamManager', `Track already exists in stream, not adding again: ${track.id}`);
    }
    
    // Handle audio through audio context
    if (this.globalState.audioContextRef && stream.getAudioTracks().length > 0) {
      this.globalState.audioContextRef.addAudio(participantId, stream);
    }
      // Emit event for UI
    if (this.globalState.eventEmitter) {
      this.globalState.eventEmitter.emit("stream_added_or_updated", {
        participantId,
        stream,
        streamType: "webcam",
        userData: this.globalState.userData[participantId],
      });
    }
  }
  
  /**
   * Setup event handlers for track
   * @param {string} participantId - The participant ID
   * @param {MediaStreamTrack} track - The track
   */
  _setupTrackEventHandlers(participantId, track) {
    track.onended = () => {
      this.logger.info('StreamManager', `Remote track ended: ${participantId} (${track.kind})`);
      this._notifyStreamUpdate();
    };
    
    track.onmute = () => {
      this.logger.debug('StreamManager', `Remote track muted: ${participantId} (${track.kind})`);
      this._notifyStreamUpdate();
    };
    
    track.onunmute = () => {
      this.logger.debug('StreamManager', `Remote track unmuted: ${participantId} (${track.kind})`);
      this._notifyStreamUpdate();
    };
  }
  
  /**
   * Notify UI of stream updates
   */
  _notifyStreamUpdate() {
    if (this.globalState.callbacks.onStreamUpdate) {
      this.globalState.callbacks.onStreamUpdate();
    }
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
