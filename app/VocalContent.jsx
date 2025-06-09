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
  const [persistentScreenShares, setPersistentScreenShares] = useState({}); // Persist across navigation
  useEffect(() => {
    // Set audio context reference in WebRTC manager when component mounts
    console.log("[VocalContent] Setting audio context:", {
      audioContext: audioContext,
      hasAudioContext: !!audioContext,
      audioContextType: typeof audioContext,
      addAudioExists:
        audioContext && typeof audioContext.addAudio === "function",
      removeAudioExists:
        audioContext && typeof audioContext.removeAudio === "function",
    });

    if (audioContext) {
      console.log(
        "[VocalContent] Calling set.audioContext with valid audioContext"
      );
      set.audioContext(audioContext);
    } else {
      console.warn(
        "[VocalContent] audioContext is null/undefined, not setting in WebRTC"
      );
    }
  }, [audioContext]);

  // Helper function to normalize screen share UUID (extract streamId from participantId_streamId)
  const normalizeScreenShareUUID = (screenShareUUID) => {
    if (!screenShareUUID || typeof screenShareUUID !== "string") return null;

    // If it contains underscore, it's in participantId_streamId format
    if (screenShareUUID.includes("_")) {
      const parts = screenShareUUID.split("_");
      if (parts.length >= 2) {
        // Return the streamId part (everything after first underscore)
        return parts.slice(1).join("_");
      }
    }
    return screenShareUUID;
  };

  // Enhanced function to get existing stream for a screen share with better state management
  const getExistingScreenShareStream = (
    screenShareUUID,
    participantId = null
  ) => {
    try {
      console.log(
        `[VocalContent] Looking for existing stream: ${screenShareUUID}, participant: ${participantId}`
      );

      // Try to get the stream from WebRTC
      const webrtcManager = require("./utils/webrtc/index.js").default;

      // First normalize the UUID to get the actual streamId
      const streamId = normalizeScreenShareUUID(screenShareUUID);
      const fullUUID = screenShareUUID; // Keep the full UUID for local streams

      console.log(
        `[VocalContent] Normalized UUID: ${screenShareUUID} -> streamId: ${streamId}, fullUUID: ${fullUUID}`
      );

      // Try multiple approaches to find the stream
      let stream = null;

      // 1. Try local screen streams with full UUID
      stream = webrtcManager.getScreenStream(fullUUID);
      if (stream) {
        console.log(
          `[VocalContent] Found local screen stream with full UUID: ${fullUUID}`
        );
      }

      // 2. Try local screen streams with streamId only
      if (!stream && streamId) {
        stream = webrtcManager.getScreenStream(streamId);
        if (stream) {
          console.log(
            `[VocalContent] Found local screen stream with streamId: ${streamId}`
          );
        }
      }

      // 3. Try remote screen streams if we have participantId
      if (!stream && participantId && streamId) {
        const remoteScreenStreams = webrtcManager.getRemoteScreenStreams();
        if (
          remoteScreenStreams[participantId] &&
          remoteScreenStreams[participantId][streamId]
        ) {
          stream = remoteScreenStreams[participantId][streamId];
          console.log(
            `[VocalContent] Found remote screen stream for ${participantId}/${streamId}`
          );
        }
      }

      // 4. Check persistent state for any cached stream info
      if (!stream && persistentScreenShares[fullUUID]) {
        console.log(
          `[VocalContent] Found persistent screen share data for ${fullUUID}`
        );
        // Return the stream if it's still valid
        const persistentData = persistentScreenShares[fullUUID];
        if (
          persistentData.stream &&
          persistentData.stream.getTracks().length > 0
        ) {
          stream = persistentData.stream;
          console.log(`[VocalContent] Using persistent stream for ${fullUUID}`);
        }
      }

      if (stream) {
        console.log(
          `[VocalContent] Found existing stream for ${screenShareUUID}:`,
          {
            id: stream.id,
            tracks: stream.getTracks().length,
            hasVideo: stream.getVideoTracks().length > 0,
            hasAudio: stream.getAudioTracks().length > 0,
            participantId,
          }
        );

        // Cache the stream in persistent state for future navigation
        setPersistentScreenShares((prev) => ({
          ...prev,
          [fullUUID]: {
            stream,
            participantId,
            timestamp: Date.now(),
            streamId,
          },
        }));
      } else {
        console.log(
          `[VocalContent] No existing stream found for ${screenShareUUID} (participant: ${participantId})`
        );

        // Debug: Check what's actually available
        const allScreenStreams = webrtcManager.getScreenShareStreams();
        const remoteScreenStreams = webrtcManager.getRemoteScreenStreams();
        console.log(`[VocalContent] Debug - Available streams:`, {
          localScreenStreams: Object.keys(allScreenStreams),
          remoteScreenStreams: Object.keys(remoteScreenStreams),
          persistentScreenShares: Object.keys(persistentScreenShares),
          searchedFullUUID: fullUUID,
          searchedStreamId: streamId,
          searchedParticipant: participantId,
        });
      }
      return stream;
    } catch (error) {
      console.log(
        `[VocalContent] Error getting existing stream for ${screenShareUUID}:`,
        error.message
      );
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

    // Set up periodic check for placeholder screen shares
    const placeholderCheckInterval = setInterval(() => {
      setActiveStreams((prevStreams) => {
        let hasUpdates = false;
        const updatedStreams = { ...prevStreams };

        Object.entries(prevStreams).forEach(([streamKey, streamData]) => {
          // Check if this is a placeholder screen share
          if (
            streamData.streamType === "screenshare" &&
            streamData.isPlaceholder &&
            !streamData.stream &&
            streamData.participantId
          ) {
            // Try to get the stream again
            const webrtcManager = require("./utils/webrtc/index.js").default;
            const remoteScreenStreams = webrtcManager.getRemoteScreenStreams();

            // Safe access to nested remoteScreenStreams object
            const participantStreams =
              remoteScreenStreams[streamData.participantId];
            if (participantStreams) {
              const foundStream =
                participantStreams[streamData.streamUUID] ||
                participantStreams[streamKey];

              if (foundStream && foundStream.getTracks().length > 0) {
                console.log(
                  `[VocalContent] Found stream for placeholder ${streamKey}:`,
                  {
                    tracks: foundStream.getTracks().length,
                    streamId: foundStream.id,
                  }
                );

                updatedStreams[streamKey] = {
                  ...streamData,
                  stream: foundStream,
                  hasAudio: foundStream.getAudioTracks().length > 0,
                  hasVideo: foundStream.getVideoTracks().length > 0,
                  isPlaceholder: false,
                  timestamp: Date.now(),
                };

                hasUpdates = true;
              }
            }
          }
        });

        return hasUpdates ? updatedStreams : prevStreams;
      });
    }, 2000); // Check every 2 seconds for missing streams

    const getMembers = async () => {
      const members = await get.commsMembers(chatId);
      console.log("[VocalContent] All profiles for debugging:", members);
      setProfilesInCommsChat(members); // Process any existing screen shares from the profiles
      members.forEach((profile) => {
        if (
          profile.active_screen_share &&
          Array.isArray(profile.active_screen_share)
        ) {
          profile.active_screen_share.forEach((screenShareUUID) => {
            console.log(
              `[VocalContent] Creating screen share rectangle from existing profile for ${profile.from}, screenShareUUID: ${screenShareUUID}`
            ); // Try to get existing stream for this screen share
            if (!screenShareUUID) {
              console.warn(
                `[VocalContent] Invalid screenShareUUID for ${profile.from}, skipping`
              );
              return;
            }
            const streamUUID = screenShareUUID; // Keep the full UUID - DO NOT modify it
            const existingStream = getExistingScreenShareStream(
              streamUUID,
              profile.from
            );

            console.log(
              `[VocalContent] Screen share processing for ${profile.from}:`,
              {
                streamUUID,
                hasExistingStream: !!existingStream,
                isLocalUser: profile.from === get.myPartecipantId(),
                streamTracks: existingStream
                  ? existingStream.getTracks().length
                  : 0,
              }
            );

            // If we have an existing stream but it's not in the profiles being displayed,
            // it means we need to restore it to the WebRTC manager's screenStreams
            if (existingStream && profile.from === get.myPartecipantId()) {
              console.log(
                `[VocalContent] Restoring local screen share to WebRTC manager: ${streamUUID}`
              );
              const webrtcManager = require("./utils/webrtc/index.js").default;
              // Ensure the stream is also in the WebRTC manager's screenStreams
              webrtcManager.globalState.setScreenStream(
                streamUUID,
                existingStream
              );
            }

            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamUUID]: {
                stream: existingStream, // Use existing stream if available
                userData: profile,
                streamType: "screenshare",
                streamUUID,
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
      // Clear the placeholder check interval
      if (placeholderCheckInterval) {
        clearInterval(placeholderCheckInterval);
      }

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
  }, [chatId]); // Gestione globale degli stream
  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.log("[VocalContent] User not in comms, ignoring stream update");
      return;
    }

    let { participantId, stream, streamType, userData, timestamp, streamUUID } =
      data;

    // IMPORTANT: For screen shares, streamUUID should be participantId_streamId format
    // For webcam streams, we use participantId as the key
    let streamKey = streamUUID || participantId; // Use streamUUID if available, otherwise participantId

    console.log(`[VocalContent] Stream update for ${participantId}:`, {
      streamType,
      hasAudio: stream?.getAudioTracks().length > 0,
      hasVideo: stream?.getVideoTracks().length > 0,
      streamUUID,
      streamKey,
      isScreenShare: streamType === "screenshare",
      streamTracksLength: stream?.getTracks()?.length || 0,
      streamId: stream?.id || "NO_STREAM_ID",
    });

    // Enhanced validation for remote screen shares
    if (
      streamType === "screenshare" &&
      participantId !== get.myPartecipantId()
    ) {
      if (!stream) {
        console.warn(
          `[VocalContent] Remote screen share update has no stream for ${participantId}:`,
          data
        );
        return;
      }

      if (stream.getTracks().length === 0) {
        console.warn(
          `[VocalContent] Remote screen share stream has no tracks for ${participantId}:`,
          data
        );
        return;
      }

      console.log(
        `[VocalContent] Processing remote screen share stream for ${participantId}:`,
        {
          streamId: stream.id,
          tracks: stream
            .getTracks()
            .map((t) => ({ kind: t.kind, id: t.id, label: t.label })),
          streamUUID: streamKey,
        }
      );
    }

    // Handle both screen sharing and webcam streams with consistent streamKey
    setActiveStreams((prev) => {
      const newStreams = {
        ...prev,
        [streamKey]: {
          stream,
          userData,
          streamType,
          streamUUID: streamKey, // Always use the streamKey as streamUUID for consistency
          hasAudio: stream?.getAudioTracks().length > 0,
          hasVideo: stream?.getVideoTracks().length > 0,
          timestamp: Date.now(),
          // For remote screen shares, explicitly mark as not placeholder
          isPlaceholder:
            streamType === "screenshare" &&
            participantId !== get.myPartecipantId()
              ? false
              : undefined,
        },
      };

      // Log the stream update for debugging
      console.log(`[VocalContent] Updated activeStreams with ${streamKey}:`, {
        type: streamType,
        hasStream: !!stream,
        tracks: stream?.getTracks()?.length || 0,
        participantId,
        isRemote: participantId !== get.myPartecipantId(),
      });

      return newStreams;
    });

    // For Android: Update video stream keys using the same streamKey
    if (Platform.OS === "android") {
      setVideoStreamKeys((prev) => ({
        ...prev,
        [streamKey]: Date.now(),
      }));
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
  }; // Screen sharing handlers
  const handleScreenShareStarted = (data) => {
    if (!check.isInComms() && data.chatId !== chatId) {
      console.log(
        "[VocalContent] User not in comms or in the wrong comms view, ignoring screen share start"
      );
      return;
    }

    console.log("[VocalContent] Screen share started:", data);
    const { from, screenShareUUID } = data;

    // Keep the full screenShareUUID (PARTICIPANTID_STREAMID) for unique identification
    const streamUUID = screenShareUUID; // Don't split, keep it as-is

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
        `[VocalContent] Creating screen share rectangle for user ${from}, streamUUID: ${streamUUID}`
      ); // Check if we already have a stream for this streamUUID
      const existingStream = getExistingScreenShareStream(streamUUID, from);
      let hasExistingActiveStream = false;

      setActiveStreams((prevStreams) => {
        // Check if this streamUUID already exists in activeStreams
        hasExistingActiveStream = !!prevStreams[streamUUID];

        if (hasExistingActiveStream) {
          console.log(
            `[VocalContent] Stream ${streamUUID} already exists in activeStreams, updating userData and stream if available`
          );
          // Update existing stream entry with correct userData and stream if now available
          const currentEntry = prevStreams[streamUUID];
          return {
            ...prevStreams,
            [streamUUID]: {
              ...currentEntry,
              stream: existingStream || currentEntry.stream, // Update stream if now available
              userData: userProfile,
              hasAudio:
                existingStream?.getAudioTracks().length > 0 ||
                currentEntry.hasAudio ||
                false,
              hasVideo:
                existingStream?.getVideoTracks().length > 0 ||
                currentEntry.hasVideo ||
                false,
              isPlaceholder: !existingStream && !currentEntry.stream, // Only placeholder if no stream available
              timestamp: Date.now(),
            },
          };
        } else {
          console.log(
            `[VocalContent] Creating new activeStreams entry for ${streamUUID}, stream available: ${!!existingStream}`
          );

          // For remote screen shares, create entry even without stream (placeholder)
          // The actual stream will be added later when the media track arrives
          return {
            ...prevStreams,
            [streamUUID]: {
              stream: existingStream || null, // Use existing stream if available, otherwise null (placeholder)
              userData: userProfile,
              streamType: "screenshare",
              streamUUID,
              hasAudio: existingStream?.getAudioTracks().length > 0 || false,
              hasVideo: existingStream?.getVideoTracks().length > 0 || false,
              isPlaceholder: !existingStream, // Mark as placeholder if no stream yet
              timestamp: Date.now(),
              // Add additional metadata for remote screen shares
              participantId: from,
              isRemote: true,
            },
          };
        }
      });

      console.log(
        `[VocalContent] ${
          hasExistingActiveStream ? "Updated" : "Created"
        } screen share rectangle with streamUUID: ${streamUUID}`
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

    const { from, screenShareUUID } = data;

    // Keep the full screenShareUUID (PARTICIPANTID_STREAMID) for unique identification
    const streamUUID = screenShareUUID; // Don't split, keep it as-is

    console.log(
      `[VocalContent] Processing screen share stop for ${from}, streamUUID: ${streamUUID}`
    );

    // Remove the screen share from active streams (both local and remote)
    setActiveStreams((prev) => {
      const newStreams = { ...prev };

      // Log what streams we currently have before removal
      console.log(
        `[VocalContent] Current activeStreams before removal:`,
        Object.keys(newStreams)
      );

      // More robust removal logic - try multiple approaches
      let removed = false;

      // 1. Remove by exact streamUUID match
      if (newStreams[streamUUID]) {
        delete newStreams[streamUUID];
        console.log(
          `[VocalContent] Successfully removed screen share ${streamUUID} from active streams (exact match)`
        );
        removed = true;
      }

      // 2. Remove by alternative streamUUID formats
      if (!removed) {
        const alternativeKeys = Object.keys(newStreams).filter((key) => {
          const streamData = newStreams[key];
          return (
            streamData?.streamType === "screenshare" &&
            (key.includes(screenShareUUID) ||
              screenShareUUID.includes(key) ||
              streamData?.userData?.from === from ||
              streamData?.participantId === from)
          );
        });

        if (alternativeKeys.length > 0) {
          console.log(
            `[VocalContent] Found alternative keys to remove:`,
            alternativeKeys
          );
          alternativeKeys.forEach((key) => {
            delete newStreams[key];
            console.log(
              `[VocalContent] Removed alternative screen share key: ${key}`
            );
            removed = true;
          });
        }
      }

      // 3. If still not found, try by user ID for any screen shares
      if (!removed) {
        Object.keys(newStreams).forEach((key) => {
          const streamData = newStreams[key];
          if (
            streamData?.streamType === "screenshare" &&
            streamData?.userData?.from === from
          ) {
            delete newStreams[key];
            console.log(
              `[VocalContent] Removed screen share by user match: ${key} for user ${from}`
            );
            removed = true;
          }
        });
      }

      if (!removed) {
        console.warn(
          `[VocalContent] Screen share ${streamUUID} not found in active streams for removal`
        );
      }

      console.log(
        `[VocalContent] Remaining activeStreams after removal:`,
        Object.keys(newStreams)
      );
      return newStreams;
    });

    // Also update profilesInCommsChat to remove from active_screen_share array
    setProfilesInCommsChat((prev) =>
      prev.map((profile) => {
        if (
          profile.from === from &&
          Array.isArray(profile.active_screen_share)
        ) {
          const originalLength = profile.active_screen_share.length;
          const updatedScreenShares = profile.active_screen_share.filter(
            (id) => id !== streamUUID && id !== screenShareUUID
          );

          if (updatedScreenShares.length !== originalLength) {
            console.log(
              `[VocalContent] Updated active_screen_share for ${from}: ${originalLength} -> ${updatedScreenShares.length}`
            );
          }

          return {
            ...profile,
            active_screen_share: updatedScreenShares,
          };
        }
        return profile;
      })
    );

    // Clean up persistent screen shares
    setPersistentScreenShares((prev) => {
      const newPersistent = { ...prev };
      if (newPersistent[streamUUID]) {
        delete newPersistent[streamUUID];
        console.log(
          `[VocalContent] Removed persistent screen share: ${streamUUID}`
        );
      }
      return newPersistent;
    });

    // Also clean up video stream keys for Android
    if (Platform.OS === "android") {
      setVideoStreamKeys((prev) => {
        const newKeys = { ...prev };
        if (newKeys[streamUUID]) {
          delete newKeys[streamUUID];
          console.log(
            `[VocalContent] Cleaned up Android video stream key: ${streamUUID}`
          );
        }
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
        console.log("[VocalContent] New profiles:", newProfiles); // Create screen share rectangles for any active screen shares in the new profile
        if (
          data.active_screen_share &&
          Array.isArray(data.active_screen_share)
        ) {
          data.active_screen_share.forEach((screenShareUUID) => {
            console.log(
              `[VocalContent] Creating screen share rectangle for ${data.from}, screenShareUUID: ${screenShareUUID}`
            );

            // Keep the full screenShareUUID (PARTICIPANTID_STREAMID) for unique identification
            const streamUUID = screenShareUUID; // Don't split, keep it as-is
            const existingStream = getExistingScreenShareStream(
              streamUUID,
              data.from
            );

            setActiveStreams((prevStreams) => ({
              ...prevStreams,
              [streamUUID]: {
                stream: existingStream, // Use existing stream if available
                userData: data,
                streamType: "screenshare",
                streamUUID,
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
      console.log(`[VocalContent] Member left: ${data.from}`);

      // Rimuovo il profilo
      setProfilesInCommsChat((prevProfiles) =>
        prevProfiles.filter((profile) => profile.from !== data.from)
      );

      // Rimuovo anche lo stream associato e tutti i screen share streams dell'utente
      setActiveStreams((prev) => {
        const newStreams = { ...prev };

        // Remove main webcam stream
        if (newStreams[data.from]) {
          delete newStreams[data.from];
          console.log(
            `[VocalContent] Removed webcam stream for departing user ${data.from}`
          );
        }

        // Enhanced screen share cleanup - try multiple approaches
        const keysToRemove = [];

        Object.keys(newStreams).forEach((key) => {
          const streamData = newStreams[key];
          if (streamData?.streamType === "screenshare") {
            // Check multiple conditions for screen share ownership
            const belongsToUser =
              streamData.userData?.from === data.from ||
              streamData.participantId === data.from ||
              key.startsWith(`${data.from}_`) ||
              key.includes(`${data.from}_`);

            if (belongsToUser) {
              keysToRemove.push(key);
            }
          }
        });

        // Remove all identified screen share streams
        keysToRemove.forEach((key) => {
          delete newStreams[key];
          console.log(
            `[VocalContent] Removed screen share ${key} for departing user ${data.from}`
          );
        });

        console.log(
          `[VocalContent] Cleanup completed for user ${data.from}. Remaining streams:`,
          Object.keys(newStreams)
        );
        return newStreams;
      }); // Also clean up video stream keys for Android
      if (Platform.OS === "android") {
        setVideoStreamKeys((prev) => {
          const newKeys = { ...prev };

          // Remove main user video key
          if (newKeys[data.from]) {
            delete newKeys[data.from];
            console.log(
              `[VocalContent] Removed video stream key for user: ${data.from}`
            );
          }

          // Enhanced screen share video key cleanup
          const keysToRemove = [];

          Object.keys(newKeys).forEach((key) => {
            // Check if this key belongs to screen shares of the departing user
            if (
              key.startsWith(`${data.from}_`) ||
              key.includes(`${data.from}_`)
            ) {
              keysToRemove.push(key);
            }
          });

          // Remove all identified screen share video keys
          keysToRemove.forEach((key) => {
            delete newKeys[key];
            console.log(
              `[VocalContent] Removed video stream key for screen share: ${key}`
            );
          });

          console.log(
            `[VocalContent] Video key cleanup completed for user ${data.from}. Remaining keys:`,
            Object.keys(newKeys)
          );
          return newKeys;
        });
      } // Enhanced DOM cleanup for Web
      if (Platform.OS === "web") {
        // Clean up main user container
        const container = document.getElementById(
          `media-container-${data.from}`
        );
        if (container) {
          container.remove();
          console.log(
            `[VocalContent] Removed DOM container for user: ${data.from}`
          );
        }

        // Enhanced screen share DOM cleanup
        // Try multiple selector patterns to ensure all related elements are removed
        const selectorPatterns = [
          `media-container-${data.from}_`,
          `screenshare-${data.from}_`,
          `stream-${data.from}_`,
          `video-${data.from}_`,
        ];

        selectorPatterns.forEach((pattern) => {
          // Find all elements with IDs that start with this pattern
          const elements = Array.from(
            document.querySelectorAll(`[id^="${pattern}"]`)
          );
          elements.forEach((element) => {
            element.remove();
            console.log(`[VocalContent] Removed DOM element: ${element.id}`);
          });
        });

        // Also try to find and remove by data attributes if they exist
        const elementsWithUserData = Array.from(
          document.querySelectorAll(`[data-participant-id="${data.from}"]`)
        );
        elementsWithUserData.forEach((element) => {
          element.remove();
          console.log(
            `[VocalContent] Removed DOM element by participant ID: ${
              element.id || element.className
            }`
          );
        });

        console.log(
          `[VocalContent] DOM cleanup completed for user ${data.from}`
        );
      }
    }
  };

  return (
    <SmartBackground
      backgroundKey="backgroundChatGradient"
      style={styles.container}
    >
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
