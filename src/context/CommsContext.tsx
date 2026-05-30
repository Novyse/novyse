import * as React from "react";
import "@/src/utils/polyfills";
import { Track, Room, Participant, TrackPublication } from "livekit-client";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";

interface CommsContextType {
  room: Room | null;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  roomMetadata: string;
  setRoomMetadata: React.Dispatch<React.SetStateAction<string>>;
  connected: boolean;
  checkRoomMatch: (chatUUID: string, sub: string | number) => boolean;
  pinnedStreamUUID: string | null;
  setPinnedStreamUUID: React.Dispatch<React.SetStateAction<string | null>>;
  fullscreenStreamUUID: string | null;
  setFullScreenStreamUUID: React.Dispatch<React.SetStateAction<string | null>>;
  activeScreenShares: Record<string, any>;
  setActiveScreenShares: React.Dispatch<
    React.SetStateAction<Record<string, any>>
  >;
  facingMode: string;
  setFacingMode: React.Dispatch<React.SetStateAction<string>>;
  isAudioEnabled: boolean;
  setIsAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isVideoEnabled: boolean;
  setIsVideoEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  isSpeakingMap: Map<string, boolean>;
  streams: Record<string, MediaStream>;
  setStreams: React.Dispatch<React.SetStateAction<Record<string, MediaStream>>>;
  mutedStreams: Record<string, MediaStream>;
  setMutedStreams: React.Dispatch<
    React.SetStateAction<Record<string, MediaStream>>
  >;
  remoteVolumes: Record<string, number>;
  setRemoteVolume: (
    id: string,
    dbValue: number,
    shouldPersist?: boolean,
  ) => Promise<void>;
  localMuted: Record<string, boolean>;
  toggleLocalMute: (id: string) => void;
  triggeredStream: any;
  setTriggeredStream: React.Dispatch<React.SetStateAction<any>>;
  triggeredPosition: { x: number; y: number };
  setTriggeredPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  reset: () => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const CommsContext = React.createContext<CommsContextType | undefined>(
  undefined,
);

const VOLUMES_MAX_SAVED = 2000;
const VOLUMES_STORAGE_KEY = "novyse_comms_remote_volumes";

const dbToLinear = (db: number) => {
  if (db <= -30) return 0;
  const linear = Math.pow(10, db / 20);
  return Math.min(10.0, linear);
};

interface CommsProviderProps {
  children: React.ReactNode;
}

export const CommsProvider = ({ children }: CommsProviderProps) => {
  const [connected, setConnected] = React.useState<boolean>(false);

  const [room, setRoom] = React.useState<Room | null>(null);
  const [roomMetadata, setRoomMetadata] = React.useState<string>("");

  const [participants, setParticipants] = React.useState<Participant[]>([]);

  const [isAudioEnabled, setIsAudioEnabled] = React.useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState<boolean>(false);

  const [isSpeakingMap, setIsSpeakingMap] = React.useState<
    Map<string, boolean>
  >(new Map());
  const audioElementsRef = React.useRef<Map<string, any>>(new Map());
  const [streams, setStreams] = React.useState<Record<string, MediaStream>>({});
  const [mutedStreams, setMutedStreams] = React.useState<
    Record<string, MediaStream>
  >({});

  const [pinnedStreamUUID, setPinnedStreamUUID] = React.useState<string | null>(
    null,
  );
  const [fullscreenStreamUUID, setFullScreenStreamUUID] = React.useState<
    string | null
  >(null);
  const [activeScreenShares, setActiveScreenShares] = React.useState<
    Record<string, any>
  >({});

  const [triggeredStream, setTriggeredStream] = React.useState<any>(null);
  const [triggeredPosition, setTriggeredPosition] = React.useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!room) {
      setRoomMetadata("");
      return;
    }
    setRoomMetadata(room.metadata || "");
    const handleRoomMetadataChanged = (metadata?: string) => {
      setRoomMetadata(metadata || "");
    };
    room.on("roomMetadataChanged", handleRoomMetadataChanged);
    return () => {
      room.off("roomMetadataChanged", handleRoomMetadataChanged);
    };
  }, [room]);

  const [remoteVolumes, setRemoteVolumes] = React.useState<
    Record<string, number>
  >({});
  const [localMuted, setLocalMuted] = React.useState<Record<string, boolean>>(
    {},
  );

  const remoteVolumesRef = React.useRef<Record<string, number>>({});
  const localMutedRef = React.useRef<Record<string, boolean>>({});

  React.useEffect(() => {
    remoteVolumesRef.current = remoteVolumes;
  }, [remoteVolumes]);

  React.useEffect(() => {
    localMutedRef.current = localMuted;
  }, [localMuted]);

  const [facingMode, setFacingMode] = React.useState<string>("environment");

  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadVolumes = async () => {
      try {
        const saved = await AsyncStorage.getItem(VOLUMES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setRemoteVolumes(parsed);
        }
      } catch (e) {
        console.error("[CommsContext] Failed to load remote volumes:", e);
      }
    };
    loadVolumes();
  }, [connected]);

  React.useEffect(() => {
    setConnected(!!room);
  }, [room]);

  React.useEffect(() => {
    if (!room) {
      setParticipants([]);
      return;
    }

    const remoteParticipants = Array.from(room.remoteParticipants.values());
    const localParticipant = room.localParticipant;

    setParticipants([localParticipant, ...remoteParticipants]);
  }, [room]);

  // Room join/leave events
  React.useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: Participant) => {
      setParticipants((prev) => {
        // Avoid duplicates
        if (prev.find((p) => p.identity === participant.identity)) {
          return prev;
        }
        return [...prev, participant];
      });
      (SoundPlayer.getInstance() as any)?.playSound("comms.join");
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      setParticipants((prev) => prev.filter((p) => p !== participant));
      (SoundPlayer.getInstance() as any)?.playSound("comms.leave");
    };

    const handleParticipantMetadataChanged = (
      metadata: string | undefined,
      participant: Participant,
    ) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.identity === participant.identity ? participant : p,
        ),
      );
    };

    const handleParticipantNameChanged = (
      name: string | undefined,
      participant: Participant,
    ) => {
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
  React.useEffect(() => {
    if (!room) return;

    const handleTrackMuted = (
      publication: TrackPublication,
      participant: Participant,
    ) => {
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

    const handleTrackUnmuted = (
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (publication.source === Track.Source.Camera) {
        setMutedStreams((prev) => {
          const { [participant.identity]: _, ...rest } = prev;
          if (publication.track) {
            setStreams((prevStreams) => ({
              ...prevStreams,
              [participant.identity]: new MediaStream([
                publication.track!.mediaStreamTrack,
              ]),
            }));
          }
          return rest;
        });
      }
    };

    const handleTrackSubscribed = (
      track: Track,
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (track.kind === "audio") {
        let volKey = participant.identity;
        if (publication.source === Track.Source.ScreenShareAudio) {
          const screenVideoPub = participant.getTrackPublication(
            Track.Source.ScreenShare,
          );
          volKey = screenVideoPub
            ? screenVideoPub.trackSid
            : publication.trackSid;
        }

        const db = remoteVolumesRef.current[volKey] ?? 0;
        const isMuted = localMutedRef.current[volKey] ?? false;
        const targetVolume = isMuted ? 0 : dbToLinear(db);

        if (track && typeof (track as any).setVolume === "function") {
          try {
            (track as any).setVolume(targetVolume);
          } catch (err) {
            console.error(
              "[CommsContext] Error setting volume on subscription:",
              err,
            );
          }
        }

        if (Platform.OS === "web") {
          const audioEl = document.createElement("audio");
          audioEl.srcObject = (track as any).mediaStream;
          audioEl.autoplay = true;
          audioEl.volume = Math.min(1.0, targetVolume);
          document.body.appendChild(audioEl);
          audioEl
            .play()
            .catch((err) => console.error("Errore riproduzione audio:", err));
          audioElementsRef.current.set(publication.trackSid, audioEl);
        }
      }
      // Add video streams to state
      if (
        track.kind === "video" &&
        publication.source === Track.Source.Camera
      ) {
        const videoStream = new MediaStream([(track as any).mediaStreamTrack]);
        setStreams((prev) => ({
          ...prev,
          [participant.identity]: videoStream,
        }));
      } else if (publication.source === Track.Source.ScreenShare) {
        const screenStream = new MediaStream([(track as any).mediaStreamTrack]);
        setStreams((prev) => ({
          ...prev,
          [publication.trackSid]: screenStream,
        }));
        // play a sound when anyone starts screen share
        (SoundPlayer.getInstance() as any)?.playSound(
          "comms.screen_share.start",
        );
      }

      // Add mute listeners
      publication.on("muted", () => handleTrackMuted(publication, participant));
      publication.on("unmuted", () =>
        handleTrackUnmuted(publication, participant),
      );
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (track.kind === "audio") {
        if (Platform.OS === "web") {
          const audioEl = audioElementsRef.current.get(publication.trackSid);
          if (audioEl) {
            audioEl.remove();
            audioElementsRef.current.delete(publication.trackSid);
          }
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
        (SoundPlayer.getInstance() as any)?.playSound(
          "comms.screen_share.stop",
        );
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

    const handleLocalTrackPublished = (
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (publication.source === Track.Source.Camera && publication.track) {
        const videoStream = new MediaStream([
          (publication.track as any).mediaStreamTrack,
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
          (publication.track as any).mediaStreamTrack,
        ]);
        setStreams((prev) => ({
          ...prev,
          [publication.trackSid]: screenStream,
        }));
        // local user started screen share
        (SoundPlayer.getInstance() as any)?.playSound(
          "comms.screen_share.start",
        );
      }
      // Add mute listeners
      publication.on("muted", () => handleTrackMuted(publication, participant));
      publication.on("unmuted", () =>
        handleTrackUnmuted(publication, participant),
      );
    };

    const handleLocalTrackUnpublished = (
      publication: TrackPublication,
      participant: Participant,
    ) => {
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
        (SoundPlayer.getInstance() as any)?.playSound(
          "comms.screen_share.stop",
        );
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
              (publication.track as any).mediaStreamTrack,
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
  React.useEffect(() => {
    if (!participants || !Array.isArray(participants)) return;

    const listeners = new Map<string, (speaking: boolean) => void>();

    participants.forEach((participant) => {
      if (typeof participant.on !== "function") return;

      const handleSpeakingChanged = (speaking: boolean) => {
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

  const checkRoomMatch = (chatUUID: string, sub: string | number) => {
    if (!room) return false;
    const currentRoomName = (room as any).roomInfo?.name;
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
    setIsSpeakingMap(new Map());
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    setRemoteVolumes({});
    setLocalMuted({});
    setTriggeredStream(null);
    setTriggeredPosition({ x: 0, y: 0 });
    setError(null);
  };

  const setRemoteVolume = async (
    id: string,
    dbValue: number,
    shouldPersist = true,
  ) => {
    setRemoteVolumes((prev) => {
      let updated = {
        ...prev,
        [id]: dbValue,
      };
      if (shouldPersist) {
        const keys = Object.keys(updated);
        if (keys.length > VOLUMES_MAX_SAVED) {
          const oldestKey = keys[0];
          const { [oldestKey]: _, ...rest } = updated;
          updated = rest;
        }
        const json = JSON.stringify(updated);
        AsyncStorage.setItem(VOLUMES_STORAGE_KEY, json).catch((e) =>
          console.error("[CommsContext] Error saving volumes:", e),
        );
      }
      return updated;
    });
  };

  const toggleLocalMute = (id: string) => {
    setLocalMuted((prev) => {
      const newState = !prev[id];
      return {
        ...prev,
        [id]: newState,
      };
    });
  };

  React.useEffect(() => {
    if (!room) {
      return;
    }

    room.remoteParticipants.forEach((participant) => {
      // 1. Handle Microphone volume (People)
      const micPub = participant.getTrackPublication(Track.Source.Microphone);
      if (micPub) {
        const volKey = participant.identity;
        const db = remoteVolumes[volKey] ?? 0;
        const isMuted = localMuted[volKey] ?? false;
        const targetVolume = isMuted ? 0 : dbToLinear(db);

        // Native LiveKit volume control
        if (
          micPub.track &&
          typeof (micPub.track as any).setVolume === "function"
        ) {
          (micPub.track as any).setVolume(targetVolume);
        }

        // Web Audio element synchronization
        if (Platform.OS === "web" && micPub.trackSid) {
          const audioEl = audioElementsRef.current.get(micPub.trackSid);
          const webVolume = Math.min(1.0, targetVolume);
          if (audioEl && audioEl.volume !== webVolume) {
            audioEl.volume = webVolume;
          }
        }
      }

      // 2. Handle ScreenShareAudio volume
      const screenAudioPub = participant.getTrackPublication(
        Track.Source.ScreenShareAudio,
      );
      const screenVideoPub = participant.getTrackPublication(
        Track.Source.ScreenShare,
      );

      if (screenAudioPub) {
        const volKey = screenVideoPub
          ? screenVideoPub.trackSid
          : screenAudioPub.trackSid;

        const db = remoteVolumes[volKey] ?? 0;
        const isMuted = localMuted[volKey] ?? false;
        const targetVolume = isMuted ? 0 : dbToLinear(db);

        if (
          screenAudioPub.track &&
          typeof (screenAudioPub.track as any).setVolume === "function"
        ) {
          (screenAudioPub.track as any).setVolume(targetVolume);
        }
        // Web Audio element synchronization

        if (Platform.OS === "web") {
          const audioEl = audioElementsRef.current.get(screenAudioPub.trackSid);
          const webVolume = Math.min(1.0, targetVolume);
          if (audioEl && audioEl.volume !== webVolume) {
            audioEl.volume = webVolume;
          }
        }
      }
    });
  }, [remoteVolumes, localMuted, room]);

  const value: CommsContextType = {
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
    setStreams,
    mutedStreams,
    setMutedStreams,
    remoteVolumes,
    setRemoteVolume,
    localMuted,
    toggleLocalMute,
    triggeredStream,
    setTriggeredStream,
    triggeredPosition,
    setTriggeredPosition,
    reset,
    error,
    setError,
    roomMetadata,
    setRoomMetadata,
  };

  return (
    <CommsContext.Provider value={value}>{children}</CommsContext.Provider>
  );
};

export const useCommsContext = () => {
  const context = React.useContext(CommsContext);
  if (!context) {
    throw new Error("useCommsContext must be used within a CommsProvider");
  }
  return context;
};
