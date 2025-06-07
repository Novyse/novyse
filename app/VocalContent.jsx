import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import { Platform } from "react-native";
import SmartBackground from "./components/SmartBackground";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";

import methods from "./utils/webrtc/methods";
const { get, check, set } = methods;

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const audioContext = useAudio();
  const styles = createStyle(theme);

  const [profilesInCommsChat, setProfilesInCommsChat] = useState([]);
  const [activeStreams, setActiveStreams] = useState({}); // { participantId: { stream, userData, streamType } }
  const [videoStreamKeys, setVideoStreamKeys] = useState({}); // For forcing RTCView re-render
  useEffect(() => {
    // Set audio context reference in WebRTC manager when component mounts
    set.audioContext(audioContext);
  }, [audioContext]);  // Helper function to get existing stream for a screen share
  const getExistingScreenShareStream = (streamId, participantId = null) => {
    try {
      // Try to get the stream from WebRTC
      const webrtcManager = require('./utils/webrtc/index.js').default;
      
      // First try local screen streams
      let stream = webrtcManager.getScreenStream(streamId);
      
      // If not found in local streams and we have participantId, try remote screen streams
      if (!stream && participantId) {
        const remoteScreenStreams = webrtcManager.getRemoteScreenStreams();
        if (remoteScreenStreams[participantId] && remoteScreenStreams[participantId][streamId]) {
          stream = remoteScreenStreams[participantId][streamId];
          console.log(`[VocalContent] Found remote screen stream for ${participantId}/${streamId}`);
        }
      }
      
      if (stream) {
        console.log(`[VocalContent] Found existing stream for ${streamId}:`, {
          id: stream.id,
          tracks: stream.getTracks().length,
          hasVideo: stream.getVideoTracks().length > 0,
          hasAudio: stream.getAudioTracks().length > 0,
          participantId
        });
      } else {
        console.log(`[VocalContent] No existing stream found for ${streamId} (participant: ${participantId})`);
        
        // Debug: Check what's actually in the screenStreams
        const allScreenStreams = webrtcManager.getScreenShareStreams();
        const remoteScreenStreams = webrtcManager.getRemoteScreenStreams();
        console.log(`[VocalContent] All available local screen streams:`, Object.keys(allScreenStreams));
        console.log(`[VocalContent] All available remote screen streams:`, remoteScreenStreams);
      }
      return stream;
    } catch (error) {
      console.log(`[VocalContent] Error getting existing stream for ${streamId}:`, error.message);
      return null;
    }
  };


  useEffect(() => {
    // Registra i listeners
    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);
    eventEmitter.on("stream_added_or_updated", handleStreamUpdate);

    eventEmitter.on("user_started_speaking", handleUserStartedSpeaking);
    eventEmitter.on("user_stopped_speaking", handleUserStoppedSpeaking);
    eventEmitter.on(
      "remote_user_started_speaking",
      handleRemoteUserStartedSpeaking
    );
    eventEmitter.on(
      "remote_user_stopped_speaking",
      handleRemoteUserStoppedSpeaking
    );

    // Screen sharing events
    eventEmitter.on("screen_share_started", handleScreenShareStarted);
    eventEmitter.on("screen_share_stopped", handleScreenShareStopped);

    // Listen for mobile camera switch events specifically for Android compatibility
    eventEmitter.on("mobile_camera_switched", handleStreamUpdate);

    const getMembers = async () => {
      const members = await get.commsMembers(chatId);
      console.log("[VocalContent] All profiles for debugging:", members);
      setProfilesInCommsChat(members);      // Process any existing screen shares from the profiles
      members.forEach((profile) => {
        if (
          profile.active_screen_share &&
          Array.isArray(profile.active_screen_share)
        ) {          profile.active_screen_share.forEach((streamId) => {
            console.log(
              `[VocalContent] Creating screen share rectangle from existing profile for ${profile.from}, streamId: ${streamId}`
            );            // Try to get existing stream for this screen share
            const existingStream = getExistingScreenShareStream(streamId, profile.from);
            
            console.log(`[VocalContent] Screen share processing for ${profile.from}:`, {
              streamId,
              hasExistingStream: !!existingStream,
              isLocalUser: profile.from === get.myPartecipantId(),
              streamTracks: existingStream ? existingStream.getTracks().length : 0
            });
            
            // If we have an existing stream but it's not in the profiles being displayed,
            // it means we need to restore it to the WebRTC manager's screenStreams
            if (existingStream && profile.from === get.myPartecipantId()) {
              console.log(`[VocalContent] Restoring local screen share to WebRTC manager: ${streamId}`);
              const webrtcManager = require('./utils/webrtc/index.js').default;
              // Ensure the stream is also in the WebRTC manager's screenStreams
              webrtcManager.globalState.setScreenStream(streamId, existingStream);
            }
            
            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamId]: {
                stream: existingStream, // Use existing stream if available
                userData: profile,
                streamType: "screenshare",
                streamId,
                hasAudio: existingStream?.getAudioTracks().length > 0 || false,
                hasVideo: existingStream?.getVideoTracks().length > 0 || false,
                isPlaceholder: !existingStream, // Only placeholder if no existing stream
              },
            }));
          });
        }
      });
    };

    getMembers();

    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);

      eventEmitter.off("stream_added_or_updated", handleStreamUpdate);

      eventEmitter.off("user_started_speaking", handleUserStartedSpeaking);
      eventEmitter.off("user_stopped_speaking", handleUserStoppedSpeaking);

      eventEmitter.off(
        "remote_user_started_speaking",
        handleRemoteUserStartedSpeaking
      );
      eventEmitter.off(
        "remote_user_stopped_speaking",
        handleRemoteUserStoppedSpeaking
      );

      // Screen sharing events cleanup
      eventEmitter.off("screen_share_started", handleScreenShareStarted);
      eventEmitter.off("screen_share_stopped", handleScreenShareStopped);

      eventEmitter.off("mobile_camera_switched", handleStreamUpdate);
    };
  }, [chatId]);  // Gestione globale degli stream
  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.log("[VocalContent] User not in comms, ignoring stream update");
      return;
    }

    const { participantId, stream, streamType, userData, timestamp, streamId } =
      data;

    console.log(`[VocalContent] Stream update for ${participantId}:`, {
      streamType,
      hasAudio: stream?.getAudioTracks().length > 0,
      hasVideo: stream?.getVideoTracks().length > 0,
      streamId
    });

    // Handle screen sharing streams differently
    if (streamType === "screenshare" && streamId) {
      console.log(`[VocalContent] Processing screen share stream: ${streamId}`);

      setActiveStreams((prev) => ({
        ...prev,
        [streamId]: {
          stream,
          userData,
          streamType: "screenshare",
          streamId,
          hasAudio: stream?.getAudioTracks().length > 0,
          hasVideo: stream?.getVideoTracks().length > 0,
          timestamp: Date.now()
        },
      }));

      // For Android: Update video stream keys for screen shares
      if (Platform.OS === "android" && stream?.getVideoTracks().length > 0) {
        setVideoStreamKeys((prev) => ({
          ...prev,
          [streamId]: Date.now(),
        }));
      }
    } else {
      // Handle regular webcam streams
      console.log(`[VocalContent] Processing webcam stream for ${participantId}`);
      
      setActiveStreams((prev) => ({
        ...prev,
        [participantId]: {
          stream,
          userData,
          streamType,
          hasAudio: stream?.getAudioTracks().length > 0,
          hasVideo: stream?.getVideoTracks().length > 0,
          timestamp: Date.now()
        },
      }));

      // For Android: Update video stream keys for webcam streams
      if (Platform.OS === "android" && stream?.getVideoTracks().length > 0) {
        setVideoStreamKeys((prev) => ({
          ...prev,
          [participantId]: timestamp || Date.now(),
        }));
      }
    }
  };

  // Speech detection handlers
  const handleUserStartedSpeaking = () => {
    if (check.isInComms() && chatId === get.commsId()) {
      // Aggiorna lo stato is_speaking per l'utente corrente in profilesInCommsChat
      setProfilesInCommsChat((prev) =>
        prev.map((profile) =>
          profile.from === get.myPartecipantId()
            ? { ...profile, is_speaking: true }
            : profile
        )
      );
    }
  };

  const handleUserStoppedSpeaking = () => {
    if (check.isInComms() && chatId === get.commsId()) {
      // Aggiorna lo stato is_speaking per l'utente corrente in profilesInCommsChat
      setProfilesInCommsChat((prev) =>
        prev.map((profile) =>
          profile.from === get.myPartecipantId()
            ? { ...profile, is_speaking: false }
            : profile
        )
      );
    }
  };
  const handleRemoteUserStartedSpeaking = (data) => {
    // Only process if user is in comms and event is for the correct chat
    if (!check.isInComms()) {
      console.log(
        "[VocalContent] User not in comms, ignoring remote speaking event"
      );
      return;
    }

    // Solo se il remote user è nella chat in cui sono e non è l'utente locale
    if (
      data.chatId === chatId &&
      data.chatId === get.commsId() &&
      data.id !== get.myPartecipantId()
    ) {
      // Aggiorna lo stato is_speaking per l'utente remoto in profilesInCommsChat
      setProfilesInCommsChat((prev) =>
        prev.map((profile) =>
          profile.from === data.id ? { ...profile, is_speaking: true } : profile
        )
      );
    }
  };
  const handleRemoteUserStoppedSpeaking = (data) => {
    // Only process if user is in comms and event is for the correct chat
    if (!check.isInComms()) {
      console.log(
        "[VocalContent] User not in comms, ignoring remote speaking event"
      );
      return;
    }

    // Solo se il remote user è nella chat in cui sono e non è l'utente locale
    if (
      data.chatId === chatId &&
      data.chatId === get.commsId() &&
      data.id !== get.myPartecipantId()
    ) {
      // Aggiorna lo stato is_speaking per l'utente remoto in profilesInCommsChat
      setProfilesInCommsChat((prev) =>
        prev.map((profile) =>
          profile.from === data.id
            ? { ...profile, is_speaking: false }
            : profile
        )
      );
    }
  };  // Screen sharing handlers
  const handleScreenShareStarted = (data) => {
    if (!check.isInComms() && data.chatId !== chatId ) {
      console.log(
        "[VocalContent] User not in comms or in the wrong comms view, ignoring screen share start"
      );
      return;
    }

    console.log("[VocalContent] Screen share started:", data);

    const { from, streamId } = data;

    // Skip if it's from the current user (they already have their own screen share)
    if (from === get.myPartecipantId()) {
      console.log("[VocalContent] Ignoring own screen share started event");
      return;
    }

    // Find the user profile for this screen share using functional update
    console.log("[VocalContent] Finding user profile for screen share");

    setProfilesInCommsChat((currentProfiles) => {
      console.log(
        "[VocalContent] Current profilesInCommsChat for debugging:",
        currentProfiles
      );

      let userProfile = currentProfiles.find(
        (profile) => profile.from === from
      );

      // If profile not found, create a minimal one
      if (!userProfile) {
        console.log(
          `[VocalContent] User profile not found for ${from}, creating minimal profile`
        );
        userProfile = {
          from: from,
          handle: "Unknown User",
          is_speaking: false,
        };
      }

      console.log(
        `[VocalContent] Creating screen share rectangle for user ${from}, streamId: ${streamId}`
      );

      // Check if we already have a stream for this streamId
      const existingStream = getExistingScreenShareStream(streamId, from);
      let hasExistingActiveStream = false;
      
      setActiveStreams((prevStreams) => {
        // Check if this streamId already exists in activeStreams
        hasExistingActiveStream = !!prevStreams[streamId];
        
        if (hasExistingActiveStream) {
          console.log(`[VocalContent] Stream ${streamId} already exists in activeStreams, updating userData`);
          // Update existing stream entry with correct userData
          return {
            ...prevStreams,
            [streamId]: {
              ...prevStreams[streamId],
              userData: userProfile,
              timestamp: Date.now()
            }
          };
        } else {
          console.log(`[VocalContent] Creating new activeStreams entry for ${streamId}`);
          // Create new stream entry
          return {
            ...prevStreams,
            [streamId]: {
              stream: existingStream, // Use existing stream if available
              userData: userProfile,
              streamType: "screenshare",
              streamId,
              hasAudio: existingStream?.getAudioTracks().length > 0 || false,
              hasVideo: existingStream?.getVideoTracks().length > 0 || false,
              isPlaceholder: !existingStream, // Only placeholder if no existing stream
              timestamp: Date.now()
            },
          };
        }
      });

      console.log(
        `[VocalContent] ${hasExistingActiveStream ? 'Updated' : 'Created'} screen share rectangle with streamId: ${streamId}`
      );

      // Return the same profiles (no modification needed)
      return currentProfiles;
    });
  };
  const handleScreenShareStopped = (data) => {
    if (!check.isInComms() && data.chatId !== chatId) {
      console.log(
        "[VocalContent] User not in comms or in the wrong comms view, ignoring screen share stop"
      );
      return;
    }

    console.log("[VocalContent] Screen share stopped:", data);

    const { from, streamId } = data;

    // Remove the screen share from active streams (both local and remote)
    setActiveStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[streamId];
      console.log(
        `[VocalContent] Removed screen share ${streamId} from active streams`
      );
      return newStreams;
    });

    // Also update profilesInCommsChat to remove from active_screen_share array
    setProfilesInCommsChat((prev) =>
      prev.map((profile) => {
        if (profile.from === from && 
            Array.isArray(profile.active_screen_share)) {
          const updatedScreenShares = profile.active_screen_share.filter(
            (id) => id !== streamId
          );
          return {
            ...profile,
            active_screen_share: updatedScreenShares
          };
        }
        return profile;
      })
    );

    // Also clean up video stream keys for Android
    if (Platform.OS === "android") {
      setVideoStreamKeys((prev) => {
        const newKeys = { ...prev };
        delete newKeys[streamId];
        return newKeys;
      });
    }
  };
  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    console.log("[VocalContent] handleMemberJoined called with:", data);
    console.log("[VocalContent] Current chatId:", chatId);
    console.log(
      "[VocalContent] Current profiles count:",
      profilesInCommsChat.length
    );

    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      console.log("[VocalContent] Adding member to profiles");
      setProfilesInCommsChat((prev) => {
        console.log("[VocalContent] Previous profiles:", prev);
        const newProfiles = [...prev, data];
        console.log("[VocalContent] New profiles:", newProfiles);

        // Create screen share rectangles for any active screen shares in the new profile
        if (
          data.active_screen_share &&
          Array.isArray(data.active_screen_share)
        ) {          data.active_screen_share.forEach((streamId) => {
            console.log(
              `[VocalContent] Creating screen share rectangle for ${data.from}, streamId: ${streamId}`
            );
            
            // Try to get existing stream for this screen share
            const existingStream = getExistingScreenShareStream(streamId);
            
            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamId]: {
                stream: existingStream, // Use existing stream if available
                userData: data,
                streamType: "screenshare",
                streamId,
                hasAudio: existingStream?.getAudioTracks().length > 0 || false,
                hasVideo: existingStream?.getVideoTracks().length > 0 || false,
                isPlaceholder: !existingStream, // Only placeholder if no existing stream
              },
            }));
          });
        }

        return newProfiles;
      });
    } else {
      console.log("[VocalContent] Member joined different chat, ignoring");
    }
  };

  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {
    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      // Rimuovo il profilo
      setProfilesInCommsChat((prevProfiles) =>
        prevProfiles.filter((profile) => profile.from !== data.from)
      );

      // Rimuovo anche lo stream associato e tutti i screen share streams dell'utente
      setActiveStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[data.from];

        // Also remove any screen share streams from this user
        // Screen shares are stored with streamId as key, but we need to check userData.from
        Object.keys(newStreams).forEach((key) => {
          const streamData = newStreams[key];
          if (
            streamData.streamType === "screenshare" &&
            streamData.userData?.from === data.from
          ) {
            delete newStreams[key];
            console.log(
              `[VocalContent] Removed screen share ${key} for departing user ${data.from}`
            );
          }
        });

        return newStreams;
      });

      // Also clean up video stream keys for Android
      if (Platform.OS === "android") {
        setVideoStreamKeys((prev) => {
          const newKeys = { ...prev };
          delete newKeys[data.from];

          // Also remove screen share video keys
          Object.keys(newKeys).forEach((key) => {
            const streamData = activeStreams[key];
            if (
              streamData?.streamType === "screenshare" &&
              streamData?.userData?.from === data.from
            ) {
              delete newKeys[key];
            }
          });

          return newKeys;
        });
      }

      // Cleanup elementi DOM per Web
      if (Platform.OS === "web") {
        const container = document.getElementById(
          `media-container-${data.from}`
        );
        if (container) {
          container.remove();
        }

        // Also cleanup any screen share containers for this user
        Object.keys(activeStreams).forEach((key) => {
          const streamData = activeStreams[key];
          if (
            streamData?.streamType === "screenshare" &&
            streamData?.userData?.from === data.from
          ) {
            const screenShareContainer = document.getElementById(
              `media-container-${key}`
            );
            if (screenShareContainer) {
              screenShareContainer.remove();
            }
          }
        });
      }
    }  };

  return (
    <SmartBackground backgroundKey="backgroundChatGradient" style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInCommsChat}
        activeStreams={activeStreams}
        videoStreamKeys={videoStreamKeys}
      />
      <VocalContentBottomBar chatId={chatId} />
    </SmartBackground>
  );
};

export default VocalContent;

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
      padding: 15,
      gap: 15,
    },
  });
