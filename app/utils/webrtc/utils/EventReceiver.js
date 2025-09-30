import eventEmitter from "../../global/Events/lib/EventEmitter";
import SocketIO from "../../backend-services/socket-io";
import SoundPlayer from "../../sounds/SoundPlayer";

class WebRTCEventReceiver {
  constructor(logger, globalState) {
    this.initialized = false; // Flag to check if initialized
    this.logger = logger; // Logger instance

    // Component references (set via dependency injection)
    this.webrtcManager = null;
    this.signalingManager = null;
    this.peerConnectionManager = null;
    this.streamManager = null;
    this.streamMappingManager = null;
    this.voiceActivityDetection = null;
    this.pinManager = null;
    this.healthChecker = null;
    this.recoveryManager = null;
    this.globalState = globalState;

    // Store bound function references (to make sure event listeners are removed correctly)
    this.boundHandlers = {
      userStartedSpeaking: this.handleUserStartedSpeaking.bind(this),
      userStoppedSpeaking: this.handleUserStoppedSpeaking.bind(this),
      screenShareStarted: this.handleScreenShareStarted.bind(this),
      screenShareStopped: this.handleScreenShareStopped.bind(this),
      memberJoined: this.handleMemberJoined.bind(this),
      memberLeft: this.handleMemberLeft.bind(this),
      offer: this.handleOffer.bind(this),
      answer: this.handleAnswer.bind(this),
      iceCandidate: this.handleICECandidate.bind(this),
      midtoStreamUUIDMapping: this.handleMidtoStreamUUIDMapping.bind(this),
      webcam_on: this.handleWebcamOn.bind(this),
      webcam_off: this.handleWebcamOff.bind(this),
    };
  }

  initialize(components = {}) {
    if (!this.initialized) {
      // Set component references
      Object.assign(this, components);

      this.setupEventListeners(); // Setup event listeners
      this.initialized = true; // Set initialized flag

      this.logger?.info(`[EventReceiver] Initialized WebRTC Event Receiver`);
    }
  }

  setupEventListeners() {
    // Voice Activity Detection Events
    eventEmitter.on(`comms_speaking`, this.boundHandlers.userStartedSpeaking);
    eventEmitter.on(
      `comms_not_speaking`,
      this.boundHandlers.userStoppedSpeaking
    );

    // Screen Sharing Events
    eventEmitter.on(
      `screen_share_start`,
      this.boundHandlers.screenShareStarted
    );
    eventEmitter.on(`screen_share_stop`, this.boundHandlers.screenShareStopped);

    // User Management Events
    eventEmitter.on(`comms_join`, this.boundHandlers.memberJoined);
    eventEmitter.on(`comms_left`, this.boundHandlers.memberLeft);
    // WebRTC Signaling Events
    eventEmitter.on("comms_offer", this.boundHandlers.offer);
    eventEmitter.on("comms_answer", this.boundHandlers.answer);
    eventEmitter.on("comms_candidate", this.boundHandlers.iceCandidate);

    // Mid to Stream UUID Mapping Event
    eventEmitter.on(
      "comms_mid_to_uuid_mapping",
      this.boundHandlers.midtoStreamUUIDMapping
    );

    // Webcam Status Events
    eventEmitter.on("comms_webcam_on", this.boundHandlers.webcam_on);
    eventEmitter.on("comms_webcam_off", this.boundHandlers.webcam_off);
  }

  async handleUserStartedSpeaking(data) {
    if (data.fromSocket) return; // Ignore events that came from socket to prevent circular emission

    if (data.deviceUUID === this.globalState.getDeviceUUID()) {
      const sender = SocketIO.send();
      if (sender) {
        await sender.sendSpeakingStatus(
          this.globalState.getCommUUID(),
          this.globalState.deviceUUID,
          true
        );
      } else {
        this.logger?.warn(
          "[EventReceiver] Cannot send speaking status: socket not connected"
        );
      }
    } else {
      if (
        data.deviceUUID !== this.globalState.deviceUUID &&
        this.globalState.deviceUUID !== undefined
      ) {
        if (this.voiceActivityDetection) {
          this.voiceActivityDetection.setSpeakingState(data.deviceUUID, true);
        }
      }
    }
  }

