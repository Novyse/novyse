import eventEmitter from "../EventEmitter";
import SoundPlayer from "../sounds/SoundPlayer";
import WebSocketMethods from "../webSocketMethods";

class WebRTCEventReceiver {
  constructor(webrtcManager) {
    this.webrtcManager = webrtcManager;
    this.initialized = false; // Flag to check if initialized
  }

  initialize() {
    if (!this.initialized) {
      this.initialized = true; // Set initialized flag
      this.setupEventListeners(); // Setup event listeners
    }
  }

  setupEventListeners() {
    // Voice Activity Detection Events
    eventEmitter.on(
      "user_started_speaking",
      this.handleUserStartedSpeaking.bind(this)
    );
    eventEmitter.on(
      "user_stopped_speaking",
      this.handleUserStoppedSpeaking.bind(this)
    );
    eventEmitter.on(
      "remote_user_started_speaking",
      this.handleRemoteUserStartedSpeaking.bind(this)
    );
    eventEmitter.on(
      "remote_user_stopped_speaking",
      this.handleRemoteUserStoppedSpeaking.bind(this)
    );

    // Screen Sharing Events
    eventEmitter.on(
      "screen_share_started",
      this.handleScreenShareStarted.bind(this)
    );
    eventEmitter.on(
      "screen_share_stopped",
      this.handleScreenShareStopped.bind(this)
    );

    // User Management Events
    eventEmitter.on("member_joined_comms", this.handleMemberJoined.bind(this));
    eventEmitter.on("member_left_comms", this.handleMemberLeft.bind(this));
  }

  // Voice Activity Detection Handlers
  async handleUserStartedSpeaking() {
    this.webrtcManager?.setUserSpeaking(this.webrtcManager?.myId, true);
    await WebSocketMethods.sendSpeakingStatus(
      this.webrtcManager?.chatId,
      this.webrtcManager?.myId,
      true
    );
  }

  async handleUserStoppedSpeaking() {
    this.webrtcManager?.setUserSpeaking(this.webrtcManager?.myId, false);
    await WebSocketMethods.sendSpeakingStatus(
      this.webrtcManager?.chatId,
      this.webrtcManager?.myId,
      false
    );
  }

  handleRemoteUserStartedSpeaking(data) {
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      this.webrtcManager?.setUserSpeaking(data.from, true);
    }
  }

  handleRemoteUserStoppedSpeaking(data) {
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      this.webrtcManager?.setUserSpeaking(data.from, false);
    }
  }

  // Screen Sharing Handlers
  handleScreenShareStarted(data) {
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      console.log("[EventReceiver] Screen share started:", data);
      SoundPlayer.getInstance().playSound("comms_stream_started");
      this.webrtcManager?.handleRemoteScreenShareStarted(data);
    }
  }

  handleScreenShareStopped(data) {
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      console.log("[EventReceiver] Screen share stopped:", data);
      SoundPlayer.getInstance().playSound("comms_stream_stopped");
      this.webrtcManager?.handleRemoteScreenShareStopped(data);
    }
  }

  // User Management Handlers
  async handleMemberJoined(data) {
    // Check if the member is not the current user and if my id is defined
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      console.log("[EventReceiver] Member joined comms:", data);
      SoundPlayer.getInstance().playSound("comms_join_vocal");
      await this.webrtcManager?.userJoined(data);
    }
  }

  async handleMemberLeft(data) {
    // Check if the member is not the current user and if my id is defined
    if (
      data.from !== this.webrtcManager?.myId &&
      this.webrtcManager?.myId !== undefined
    ) {
      console.log("[EventReceiver] Member left comms:", data);
      SoundPlayer.getInstance().playSound("comms_leave_vocal");
      await this.webrtcManager?.userLeft(data);
    }
  }

  // Cleanup method
  removeEventListeners() {
    eventEmitter.off(
      "user_started_speaking",
      this.handleUserStartedSpeaking.bind(this)
    );
    eventEmitter.off(
      "user_stopped_speaking",
      this.handleUserStoppedSpeaking.bind(this)
    );
    eventEmitter.off(
      "remote_user_started_speaking",
      this.handleRemoteUserStartedSpeaking.bind(this)
    );
    eventEmitter.off(
      "remote_user_stopped_speaking",
      this.handleRemoteUserStoppedSpeaking.bind(this)
    );
    eventEmitter.off(
      "screen_share_started",
      this.handleScreenShareStarted.bind(this)
    );
    eventEmitter.off(
      "screen_share_stopped",
      this.handleScreenShareStopped.bind(this)
    );
    eventEmitter.off("member_joined_comms", this.handleMemberJoined.bind(this));
    eventEmitter.off("member_left_comms", this.handleMemberLeft.bind(this));
  }

  destroy() {
    this.removeEventListeners();
    this.webrtcManager = null; // Clear reference to the WebRTC manager
    this.initialized = false; // Mark as destroyed
  }
}

export default WebRTCEventReceiver;
