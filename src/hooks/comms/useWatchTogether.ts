import { useState, useEffect, useRef } from "react";
import { useCommsContext } from "@/src/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";

export interface WatchTogetherState {
  url: string;
  status: "playing" | "paused";
  timestamp: number;
  updatedAt: number;
}

export interface ParsedVideo {
  type: "youtube" | "direct" | null;
  videoId?: string;
  videoUrl?: string;
}

// Dependency-free ASCII/UTF-8 array encoder/decoder for React Native safety
const stringToUint8Array = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
};

const uint8ArrayToString = (arr: Uint8Array): string => {
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return str;
};

export const parseVideoUrl = (url: string): ParsedVideo => {
  if (!url) return { type: null };

  // YouTube matchers
  const ytRegExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { type: "youtube", videoId: ytMatch[2] };
  }

  // Direct video file link matcher
  const videoExtensions = /\.(mp4|webm|ogg|mov|mkv|m3u8)(?:\?.*)?$/i;
  if (videoExtensions.test(url)) {
    return { type: "direct", videoUrl: url };
  }

  return { type: null };
};

const getDriftSeconds = (updatedAt: any): number => {
  if (!updatedAt) return 0;
  const updatedAtMs =
    typeof updatedAt === "string"
      ? new Date(updatedAt).getTime()
      : Number(updatedAt);
  if (isNaN(updatedAtMs)) return 0;
  const drift = (Date.now() - updatedAtMs) / 1000;
  return drift > 0 ? drift : 0;
};

