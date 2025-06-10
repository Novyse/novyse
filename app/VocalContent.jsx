import React, { useState, useContext, useEffect } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import SmartBackground from "./components/SmartBackground";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";

import methods from "./utils/webrtc/methods";
const { get, check, set } = methods;

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const audioContext = useAudio();
  const styles = createStyle(theme);

  const [commsData, setCommsData] = useState([]);
  const [activeStreams, setActiveStreams] = useState({});

  /* Structure of commsData:
  [
    [participantId],{
      userData: {
        handle: "Participant Handle",
        isSpeaking: false,
      },
      activeScreenShares: ["streamUUID1", "streamUUID2"],
      ...
    },
    ...
  ]
  */

  /* Structure of activeStreams:
    { 
      participantUUID: {
        streamUUID1: {
          stream: MediaStream, // The actual MediaStream object for screen share
          hasAudio: true/false, // Whether the screen share has audio
          hasVideo: true/false, // Whether the screen share has video
        },
        streamUUID2: {
          stream: MediaStream, // The actual MediaStream object for screen share
          hasAudio: true/false, // Whether the screen share has audio
          hasVideo: true/false, // Whether the screen share has video
        },
        ...
      },
      ...
  }
  */
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

    const getCommsData = async () => {
      const commsData = await get.commsData(chatId);

      const tempActiveStreams = get.activeStreams();
      setActiveStreams(tempActiveStreams);
      console.debug("[VocalContent] All profiles for debugging:", commsData);

      setCommsData(commsData);
    };

    getCommsData();
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

  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.info("[VocalContent] User not in comms, ignoring stream update");
      return;
    }

    let { participantUUID, stream, streamUUID } = data;

    if (!stream || !participantUUID || !streamUUID) {
      console.warn(
        "[VocalContent] Invalid stream update data, missing participantUUID, stream or streamUUID",
        data
      );
      return;
    }

    setActiveStreams((prevStreams) => {
      const updatedStreams = { ...prevStreams };

      // Ensure participant object exists
      if (!updatedStreams[participantUUID]) {
        updatedStreams[participantUUID] = {};
      }

      // Add or update the stream
      updatedStreams[participantUUID][streamUUID] = stream;

      return updatedStreams;
    });
  };

  // Speech detection handlers
  const handleUserStartedSpeaking = () => {
    if (check.isInComms() && chatId === get.commsId()) {
      // Aggiorna lo stato isSpeaking per l'utente corrente in commsData
      setCommsData((prev) => {
        const updated = { ...prev };
        const myParticipantUUID = get.myPartecipantId();

        if (updated[myParticipantUUID]) {
          updated[myParticipantUUID] = {
            ...updated[myParticipantUUID],
            userData: {
              ...updated[myParticipantUUID].userData,
              isSpeaking: true,
            },
          };
        }
        return updated;
      });
    }
  };

  const handleUserStoppedSpeaking = () => {
    if (check.isInComms() && chatId === get.commsId()) {
      // Aggiorna lo stato isSpeaking per l'utente corrente in commsData
      setCommsData((prev) => {
        const updated = { ...prev };
        const myParticipantUUID = get.myPartecipantId();

        if (updated[myParticipantUUID]) {
          updated[myParticipantUUID] = {
            ...updated[myParticipantUUID],
            userData: {
              ...updated[myParticipantUUID].userData,
              isSpeaking: false,
            },
          };
        }
        return updated;
      });
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
      // Aggiorna lo stato isSpeaking per l'utente remoto in commsData
      setCommsData((prev) => {
        const updated = { ...prev };
        const participantUUID = data.id;

        if (updated[participantUUID]) {
          updated[participantUUID] = {
            ...updated[participantUUID],
            userData: {
              ...updated[participantUUID].userData,
              isSpeaking: true,
            },
          };
        }
        return updated;
      });
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
      // Aggiorna lo stato isSpeaking per l'utente remoto in commsData
      setCommsData((prev) => {
        const updated = { ...prev };
        const participantUUID = data.id;

        if (updated[participantUUID]) {
          updated[participantUUID] = {
            ...updated[participantUUID],
            userData: {
              ...updated[participantUUID].userData,
              isSpeaking: false,
            },
          };
        }
        return updated;
      });
    }
  };

  // Screen sharing handlers
  const handleScreenShareStarted = (data) => {
    if (!check.isInComms() && data.chatId !== chatId) {
      console.debug(
        "[VocalContent] User not in comms or in the wrong comms view, ignoring screen share start"
      );
      return;
    }

    console.debug("[VocalContent] Screen share started:", data);
    const { from, screenShareUUID } = data;

    // Skip if it's from the current user (they already have their own screen share)
    if (from === get.myPartecipantId()) {
      console.info("[VocalContent] Ignoring own screen share started event");
      return;
    }

    setCommsData((prev) => {
      const updated = { ...prev };
      const participantUUID = data.id;

      if (updated[participantUUID]) {
        updated[participantUUID] = {
          ...updated[participantUUID],
          activeScreenShares: [
            ...(updated[participantUUID].activeScreenShares || []),
            screenShareUUID, // Add the new screen share UUID
          ],
        };
      }
      return updated;
    });
  };

  const handleScreenShareStopped = (data) => {
    if (!check.isInComms() && data.chatId !== chatId) {
      console.debug(
        "[VocalContent] User not in comms or in the wrong comms view, ignoring screen share stop"
      );
      return;
    }
    console.debug("[VocalContent] Screen share stopped:", data);

    const { from, screenShareUUID } = data;

    // Skip if it's from the current user (they already have their own screen share)
    if (from === get.myPartecipantId()) {
      console.info("[VocalContent] Ignoring own screen share stopped event");
      return;
    }

    // Remove the screen share from active streams and commsData

    setCommsData((prev) => {
      const updated = { ...prev };
      const participantUUID = data.id;
      if (updated[participantUUID]) {
        updated[participantUUID] = {
          ...updated[participantUUID],
          activeScreenShares: (
            updated[participantUUID].activeScreenShares || []
          ).filter((id) => id !== screenShareUUID), // Remove the specific screen share UUID
        };
        console.log(
          `[VocalContent] Updated activeScreenShares for ${from}: ${screenShareUUID} removed`
        );
      }
      return updated;
    });

    setActiveStreams((prev) => {
      const newStreams = { ...prev };

      if (newStreams[screenShareUUID]) {
        delete newStreams[screenShareUUID];
        console.log(
          `[VocalContent] Removed screen share stream: ${screenShareUUID}`
        );
      } else {
        console.warn(
          `[VocalContent] Attempted to remove non-existent screen share stream: ${screenShareUUID}`
        );
      }
      return newStreams;
    });
  };
  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      console.debug("[VocalContent] Member joined comms:", data);
      console.log("[VocalContent] Adding member to profiles");

      setCommsData((prev) => {
        const updated = { ...prev };
        const participantUUID = data.from;

        // Ensure the participant exists in commsData
        if (!updated[participantUUID]) {
          updated[participantUUID] = {
            userData: {
              handle: data.handle || "Unknown User",
              isSpeaking: false,
            },
            activeScreenShares: [],
          };
        }
        return updated;
      });
    } else {
      console.debug(
        "[VocalContent] View incorrect, ignored member join event for different chat"
      );
    }
  };
  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {
    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      console.log(`[VocalContent] Member left: ${data.from}`);

      // Rimuovo il profilo
      setCommsData((prev) => {
        const updated = { ...prev };
        const participantUUID = data.from;

        // Remove the participant if they exist
        if (updated[participantUUID]) {
          delete updated[participantUUID];
          console.log(`[VocalContent] Removed profile for user: ${data.from}`);
        } else {
          console.warn(
            `[VocalContent] Attempted to remove non-existent profile for user: ${data.from}`
          );
        }
        return updated;
      });

      // Rimuovo anche lo stream associato e tutti i screen share streams dell'utente

      setActiveStreams((prev) => {
        const newStreams = { ...prev };
        // Remove all active streams for the departing user

        if (newStreams[data.from]) {
          delete newStreams[data.from];
          console.log(
            `[VocalContent] Removed all active streams for departing user ${data.from}`
          );
        }
        return newStreams;
      });
    } else {
      console.debug(
        "[VocalContent] View incorrect, ignored member left event for different chat"
      );
    }
  };

  return (
    <SmartBackground
      backgroundKey="backgroundChatGradient"
      style={styles.container}
    >
      <VocalMembersLayout commsData={commsData} activeStreams={activeStreams} />
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
