import APIMethods from "../APImethods";
import multiPeerWebRTCManager from "../webrtcMethods";
import eventEmitter from "../EventEmitter";
import localDatabase from "../localDatabaseMethods";
import SoundPlayer from "../sounds/SoundPlayer";
import VAD from "./VAD/utils.js";
import { Platform } from "react-native";

const WebRTC = multiPeerWebRTCManager;

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
  async join(chatId){

    // Start local stream
    const stream = await WebRTC.startLocalStream(); // audio only for now
    if (!stream) {
      throw new Error("Failed to get audio stream");
    }

    await VAD.initializeVoiceActivityDetection(stream);

    // Check if already in a vocal chat
    if(WebRTC.chatId != chatId) {
      await APIMethods.commsLeave(chatId);
    }
      // Join vocal chat
    const data = await APIMethods.commsJoin(chatId);
    if (!data.comms_joined) {
      throw new Error("Failed to join vocal chat");
    };
    
    // Rigenero
    await WebRTC.regenerate(
      data.from,
      chatId,
      null,
      null,
      null
    );    
    // Aggiungi il chat_id ai dati prima di emettere l'evento
    // e includi anche i dati dell'utente locale
    const localUserHandle = await localDatabase.fetchLocalUserHandle();
    const localUserData = await localDatabase.fetchLocalUserData();
    
    const dataWithChatId = {  
      ...data, 
      chat_id: chatId,
      handle: localUserHandle,
      profileImage: localUserData?.profileImage || null,
      profileImageUri: localUserData?.profileImage || null
    };
    await handle.memberJoined(dataWithChatId);

    const existingUsers = await APIMethods.retrieveVocalUsers(chatId);
    WebRTC.setExistingUsers(existingUsers);

  },

  // quando io esco in una room
  async left(){

    const data = await APIMethods.commsLeave();

    //  if (!data.comms_left || false /* Force leave for now */) {
    //    throw new Error("Failed to leave comms");
    //  }

    await handle.memberLeft(data);

    // Close all peer connections and local stream
    WebRTC.closeAllConnections();
    WebRTC.closeLocalStream();

    // Stop voice activity detection when leaving vocal chat
    VAD.stopVoiceActivityDetection();
  },

  // quando premo pulsante microfono
  async toggleAudio() {
    if (WebRTC.localStream) {
      const audioTrack = WebRTC.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  },

  // Switch microphone device
  async switchMicrophone(deviceId) {
    try {
      if (!WebRTC.localStream) {
        console.warn('No local stream available for microphone switching');
        return false;
      }

      // Store current audio enabled state
      const currentAudioTrack = WebRTC.localStream.getAudioTracks()[0];
      const wasAudioEnabled = currentAudioTrack ? currentAudioTrack.enabled : true;

      // Create new audio stream with selected device
      const newConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };

      const newAudioStream = await mediaDevices.getUserMedia(newConstraints);
      const newAudioTrack = newAudioStream.getAudioTracks()[0];

      if (!newAudioTrack) {
        throw new Error('Failed to get audio track from new device');
      }

      // Set the same enabled state as the previous track
      newAudioTrack.enabled = wasAudioEnabled;

      // Replace the audio track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.peerConnections)) {
        const senders = pc.getSenders();
        const audioSender = senders.find(sender => 
          sender.track && sender.track.kind === 'audio'
        );

        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
          console.log(`Replaced audio track for peer ${peerId}`);
        }
      }

      // Replace the track in the local stream
      if (currentAudioTrack) {
        WebRTC.localStream.removeTrack(currentAudioTrack);
        currentAudioTrack.stop();
      }
      
      WebRTC.localStream.addTrack(newAudioTrack);

      // Reinitialize VAD with new stream
      VAD.stopVoiceActivityDetection();
      await VAD.initializeVoiceActivityDetection(WebRTC.localStream);

      console.log(`Successfully switched to microphone device: ${deviceId || 'default'}`);
      return true;   
     } catch (error) {
      console.error('Error switching microphone:', error);
      throw error;
    }
  },

  // Switch camera device
  async switchCamera(deviceId) {
    try {
      if (!WebRTC.localStream) {
        console.warn('No local stream available for camera switching');
        return false;
      }

      // Check if video is currently enabled
      const currentVideoTrack = WebRTC.localStream.getVideoTracks()[0];
      if (!currentVideoTrack) {
        console.warn('No video track available for camera switching');
        return false;
      }

      const wasVideoEnabled = currentVideoTrack.enabled;

      // Create new video stream with selected device
      const newConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 },
          facingMode: deviceId ? undefined : 'user'
        }
      };

      const newVideoStream = await mediaDevices.getUserMedia(newConstraints);
      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        throw new Error('Failed to get video track from new device');
      }

      // Set the same enabled state as the previous track
      newVideoTrack.enabled = wasVideoEnabled;

      // Replace the video track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.peerConnections)) {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log(`Replaced video track for peer ${peerId}`);
        }
      }

      // Replace the track in the local stream
      if (currentVideoTrack) {
        WebRTC.localStream.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }
      
      WebRTC.localStream.addTrack(newVideoTrack);      // Notify UI of the stream update
      WebRTC.notifyStreamUpdate();

      // Also emit event for local stream update so VocalContent updates local video preview
      if (WebRTC.onLocalStreamReady) {
        WebRTC.onLocalStreamReady(WebRTC.localStream);
      }

      // Emit stream_added_or_updated event for local user
      eventEmitter.emit('stream_added_or_updated', {
        participantId: WebRTC.myId,
        stream: WebRTC.localStream,
        streamType: 'webcam',
        userData: { handle: 'You' } // Local user identifier
      });

      console.log(`Successfully switched to camera device: ${deviceId || 'default'}`);
      return true;

    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  },  
  
  // Switch mobile camera with facingMode (for mobile platforms)
  async switchMobileCamera(constraints, facingMode) {
    try {
      if (!WebRTC.localStream) {
        console.warn('No local stream available for mobile camera switching');
        return false;
      }

      // Get current video track
      const currentVideoTrack = WebRTC.localStream.getVideoTracks()[0];
      let wasVideoEnabled = false;
      
      if (currentVideoTrack) {
        wasVideoEnabled = currentVideoTrack.enabled;
      } else {
        console.warn('No current video track available for mobile camera switching');
        return false;
      }

      // Try different constraint approaches for better mobile compatibility
      let newVideoStream;
        try {
        // First try with exact facingMode
        newVideoStream = await mediaDevices.getUserMedia(constraints);
      } catch (exactError) {
        console.warn('Exact facingMode failed, trying ideal:', exactError.message);
        
        try {
          // Fallback to ideal facingMode
          const fallbackConstraints = {
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: 16/9 }
            }
          };
          newVideoStream = await mediaDevices.getUserMedia(fallbackConstraints);
        } catch (idealError) {
          console.warn('Ideal facingMode failed, trying basic:', idealError.message);
          
          // Last resort: basic constraints
          const basicConstraints = {
            video: {
              facingMode: facingMode,
              width: 1280,
              height: 720
            }
          };
          newVideoStream = await mediaDevices.getUserMedia(basicConstraints);
        }
      }

      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        throw new Error('Failed to get video track from new mobile camera');
      }

      // Set the same enabled state as the previous track
      newVideoTrack.enabled = wasVideoEnabled;

      // Replace the video track in all peer connections
      for (const [peerId, pc] of Object.entries(WebRTC.peerConnections)) {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log(`Replaced mobile video track for peer ${peerId} with facingMode: ${facingMode}`);
        }      }

      // Replace the track in the local stream
      if (currentVideoTrack) {
        WebRTC.localStream.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }
      
      WebRTC.localStream.addTrack(newVideoTrack);

      // Notify UI of the stream update
      WebRTC.notifyStreamUpdate();

      // Force local stream update for mobile platforms with delay
      setTimeout(() => {
        if (WebRTC.onLocalStreamReady) {
          WebRTC.onLocalStreamReady(WebRTC.localStream);
        }
        
        // Emit a more specific event for mobile camera switching
        eventEmitter.emit('mobile_camera_switched', {
          participantId: WebRTC.myId,
          stream: WebRTC.localStream,
          streamType: 'webcam',
          facingMode: facingMode,
          timestamp: Date.now(), // Add timestamp to force re-render
          userData: { handle: 'You' }
        });
        
        // Also emit the standard stream update event
        eventEmitter.emit('stream_added_or_updated', {
          participantId: WebRTC.myId,
          stream: WebRTC.localStream,
          streamType: 'webcam',
          timestamp: Date.now(), // Add timestamp to force re-render
          userData: { handle: 'You' }
        });
      }, 200); // Increased delay for Android compatibility

      console.log(`Successfully switched to mobile camera with facingMode: ${facingMode}`);
      return true;

    } catch (error) {
      console.error('Error switching mobile camera:', error);
      throw error;
    }
  },

  // quando premo pulsante video

  async toggleVideo() {
    try {
      if (!WebRTC.isVideoEnabled) {
        // Attiva video
        const videoTrack = await WebRTC.addVideoTrack();
        if (videoTrack) {
          WebRTC.isVideoEnabled = true;
          return true;
        }
      } else {
        // Disattiva video
        await WebRTC.removeVideoTracks();
        WebRTC.isVideoEnabled = false;
        return false;
      }
    } catch (err) {
      console.error('Errore nel toggle video:', err);
      throw new Error("Errore nel toggle video: " + err.message);
    }
  },

  // quando premo pulsante screen share

  async addScreenShare() {
    // da sistemare con chiamata API e manda tramite emitter
    try {
      const result = WebRTC.addScreenShareStream();
      if (result) {
        console.log(`[ScreenShare] Screen share started with ID: ${result.streamId}`);
        return result;
      } else {
        console.warn('[ScreenShare] Failed to start screen share');
        throw new Error('Failed to start screen share');
      }
    } catch (error) {
      console.error('[ScreenShare] Error starting screen share:', error);
      throw new Error("Error starting screen share: " + error.message);
    }
  },

}