  async handleUserStoppedSpeaking(data) {
    if (data.fromSocket) return; // Ignore events that came from socket to prevent circular emission

    if (data.deviceUUID === this.globalState.getDeviceUUID()) {
      const sender = SocketIO.send();
      if (sender) {
        await sender.sendSpeakingStatus(
          this.globalState.getCommUUID(),
          this.globalState.getDeviceUUID(),
          false
        );
      } else {
        this.logger?.warn(
          "[EventReceiver] Cannot send speaking status: socket not connected"
        );
      }
    } else {
      if (
        data.deviceUUID !== this.globalState.deviceUUID &&
        this.globalState.deviceUUID !== undefined
      ) {
        if (this.voiceActivityDetection) {
          this.voiceActivityDetection.setSpeakingState(data.deviceUUID, false);
        }
      }
    }
  } // Screen Sharing Handlers
  async handleScreenShareStarted(data) {
    if (
      data.deviceUUID !== this.globalState.deviceUUID &&
      this.globalState.deviceUUID !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Remote screen share started:`, data);

      // For remote screen shares, we don't need to create a stream,
      // just update the userData to indicate the remote user has an active screen share
      if (data.screenShareUUID && data.deviceUUID) {
        // Add the screen share to remote user's userData
        this.globalState.addScreenShare(
          data.deviceUUID,
          data.screenShareUUID,
          null
        );

        this.logger?.info(
          `[EventReceiver] Added remote screen share ${data.screenShareUUID} for user ${data.deviceUUID}`
        );

        if (this.globalState.getCommUUID() === data.commUUID) {
          SoundPlayer.getInstance().playSound("comms_stream_started");
        }
      }
    }
  }

  async handleScreenShareStopped(data) {
    if (
      data.deviceUUID !== this.globalState.deviceUUID &&
      this.globalState.deviceUUID !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Remote screen share stopped:`, data);

      // For remote screen shares, remove deviceUUID userData
      if (data.screenShareUUID && data.deviceUUID) {
        this.pinManager.clearPinIfId(data.screenShareUUID);
        this.globalState.removeScreenShare(
          data.deviceUUID,
          data.screenShareUUID
        );

        this.logger?.info(
          `[EventReceiver] Removed remote screen share ${data.screenShareUUID} for user ${data.deviceUUID}`
        );
      }

      if (this.globalState.getCommUUID() === data.commUUID) {
        SoundPlayer.getInstance().playSound("comms_stream_stopped");
      }
    }
  }

  // === WebRTC Signaling Event Handlers ===

  // User Management Handlers
  async handleMemberJoined(data) {
    // Check if the member is not the current user and if my id is defined
    if (
      !this.initialized ||
      !this.globalState ||
      this.globalState.getDeviceUUID() === undefined ||
      this.globalState.getDeviceUUID() === null
    ) {
      this.logger?.info(
        `[EventReceiver] handleMemberJoined: Instance not ready, globalState is null, or deviceUUID is undefined. Initialized: ${
          this.initialized
        }, GlobalState: ${!!this.globalState}, MyId: ${this.globalState?.deviceUUID}`
      );
      return;
    }

    if (
      data.deviceUUID !== this.globalState.deviceUUID &&
      this.globalState.deviceUUID !== undefined
    ) {
      this.logger?.info("[EventReceiver] Member joined comms:", data);

      if (this.signalingManager) {
        await this.signalingManager.handleUserJoined(data);
        if (this.globalState.getCommUUID() === data.commUUID) {
          SoundPlayer.getInstance().playSound("comms_join_vocal");
        }
      }
    }
  }

  async handleMemberLeft(data) {
    // Check if the member is not the current user and if my id is defined
    if (
      data.deviceUUID !== this.globalState.deviceUUID &&
      this.globalState.deviceUUID !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Member left comms:+ ${data}`);

      if (this.signalingManager) {
        await this.signalingManager.handleUserLeft(data);
        if (this.globalState.getCommUUID() === data.commUUID) {
          SoundPlayer.getInstance().playSound("comms_leave_vocal");
        }
      }

      if (this.pinManager) {
        this.pinManager.unpinUser(data.deviceUUID);
      }
    }
  }
  async handleOffer(data) {
    const { deviceUUID, offer } = data;
    this.logger?.info(`Received offer deviceUUID user ${deviceUUID}`);

    if (this.signalingManager) {
      await this.signalingManager.handleOfferMessage(data);
    }
  }
  async handleAnswer(data) {
    const { deviceUUID, answer } = data;
    this.logger?.info(`Received answer deviceUUID user ${deviceUUID}`);

    if (this.signalingManager) {
      await this.signalingManager.handleAnswerMessage(data);
    }
  }
  async handleICECandidate(data) {
    const { deviceUUID, candidate } = data;
    this.logger?.debug(`Received ICE candidate deviceUUID user ${deviceUUID}`);

    if (this.signalingManager) {
      await this.signalingManager.handleCandidateMessage(data);
    }
  }

  async handleMidtoStreamUUIDMapping(data) {
    const { deviceUUID, mid, streamUUID } = data;
    this.logger?.debug(
      `Received mid to stream UUID mapping for participant ${deviceUUID}, mid ${mid}, streamUUID ${streamUUID}`
    );

    if (this.streamMappingManager) {
      this.streamMappingManager.addStreamMapping(deviceUUID, streamUUID, mid);
    } else {
      this.logger?.warn(
        `[EventReceiver] StreamManager not initialized, cannot handle mid to stream UUID mapping`
      );
    }
  }

  handleWebcamOn(data) {
    const { deviceUUID } = data;
    this.logger?.info(`Webcam turned on for user ${deviceUUID}`);

    if (this.globalState) {
      this.globalState.setWebcamStatus(deviceUUID, true);
    } else {
      this.logger?.warn(
        `[EventReceiver] globalState not initialized, cannot handle webcam on event`
      );
    }
  }

  handleWebcamOff(data) {
    const { deviceUUID } = data;
    this.logger?.info(`Webcam turned off for user ${deviceUUID}`);
    if (this.globalState) {
      this.globalState.setWebcamStatus(deviceUUID, false);
    } else {
      this.logger?.warn(
        `[EventReceiver] globalState not initialized, cannot handle webcam off event`
      );
    }
  }

  // Cleanup method
  removeEventListeners() {
    // Voice Activity Detection Events
    eventEmitter.off(`comms_speaking`, this.boundHandlers.userStartedSpeaking);
    eventEmitter.off(
      `comms_not_speaking`,
      this.boundHandlers.userStoppedSpeaking
    );
    eventEmitter.off(`comms_speaking`, this.boundHandlers.userStartedSpeaking);
    eventEmitter.off(
      `comms_not_speaking`,
      this.boundHandlers.userStoppedSpeaking
    );

    // Screen Sharing Events
    eventEmitter.off(
      `screen_share_start`,
      this.boundHandlers.screenShareStarted
    );
    eventEmitter.off(
      `screen_share_stopp`,
      this.boundHandlers.screenShareStopped
    );

    // User Management Events
    eventEmitter.off(`comms_join`, this.boundHandlers.memberJoined);
    eventEmitter.off(`comms_left`, this.boundHandlers.memberLeft);
    // WebRTC Signaling Events
    eventEmitter.off("comms_offer", this.boundHandlers.offer);
    eventEmitter.off("comms_answer", this.boundHandlers.answer);
    eventEmitter.off("comms_candidate", this.boundHandlers.iceCandidate);

    // Mid to Stream UUID Mapping Event
    eventEmitter.off(
      "comms_mid_to_uuid_mapping",
      this.boundHandlers.midtoStreamUUIDMapping
    );

    // Webcam Status Events
    eventEmitter.off("comms_webcam_on", this.boundHandlers.webcam_on);
    eventEmitter.off("comms_webcam_off", this.boundHandlers.webcam_off);
  }

  destroy() {
    this.removeEventListeners();
    this.initialized = false; // Mark as destroyed
    this.globalState = null; // Clear global state reference

    // Clear components references
    this.webrtcManager = null;
    this.signalingManager = null;
    this.peerConnectionManager = null;
    this.streamManager = null;
    this.streamMappingManager = null;
    this.voiceActivityDetection = null;
    this.pinManager = null;
    this.healthChecker = null;
    this.recoveryManager = null;

    this.logger?.info(`[EventReceiver] Destroyed WebRTC Event Receiver`);
  }
}

export default WebRTCEventReceiver;
