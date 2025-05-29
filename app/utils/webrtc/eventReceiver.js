import eventEmitter from '../EventEmitter';
import SoundPlayer from '../sounds/SoundPlayer';

class WebRTCEventReceiver {

  constructor(webrtcManager) {
    this.webrtcManager = webrtcManager;
    this.initialized = false; // Flag to check if initialized
  }
// QUA SETTIAMO GLI EVENTI GLOBALI DI WEBRTC, QUINDI AVREMO DUE EVENT EMITTER ON, UNO SU VOCAL CONTENT PER LA UI E UNO QUI PER TUTTA LA LOGICA DIETRO

  initialize() {
    if (!this.initialized) {
      this.initialized = true; // Set initialized flag
      this.setupEventListeners(); // Setup event listeners
    }
  }

  setupEventListeners() {

    // Voice Activity Detection Events (da sistemare)
    eventEmitter.on('speaking', this.handleRemoteSpeaking.bind(this));
    eventEmitter.on('not_speaking', this.handleRemoteNotSpeaking.bind(this));
    eventEmitter.on('remote_user_started_speaking', this.handleRemoteUserStartedSpeaking.bind(this));
    eventEmitter.on('remote_user_stopped_speaking', this.handleRemoteUserStoppedSpeaking.bind(this));

    // Screen Sharing Events
    eventEmitter.on('screen_share_started', this.handleScreenShareStarted.bind(this));
    eventEmitter.on('screen_share_stopped', this.handleScreenShareStopped.bind(this));

    // User Management Events
    eventEmitter.on('member_joined_comms', this.handleMemberJoined.bind(this));
    eventEmitter.on('member_left_comms', this.handleMemberLeft.bind(this));

  }

  // Voice Activity Detection Handlers
  handleRemoteSpeaking(data) {
    console.log('[EventReceiver] Remote user speaking:', data);
    this.webrtcManager?.handleRemoteSpeaking(data);
  }

  handleRemoteNotSpeaking(data) {
    console.log('[EventReceiver] Remote user stopped speaking:', data);
    this.webrtcManager?.handleRemoteNotSpeaking(data);
  }

  handleRemoteUserStartedSpeaking(data) {
    console.log('[EventReceiver] Remote user started speaking (UI):', data);
    // Emit for UI components
    eventEmitter.emit('user_started_speaking', data);
  }

  handleRemoteUserStoppedSpeaking(data) {
    console.log('[EventReceiver] Remote user stopped speaking (UI):', data);
    // Emit for UI components
    eventEmitter.emit('user_stopped_speaking', data);
  }

  // Screen Sharing Handlers
  handleScreenShareStarted(data) {
    console.log('[EventReceiver] Screen share started:', data);
    SoundPlayer.getInstance().playSound('comms_stream_started');
    this.webrtcManager?.handleRemoteScreenShareStarted(data);
  }

  handleScreenShareStopped(data) {
    console.log('[EventReceiver] Screen share stopped:', data);
    SoundPlayer.getInstance().playSound('comms_stream_stopped');
    this.webrtcManager?.handleRemoteScreenShareStopped(data);
  }

  // User Management Handlers
  async handleMemberJoined(data) {
    console.log('[EventReceiver] Member joined comms:', data);
    SoundPlayer.getInstance().playSound('comms_join_vocal');
    await this.webrtcManager?.userJoined(data);
  }

  async handleMemberLeft(data) {
    console.log('[EventReceiver] Member left comms:', data);
    SoundPlayer.getInstance().playSound('comms_leave_vocal');
    await this.webrtcManager?.userLeft(data);
  }

  // Cleanup method
  removeEventListeners() {
    eventEmitter.off('speaking', this.handleRemoteSpeaking.bind(this));
    eventEmitter.off('not_speaking', this.handleRemoteNotSpeaking.bind(this));
    eventEmitter.off('remote_user_started_speaking', this.handleRemoteUserStartedSpeaking.bind(this));
    eventEmitter.off('remote_user_stopped_speaking', this.handleRemoteUserStoppedSpeaking.bind(this));
    eventEmitter.off('screen_share_started', this.handleScreenShareStarted.bind(this));
    eventEmitter.off('screen_share_stopped', this.handleScreenShareStopped.bind(this));
    eventEmitter.off('member_joined_comms', this.handleMemberJoined.bind(this));
    eventEmitter.off('member_left_comms', this.handleMemberLeft.bind(this));
  }

  destroy() {
    this.removeEventListeners();
    this.webrtcManager = null; // Clear reference to the WebRTC manager
    this.initialized = false; // Mark as destroyed
  }
}

export default WebRTCEventReceiver;