const handle = {  // quando un nuovo membro entra in una room
  async memberJoined(data){

    // Solo se il membro che entra è nella stessa chat vocale
    if (WebRTC.chatId == data.chat_id) {
      SoundPlayer.getInstance().playSound('comms_join_vocal');
    }

    eventEmitter.emit("member_joined_comms", data);

    await multiPeerWebRTCManager.userJoined(data);

  },
  // quando un membro esce da una room
  async memberLeft(data){

    // Solo se il membro che esce è nella stessa chat vocale
    if (WebRTC.chatId == data.chat_id) {
      SoundPlayer.getInstance().playSound('comms_leave_vocal');
    }

    eventEmitter.emit("member_left_comms", data);

    await multiPeerWebRTCManager.userLeft(data);
  },

  async screenShareStarted(data) {
    // Solo se il membro che ha iniziato lo screen share è nella stessa chat vocale
    if (WebRTC.chatId == data.chat_id) {
      SoundPlayer.getInstance().playSound('comms_stream_started');
    }

    eventEmitter.emit("screen_share_started", data);
  },

  async screenShareStopped(data) {
    // Solo se il membro che ha fermato lo screen share è nella stessa chat vocale
    if (WebRTC.chatId == data.chat_id) {
      SoundPlayer.getInstance().playSound('comms_stream_stopped');
    }

    eventEmitter.emit("screen_share_stopped", data);
  }
}

const check = {
  isInComms: () => {
    return WebRTC.chatId != null && WebRTC.chatId !== '';
  },
}

const get = {

  commsId: () => {
    return WebRTC.chatId;
  },
  myPartecipantId: () => {
    return WebRTC.myId;
  },
  commsMembers: async (chatId) => { 

    let usersList = [];

    if (chatId != WebRTC.chatId) {
      usersList = await APIMethods.retrieveVocalUsers(chatId);

    } else {
      // Fetch WebRTC users data
      usersList = Object.values(WebRTC.userData);

      // Fetch local user handle and data
      const localUserHandle = await localDatabase.fetchLocalUserHandle();
      const localUserData = await localDatabase.fetchLocalUserData();

      usersList.push({
        handle: localUserHandle,
        from: WebRTC.myId,
        profileImage: localUserData?.profileImage || null,
      });
    }

    return usersList;

  }
}

export default { self, check, get };

