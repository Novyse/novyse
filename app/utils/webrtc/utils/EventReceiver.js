import eventEmitter from "../../EventEmitter";
import SocketMethods from "../../socketMethods";
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
      remoteUserStartedSpeaking:
        this.handleRemoteUserStartedSpeaking.bind(this),
      remoteUserStoppedSpeaking:
        this.handleRemoteUserStoppedSpeaking.bind(this),
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
    eventEmitter.on(
      `user_started_speaking`,
      this.boundHandlers.userStartedSpeaking
    );
    eventEmitter.on(
      `user_stopped_speaking`,
      this.boundHandlers.userStoppedSpeaking
    );
    eventEmitter.on(
      `remote_user_started_speaking`,
      this.boundHandlers.remoteUserStartedSpeaking
    );
    eventEmitter.on(
      `remote_user_stopped_speaking`,
      this.boundHandlers.remoteUserStoppedSpeaking
    );

    // Screen Sharing Events
    eventEmitter.on(
      `screen_share_started`,
      this.boundHandlers.screenShareStarted
    );
    eventEmitter.on(
      `screen_share_stopped`,
      this.boundHandlers.screenShareStopped
    );

    // User Management Events
    eventEmitter.on(`member_joined_comms`, this.boundHandlers.memberJoined);
    eventEmitter.on(`member_left_comms`, this.boundHandlers.memberLeft);
    // WebRTC Signaling Events
    eventEmitter.on("offer", this.boundHandlers.offer);
    eventEmitter.on("answer", this.boundHandlers.answer);
    eventEmitter.on("candidate", this.boundHandlers.iceCandidate);

    // Mid to Stream UUID Mapping Event
    eventEmitter.on(
      "mid_to_uuid_mapping",
      this.boundHandlers.midtoStreamUUIDMapping
    );

    // Webcam Status Events
    eventEmitter.on("webcam_on", this.boundHandlers.webcam_on);
    eventEmitter.on("webcam_off", this.boundHandlers.webcam_off);
  }

  // Voice Activity Detection Handlers
  async handleUserStartedSpeaking() {
    if (this.voiceActivityDetection) {
      this.voiceActivityDetection.setSpeakingState(this.globalState.myId, true);
    }
    await SocketMethods.sendSpeakingStatus(
      this.globalState.getChatId(),
      this.globalState.myId,
      true
    );
  }

  async handleUserStoppedSpeaking() {
    if (this.voiceActivityDetection) {
      this.voiceActivityDetection.setSpeakingState(
        this.globalState.myId,
        false
      );
    }
    await SocketMethods.sendSpeakingStatus(
      this.globalState.getChatId(),
      this.globalState.myId,
      false
    );
  }

  handleRemoteUserStartedSpeaking(data) {
    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      if (this.voiceActivityDetection) {
        this.voiceActivityDetection.setSpeakingState(data.from, true);
      }
    }
  }

  handleRemoteUserStoppedSpeaking(data) {
    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      if (this.voiceActivityDetection) {
        this.voiceActivityDetection.setSpeakingState(data.from, false);
      }
    }
  } // Screen Sharing Handlers
  async handleScreenShareStarted(data) {
    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Remote screen share started:`, data);

      // For remote screen shares, we don't need to create a stream,
      // just update the userData to indicate the remote user has an active screen share
      if (data.screenShareUUID && data.from) {
        // Add the screen share to remote user's userData
        this.globalState.addScreenShare(data.from, data.screenShareUUID, null);

        this.logger?.info(
          `[EventReceiver] Added remote screen share ${data.screenShareUUID} for user ${data.from}`
        );

        if (this.globalState.getChatId() === data.chatId) {
          SoundPlayer.getInstance().playSound("comms_stream_started");
        }
      }
    }
  }

  async handleScreenShareStopped(data) {
    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Remote screen share stopped:`, data);

      // For remote screen shares, remove from userData
      if (data.screenShareUUID && data.from) {
        this.pinManager.clearPinIfId(data.screenShareUUID);
        this.globalState.removeScreenShare(data.from, data.screenShareUUID);

        this.logger?.info(
          `[EventReceiver] Removed remote screen share ${data.screenShareUUID} for user ${data.from}`
        );
      }

      if (this.globalState.getChatId() === data.chatId) {
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
      this.globalState.getMyId() === undefined ||
      this.globalState.getMyId() === null
    ) {
      this.logger?.info(
        `[EventReceiver] handleMemberJoined: Instance not ready, globalState is null, or myId is undefined. Initialized: ${
          this.initialized
        }, GlobalState: ${!!this.globalState}, MyId: ${this.globalState?.myId}`
      );
      return;
    }

    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      this.logger?.info("[EventReceiver] Member joined comms:", data);

      if (this.signalingManager) {
        await this.signalingManager.handleUserJoined(data);
        if (this.globalState.getChatId() === data.chat_id) {
          SoundPlayer.getInstance().playSound("comms_join_vocal");
        }
      }
    }
  }

  async handleMemberLeft(data) {
    // Check if the member is not the current user and if my id is defined
    if (
      data.from !== this.globalState.myId &&
      this.globalState.myId !== undefined
    ) {
      this.logger?.info(`[EventReceiver] Member left comms:+ ${data}`);

      if (this.signalingManager) {
        await this.signalingManager.handleUserLeft(data);
        if (this.globalState.getChatId() === data.chat_id) {
          SoundPlayer.getInstance().playSound("comms_leave_vocal");
        }
      }

      if (this.pinManager) {
        this.pinManager.unpinUser(data.from);
      }
    }
  }
  async handleOffer(data) {
    const { from, offer } = data;
    this.logger?.info(`Received offer from user ${from}`);

    if (this.signalingManager) {
      await this.signalingManager.handleOfferMessage(data);
    }
  }
  async handleAnswer(data) {
    const { from, answer } = data;
    this.logger?.info(`Received answer from user ${from}`);

    if (this.signalingManager) {
      await this.signalingManager.handleAnswerMessage(data);
    }
  }
  async handleICECandidate(data) {
    const { from, candidate } = data;
    this.logger?.debug(`Received ICE candidate from user ${from}`);

    if (this.signalingManager) {
      await this.signalingManager.handleCandidateMessage(data);
    }
  }

  async handleMidtoStreamUUIDMapping(data) {
    const { from, mid, streamUUID } = data;
    this.logger?.debug(
      `Received mid to stream UUID mapping for participant ${from}, mid ${mid}, streamUUID ${streamUUID}`
    );

    if (this.streamMappingManager) {
      this.streamMappingManager.addStreamMapping(from, streamUUID, mid);
    } else {
      this.logger?.warn(
        `[EventReceiver] StreamManager not initialized, cannot handle mid to stream UUID mapping`
      );
    }
  }

  handleWebcamOn(data) {
    const { from } = data;
    this.logger?.info(`Webcam turned on for user ${from}`);

    if (this.globalState) {
      this.globalState.setWebcamStatus(from,true);
    } else {
      this.logger?.warn(
        `[EventReceiver] globalState not initialized, cannot handle webcam on event`
      );
    }
  }

  handleWebcamOff(data) {
    const { from } = data;
    this.logger?.info(`Webcam turned off for user ${from}`);
    if (this.globalState) {
      this.globalState.setWebcamStatus(from, false);
    } else {
      this.logger?.warn(
        `[EventReceiver] globalState not initialized, cannot handle webcam off event`
      );
    }
  }

  // Cleanup method
  removeEventListeners() {
    // Voice Activity Detection Events
    eventEmitter.off(
      `user_started_speaking`,
      this.boundHandlers.userStartedSpeaking
    );
    eventEmitter.off(
      `user_stopped_speaking`,
      this.boundHandlers.userStoppedSpeaking
    );
    eventEmitter.off(
      `remote_user_started_speaking`,
      this.boundHandlers.remoteUserStartedSpeaking
    );
    eventEmitter.off(
      `remote_user_stopped_speaking`,
      this.boundHandlers.remoteUserStoppedSpeaking
    );

    // Screen Sharing Events
    eventEmitter.off(
      `screen_share_started`,
      this.boundHandlers.screenShareStarted
    );
    eventEmitter.off(
      `screen_share_stopped`,
      this.boundHandlers.screenShareStopped
    );

    // User Management Events
    eventEmitter.off(`member_joined_comms`, this.boundHandlers.memberJoined);
    eventEmitter.off(`member_left_comms`, this.boundHandlers.memberLeft);
    // WebRTC Signaling Events
    eventEmitter.off("offer", this.boundHandlers.offer);
    eventEmitter.off("answer", this.boundHandlers.answer);
    eventEmitter.off("candidate", this.boundHandlers.iceCandidate);

    // Mid to Stream UUID Mapping Event
    eventEmitter.off(
      "mid_to_uuid_mapping",
      this.boundHandlers.midtoStreamUUIDMapping
    );

    // Webcam Status Events
    eventEmitter.off("webcam_on", this.boundHandlers.webcam_on);
    eventEmitter.off("webcam_off", this.boundHandlers.webcam_off);
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