export const useWatchTogether = (playerRef: React.RefObject<any>) => {
  const { room, roomMetadata } = useCommsContext();
  const [watchTogetherState, setWatchTogetherState] =
    useState<WatchTogetherState | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const isRemoteAction = useRef<boolean>(false);
  const localCurrentTime = useRef<number>(0);
  const localStatus = useRef<"playing" | "paused">("paused");
  const currentUrl = useRef<string>("");

  const roomUUID = room?.name || "";

  // 1. Sync local refs to allow direct comparison inside callbacks
  useEffect(() => {
    if (watchTogetherState) {
      localStatus.current = watchTogetherState.status;
      currentUrl.current = watchTogetherState.url;
    } else {
      localStatus.current = "paused";
      currentUrl.current = "";
    }
  }, [watchTogetherState]);

  // 2. Subscribe to Room Metadata changes & handle initial state
  useEffect(() => {
    if (!roomMetadata) {
      setWatchTogetherState(null);
      return;
    }

    try {
      const parsed = JSON.parse(roomMetadata);
      const wt: WatchTogetherState | null = parsed.watchTogether;

      if (!wt) {
        setWatchTogetherState(null);
        return;
      }

      console.log("[useWatchTogether] Metadata received:", wt);

      // If it's a completely new URL, set the state directly
      if (currentUrl.current !== wt.url) {
        setWatchTogetherState(wt);
        localCurrentTime.current = wt.timestamp;
        setCurrentTime(wt.timestamp);

        // If the player is ready, load/seek to it
        setTimeout(() => {
          isRemoteAction.current = true;
          if (wt.status === "playing") {
            const startSecs = wt.timestamp + getDriftSeconds(wt.updatedAt);
            playerRef.current?.seek(startSecs);
            playerRef.current?.play();
          } else {
            playerRef.current?.seek(wt.timestamp);
            playerRef.current?.pause();
          }
        }, 1000); // Allow some buffer for mounting player
        return;
      }

      // If the URL is the same, check for status change or drift threshold of 3s
      const timeDiff = Math.abs(localCurrentTime.current - wt.timestamp);
      const statusChanged = wt.status !== localStatus.current;

      if (statusChanged || timeDiff > 3) {
        console.log("[useWatchTogether] Synced from metadata drift:", {
          statusChanged,
          timeDiff,
        });
        isRemoteAction.current = true;
        localCurrentTime.current = wt.timestamp;
        setCurrentTime(wt.timestamp);

        if (wt.status === "playing") {
          const startSecs = wt.timestamp + getDriftSeconds(wt.updatedAt);
          playerRef.current?.seek(startSecs);
          playerRef.current?.play();
        } else {
          playerRef.current?.seek(wt.timestamp);
          playerRef.current?.pause();
        }
      }

      setWatchTogetherState(wt);
    } catch (err) {
      console.error("[useWatchTogether] Error parsing metadata:", err);
    }
  }, [roomMetadata, playerRef]);

  // 3. Subscribe to UDP Data Packets
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      try {
        const text = uint8ArrayToString(payload);
        const packet = JSON.parse(text);

        if (packet && packet.type === "watch-together") {
          console.log("[useWatchTogether] UDP Packet received:", packet);
          isRemoteAction.current = true;
          localCurrentTime.current = packet.timestamp;
          setCurrentTime(packet.timestamp);

          if (packet.action === "play") {
            playerRef.current?.seek(packet.timestamp);
            playerRef.current?.play();
            setWatchTogetherState((prev) =>
              prev
                ? { ...prev, status: "playing", timestamp: packet.timestamp }
                : null,
            );
          } else if (packet.action === "pause") {
            playerRef.current?.seek(packet.timestamp);
            playerRef.current?.pause();
            setWatchTogetherState((prev) =>
              prev
                ? { ...prev, status: "paused", timestamp: packet.timestamp }
                : null,
            );
          } else if (packet.action === "seek") {
            playerRef.current?.seek(packet.timestamp);
            setWatchTogetherState((prev) =>
              prev ? { ...prev, timestamp: packet.timestamp } : null,
            );
          }
        }
      } catch (err) {
        console.error("[useWatchTogether] Error parsing UDP packet:", err);
      }
    };

    if (typeof room.on !== "function") {
      return;
    }

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room, playerRef]);

  // 4. UDP Publisher for low latency
  const publishUDPAction = async (
    action: "play" | "pause" | "seek",
    timestamp: number,
  ) => {
    if (!room || !room.localParticipant) return;
    try {
      const payload = JSON.stringify({
        type: "watch-together",
        action,
        timestamp,
        updatedAt: Date.now(),
      });
      const bytes = stringToUint8Array(payload);
      await room.localParticipant.publishData(bytes, { reliable: false });
      console.log(
        `[useWatchTogether] UDP action published: ${action} at ${timestamp}`,
      );
    } catch (err) {
      console.error("[useWatchTogether] Error publishing UDP action:", err);
    }
  };

  // 5. REST & Local control actions
  const startSession = async (url: string) => {
    if (!roomUUID) return;
    setLoading(true);
    try {
      // @ts-ignore
      const res = await gateway.watchTogether.start(roomUUID, url);
      if (res.success) {
        try {
          // @ts-ignore
          await gateway.watchTogether.pause(roomUUID, 0);
        } catch (e) {
          // Ignore
        }
        setWatchTogetherState(res.data);
      }
    } catch (err) {
      console.error("[useWatchTogether] Error starting session:", err);
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!roomUUID) return;
    setLoading(true);
    try {
      // @ts-ignore
      const res = await gateway.watchTogether.stop(roomUUID);
      if (res.success) {
        setWatchTogetherState(null);
      }
    } catch (err) {
      console.error("[useWatchTogether] Error stopping session:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerPlay = async () => {
    if (!roomUUID || !watchTogetherState) return;
    const time = localCurrentTime.current;
    isRemoteAction.current = true;
    localStatus.current = "playing";
    setWatchTogetherState((prev) =>
      prev ? { ...prev, status: "playing", timestamp: time } : null,
    );
    playerRef.current?.play();

    // Broadcast instantly via UDP for near-zero latency
    await publishUDPAction("play", time);

    try {
      // @ts-ignore
      await gateway.watchTogether.play(roomUUID, time);
    } catch (err) {
      console.error("[useWatchTogether] Error playing video on backend:", err);
    }
  };

  const triggerPause = async () => {
    if (!roomUUID || !watchTogetherState) return;
    const time = localCurrentTime.current;
    isRemoteAction.current = true;
    localStatus.current = "paused";
    setWatchTogetherState((prev) =>
      prev ? { ...prev, status: "paused", timestamp: time } : null,
    );
    playerRef.current?.pause();

    // Broadcast instantly via UDP for near-zero latency
    await publishUDPAction("pause", time);

    try {
      // @ts-ignore
      await gateway.watchTogether.pause(roomUUID, time);
    } catch (err) {
      console.error("[useWatchTogether] Error pausing video on backend:", err);
    }
  };

  const triggerSeek = async (time: number) => {
    if (!roomUUID || !watchTogetherState) return;

    // Broadcast instantly via UDP for near-zero latency
    await publishUDPAction("seek", time);

    try {
      // @ts-ignore
      await gateway.watchTogether.seek(roomUUID, time);
    } catch (err) {
      console.error("[useWatchTogether] Error seeking video on backend:", err);
    }
  };

  // 6. Player Event callbacks (bridges visual player events into the hook logic)
  const onPlayerReady = () => {
    console.log("[useWatchTogether] Local player ready");
    if (watchTogetherState) {
      isRemoteAction.current = true;
      if (watchTogetherState.status === "playing") {
        const startSecs =
          watchTogetherState.timestamp +
          getDriftSeconds(watchTogetherState.updatedAt);
        playerRef.current?.seek(startSecs);
        playerRef.current?.play();
      } else {
        playerRef.current?.seek(watchTogetherState.timestamp);
        playerRef.current?.pause();
      }
    }
  };

  const onPlayerStateChange = (
    state: "playing" | "paused" | "ended" | "buffering" | "unknown",
  ) => {
    console.log("[useWatchTogether] Local player state change:", state);

    // Ignore updates triggered remotely to avoid circular events
    if (isRemoteAction.current) {
      isRemoteAction.current = false;
      return;
    }

    if (state === "playing") {
      triggerPlay();
    } else if (state === "paused") {
      triggerPause();
    }
  };

  const onPlayerTimeUpdate = (time: number, totalDuration: number) => {
    localCurrentTime.current = time;
    setCurrentTime(time);
    if (totalDuration > 0) {
      setDuration(totalDuration);
    }
  };

  const parsedVideo = watchTogetherState
    ? parseVideoUrl(watchTogetherState.url)
    : { type: null };

  return {
    watchTogetherState,
    parsedVideo,
    currentTime,
    duration,
    loading,
    startSession,
    stopSession,
    triggerPlay,
    triggerPause,
    triggerSeek,
    onPlayerReady,
    onPlayerStateChange,
    onPlayerTimeUpdate,
  };
};
