import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import { Platform } from "react-native";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";

import utils from "./utils/webrtc/utils";
const { get, check, set } = utils;

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
  }, [audioContext]); 

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
      setProfilesInCommsChat(members);

      // Process any existing screen shares from the profiles
      members.forEach((profile) => {
        if (
          profile.active_screen_share &&
          Array.isArray(profile.active_screen_share)
        ) {
          profile.active_screen_share.forEach((streamId) => {
            console.log(
              `[VocalContent] Creating screen share rectangle from existing profile for ${profile.from}, streamId: ${streamId}`
            );
            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamId]: {
                stream: null, // Will be filled when WebRTC stream arrives
                userData: profile,
                streamType: "screenshare",
                streamId,
                hasAudio: false,
                hasVideo: false,
                isPlaceholder: true, // Mark this as a placeholder until real stream arrives
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
  }, [chatId]);

  // Gestione globale degli stream
  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.log("[VocalContent] User not in comms or in the wrong comms view, ignoring stream update");
      return;
    }

    const { participantId, stream, streamType, userData, timestamp, streamId } =
      data;

    console.log(`[VocalContent] Stream update for ${participantId}:`, {
      streamType,
      hasAudio: stream?.getAudioTracks().length > 0,
      hasVideo: stream?.getVideoTracks().length > 0,
      userData,
      timestamp,
      streamId,
    });

    // Handle screen sharing streams differently
    if (streamType === "screenshare" && streamId) {
      console.log(`[VocalContent] Adding screen share stream: ${streamId}`);

      setActiveStreams((prev) => {
        // Check if we already have a placeholder for this screen share
        const existingEntry = prev[streamId];

        return {
          ...prev,
          [streamId]: {
            stream,
            userData: existingEntry?.userData || userData,
            streamType: "screenshare",
            hasAudio: stream?.getAudioTracks().length > 0,
            hasVideo: stream?.getVideoTracks().length > 0,
            isPlaceholder: false, // No longer a placeholder, we have the real stream
          },
        };
      });

      // For Android: Update video stream keys to force RTCView re-render when stream changes
      if (Platform.OS === "android" && stream?.getVideoTracks().length > 0) {
        setVideoStreamKeys((prev) => ({
          ...prev,
          [streamId]: timestamp || Date.now(),
        }));
      }
    } else {
      // Handle regular webcam streams
      setActiveStreams((prev) => ({
        ...prev,
        [participantId]: {
          stream,
          userData,
          streamType,
          hasAudio: stream?.getAudioTracks().length > 0,
          hasVideo: stream?.getVideoTracks().length > 0,
        },
      }));

      // For Android: Update video stream keys to force RTCView re-render when stream changes
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
  };
  // Screen sharing handlers
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
    } // Find the user profile for this screen share using functional update
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

      // Create the screen share rectangle immediately using streamId as the key
      setActiveStreams((prev) => ({
        ...prev,
        [streamId]: {
          stream: null, // Will be filled when WebRTC stream arrives
          userData: userProfile,
          streamType: "screenshare",
          streamId,
          hasAudio: false,
          hasVideo: false,
          isPlaceholder: true, // Mark this as a placeholder until real stream arrives
        },
      }));

      console.log(
        `[VocalContent] Created screen share rectangle with streamId: ${streamId}`
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

    // Skip if it's from the current user
    if (from === get.myPartecipantId()) {
      console.log("[VocalContent] Ignoring own screen share stopped event");
      return;
    }

    setActiveStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[streamId];
      console.log(
        `[VocalContent] Removed screen share ${streamId} from active streams`
      );
      return newStreams;
    });

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
        ) {
          data.active_screen_share.forEach((streamId) => {
            console.log(
              `[VocalContent] Creating screen share rectangle for ${data.from}, streamId: ${streamId}`
            );
            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamId]: {
                stream: null, // Will be filled when WebRTC stream arrives
                userData: data,
                streamType: "screenshare",
                streamId,
                hasAudio: false,
                hasVideo: false,
                isPlaceholder: true, // Mark this as a placeholder until real stream arrives
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
    }
  };

  return (
    <View style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInCommsChat}
        activeStreams={activeStreams}
        videoStreamKeys={videoStreamKeys}
      />
      <VocalContentBottomBar chatId={chatId} />
    </View>
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
