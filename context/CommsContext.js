import { createContext, useState, useEffect, useContext, useRef } from "react";
import { Track } from "livekit-client";
import { Platform } from "react-native";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";

export const CommsContext = createContext();

export const CommsProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  const [isSpeakingMap, setIsSpeakingMap] = useState(new Map());
  const audioElementsRef = useRef(new Map());
  const [streams, setStreams] = useState({});
  const [mutedStreams, setMutedStreams] = useState({});

  const [pinnedStreamUUID, setPinnedStreamUUID] = useState(null);
  const [fullscreenStreamUUID, setFullScreenStreamUUID] = useState(null);
  const [activeScreenShares, setActiveScreenShares] = useState({});

  const [facingMode, setFacingMode] = useState("environment");

  const [error, setError] = useState(null);

  useEffect(() => {
    setConnected(!!room);
  }, [room]);

  useEffect(() => {
    if (!room) {
      setParticipants([]);
      return;
    }

    const remoteParticipants = Array.from(room.remoteParticipants.values());
    const localParticipant = room.localParticipant;

    setParticipants([localParticipant, ...remoteParticipants]);
  }, [room]);

  // Room join/leave events
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant) => {
      setParticipants((prev) => {
        // Avoid duplicates
        if (prev.find((p) => p.identity === participant.identity)) {
          return prev;
        }
        return [...prev, participant];
      });
      SoundPlayer.getInstance().playSound("comms.join");
    };

    const handleParticipantDisconnected = (participant) => {
      setParticipants((prev) => prev.filter((p) => p !== participant));
      SoundPlayer.getInstance().playSound("comms.leave");
    };

    const handleParticipantMetadataChanged = (metadata, participant) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.identity === participant.identity ? participant : p,
        ),
      );
    };

    const handleParticipantNameChanged = (name, participant) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.identity === participant.identity ? participant : p,
        ),
      );
    };

    room.on("participantConnected", handleParticipantConnected);
    room.on("participantDisconnected", handleParticipantDisconnected);
    room.on("participantMetadataChanged", handleParticipantMetadataChanged);
    room.on("participantNameChanged", handleParticipantNameChanged);

    return () => {
      room.off("participantConnected", handleParticipantConnected);
      room.off("participantDisconnected", handleParticipantDisconnected);
      room.off("participantMetadataChanged", handleParticipantMetadataChanged);
      room.off("participantNameChanged", handleParticipantNameChanged);
    };
  }, [room, setParticipants]);

  // Room track events
  useEffect(() => {
    if (!room) return;

    const handleTrackMuted = (publication, participant) => {
      if (publication.source === Track.Source.Camera) {
        setStreams((prev) => {
          const { [participant.identity]: stream, ...rest } = prev;
          if (stream) {
            setMutedStreams((prevMuted) => ({
              ...prevMuted,
              [participant.identity]: stream,
            }));
          }
          return rest;
        });
        // Reset pin or fullscreen if the camera is muted
        if (participant.identity === pinnedStreamUUID) {
          setPinnedStreamUUID(null);
        }
        if (participant.identity === fullscreenStreamUUID) {
          setFullScreenStreamUUID(null);
        }
      }
    };

    const handleTrackUnmuted = (publication, participant) => {
      if (publication.source === Track.Source.Camera) {
        setMutedStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          setStreams((prevStreams) => ({
            ...prevStreams,
            [participant.identity]: new MediaStream([
              publication.track.mediaStreamTrack,
            ]),
          }));
          return rest;
        });
      }
    };

    const handleTrackSubscribed = (track, publication, participant) => {
      if (track.kind === "audio") {
        if (Platform.OS === "web") {
          const audioEl = document.createElement("audio");
          audioEl.srcObject = track.mediaStream;
          audioEl.autoplay = true;
          audioEl.volume = 1;
          document.body.appendChild(audioEl);
          audioEl
            .play()
            .catch((err) => console.error("Errore riproduzione audio:", err));
          audioElementsRef.current.set(publication.trackSid, audioEl);
        } else {
          // Mobile: attach audio track
          track.attach();
        }
      }
      // Add video streams to state
      if (
        track.kind === "video" &&
        publication.source === Track.Source.Camera
      ) {
        const videoStream = new MediaStream([track.mediaStreamTrack]);
        setStreams((prev) => ({
          ...prev,
          [participant.identity]: videoStream,
        }));
      } else if (publication.source === Track.Source.ScreenShare) {
        const screenStream = new MediaStream([track.mediaStreamTrack]);
        setStreams((prev) => ({
          ...prev,
          [publication.trackSid]: screenStream,
        }));
        // play a sound when anyone starts screen share
        SoundPlayer.getInstance().playSound("comms.screen_share.start");
      }

      // Add mute listeners
      publication.on("muted", () => handleTrackMuted(publication, participant));
      publication.on("unmuted", () =>
        handleTrackUnmuted(publication, participant),
      );
    };

    const handleTrackUnsubscribed = (track, publication, participant) => {
      if (track.kind === "audio") {
        if (Platform.OS === "web") {
          const audioEl = audioElementsRef.current.get(publication.trackSid);
          if (audioEl) {
            audioEl.remove();
            audioElementsRef.current.delete(publication.trackSid);
          }
        } else {
          // Mobile: detach audio track
          track.detach();
        }
      }
      // Remove streams from state
      if (
        track.kind === "video" &&
        publication.source === Track.Source.Camera
      ) {
        setStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          return rest;
        });
        setMutedStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          return rest;
        });
      } else if (publication.source === Track.Source.ScreenShare) {
        setStreams((prev) => {
          const { [publication.trackSid]: _, ...rest } = prev;
          return rest;
        });
        // play sound when screen share stops
        SoundPlayer.getInstance().playSound("comms.screen_share.stop");
      }
      // Reset pin or fullscreen if the track is removed
      if (publication.source === Track.Source.Camera) {
        if (participant.identity === pinnedStreamUUID) {
          setPinnedStreamUUID(null);
        }
        if (participant.identity === fullscreenStreamUUID) {
          setFullScreenStreamUUID(null);
        }
      } else if (publication.source === Track.Source.ScreenShare) {
        if (publication.trackSid === pinnedStreamUUID) {
          setPinnedStreamUUID(null);
        }
        if (publication.trackSid === fullscreenStreamUUID) {
          setFullScreenStreamUUID(null);
        }
      }
    };

    const handleLocalTrackPublished = (publication, participant) => {
      if (publication.source === Track.Source.Camera && publication.track) {
        const videoStream = new MediaStream([
          publication.track.mediaStreamTrack,
        ]);
        setStreams((prev) => ({
          ...prev,
          [participant.identity]: videoStream,
        }));
      } else if (
        publication.source === Track.Source.ScreenShare &&
        publication.track
      ) {
        const screenStream = new MediaStream([
          publication.track.mediaStreamTrack,
        ]);
        setStreams((prev) => ({
          ...prev,
          [publication.trackSid]: screenStream,
        }));
        // local user started screen share
        SoundPlayer.getInstance().playSound("comms.screen_share.start");
      }
      // Add mute listeners
      publication.on("muted", () => handleTrackMuted(publication, participant));
      publication.on("unmuted", () =>
        handleTrackUnmuted(publication, participant),
      );
    };

    const handleLocalTrackUnpublished = (publication, participant) => {
      if (publication.source === Track.Source.Camera) {
        setStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          return rest;
        });
        setMutedStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          return rest;
        });
      } else if (publication.source === Track.Source.ScreenShare) {
        setStreams((prev) => {
          const { [publication.trackSid]: _, ...rest } = prev;
          return rest;
        });
        // local user stopped screen share
        SoundPlayer.getInstance().playSound("comms.screen_share.stop");
      }
    };

    room.on("trackSubscribed", handleTrackSubscribed);
    room.on("trackUnsubscribed", handleTrackUnsubscribed);
    room.on("localTrackPublished", handleLocalTrackPublished);
    room.on("localTrackUnpublished", handleLocalTrackUnpublished);

    // Initialize existing tracks
    Array.from(room.remoteParticipants.values()).forEach((participant) => {
      participant.getTrackPublications().forEach((publication) => {
        if (publication.track) {
          if (publication.kind === "video") {
            const stream = new MediaStream([
              publication.track.mediaStreamTrack,
            ]);
            const key =
              publication.source === Track.Source.Camera
                ? participant.identity
                : publication.trackSid;
            if (
              publication.source === Track.Source.Camera &&
              publication.track.isMuted
            ) {
              setMutedStreams((prev) => ({ ...prev, [key]: stream }));
            } else {
              setStreams((prev) => ({ ...prev, [key]: stream }));
            }
          } else if (publication.kind === "audio") {
            // Handle existing audio tracks
            handleTrackSubscribed(publication.track, publication, participant);
          }

          // Add listeners
          publication.on("muted", () =>
            handleTrackMuted(publication, participant),
          );
          publication.on("unmuted", () =>
            handleTrackUnmuted(publication, participant),
          );
        }
      });
    });

    return () => {
      room.off("trackSubscribed", handleTrackSubscribed);
      room.off("trackUnsubscribed", handleTrackUnsubscribed);
      room.off("localTrackPublished", handleLocalTrackPublished);
      room.off("localTrackUnpublished", handleLocalTrackUnpublished);
      // Cleanup audio elements
      if (Platform.OS === "web") {
        audioElementsRef.current.forEach((el) => el.remove());
        audioElementsRef.current.clear();
      }
    };
  }, [
    room,
    pinnedStreamUUID,
    fullscreenStreamUUID,
    setPinnedStreamUUID,
    setFullScreenStreamUUID,
    setStreams,
  ]);

  // Participant events
  useEffect(() => {
    if (!participants || !Array.isArray(participants)) return;

    const listeners = new Map();

    participants.forEach((participant) => {
      if (typeof participant.on !== "function") return;

      const handleSpeakingChanged = (speaking) => {
        setIsSpeakingMap((prev) =>
          new Map(prev).set(participant.identity, speaking),
        );
      };

      if (participant.isSpeaking !== undefined) {
        // Inizializza
        setIsSpeakingMap((prev) =>
          new Map(prev).set(participant.identity, participant.isSpeaking),
        );
      }

      participant.on("isSpeakingChanged", handleSpeakingChanged);
      listeners.set(participant.identity, handleSpeakingChanged);
    });

    return () => {
      participants.forEach((participant) => {
        const listener = listeners.get(participant.identity);
        if (listener) {
          participant.off("isSpeakingChanged", listener);
        }
      });
    };
  }, [participants]);

  const checkRoomMatch = (chatUUID, sub) => {
    if (!room) return false;
    const currentRoomName = room.roomInfo.name;
    return `${chatUUID}_${sub}` === currentRoomName;
  };

  const reset = () => {
    setRoom(null);
    setConnected(false);
    setPinnedStreamUUID(null);
    setFullScreenStreamUUID(null);
    setActiveScreenShares({});
    setParticipants([]);
    setStreams({});
    setMutedStreams({});
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    setError(null);
  };

  const value = {
    room,
    setRoom,
    connected,
    checkRoomMatch,
    pinnedStreamUUID,
    setPinnedStreamUUID,
    fullscreenStreamUUID,
    setFullScreenStreamUUID,
    activeScreenShares,
    setActiveScreenShares,
    facingMode,
    setFacingMode,
    isAudioEnabled,
    setIsAudioEnabled,
    isVideoEnabled,
    setIsVideoEnabled,
    participants,
    setParticipants,
    isSpeakingMap,
    streams,
    mutedStreams,
    reset,
    error,
    setError,
  };

  return (
    <CommsContext.Provider value={value}>{children}</CommsContext.Provider>
  );
};

export const useCommsContext = () => {
  const context = useContext(CommsContext);
  if (!context) {
    throw new Error("useCommsContext must be used within a CommsProvider");
  }
  return context;
};
