import { useCallback, useEffect } from "react";
import { StatusBar } from "react-native";

import { useScreen } from "@/src/context/ScreenContext";
import { useCommsContext } from "@/src/context/CommsContext";

import { Track } from "livekit-client";
import Platform from "@/src/utils/device/type";
import * as ScreenOrientation from "expo-screen-orientation";

const useLayout = (room, participants, containerDimensions, containerRef) => {
  // Costants
  const ASPECT_RATIO = 16 / 9;
  const MARGIN = 4;
  const HEIGHT_MULTIPLYER = 1;
  const WIDTH_MULTIPLYER = 1;

  const { isSmallScreen } = useScreen();
  const isMobile = Platform === "mobile";
  const {
    pinnedStreamUUID,
    setPinnedStreamUUID,
    fullscreenStreamUUID,
    setFullScreenStreamUUID,
    streams,
    roomMetadata: contextMetadata,
  } = useCommsContext();

  const metadata = contextMetadata || room?.metadata;

  const handlePin = useCallback(
    (streamUUID) => {
      setPinnedStreamUUID((prev) => (prev === streamUUID ? null : streamUUID));
    },
    [setPinnedStreamUUID],
  );

  const handleFullScreen = useCallback(
    (streamUUID) => {
      setFullScreenStreamUUID((prev) =>
        prev === streamUUID ? null : streamUUID,
      );
    },
    [setFullScreenStreamUUID],
  );

  // Handle fullscreen side–effects (web and mobile)
  useEffect(() => {
    if (fullscreenStreamUUID) {
      if (!isMobile) {
        // request system fullscreen on web on specific container ref to hide headers
        const element =
          (containerRef && containerRef.current) || document.documentElement;
        element.requestFullscreen().catch((err) => {
          console.error("Error entering fullscreen:", err);
        });
      } else {
        // hide the status bar on native when a stream is in fullscreen
        StatusBar.setHidden(true, "fade");
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        ).catch((err) => {
          console.error("Error locking landscape orientation:", err);
        });
      }
    } else {
      if (!isMobile) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {
            console.error("Error exiting fullscreen:", err);
          });
        }
      } else {
        StatusBar.setHidden(false, "fade");
        ScreenOrientation.unlockAsync().catch((err) => {
          console.error("Error unlocking orientation:", err);
        });
      }
    }
  }, [fullscreenStreamUUID, isMobile]);

  // Listen for fullscreen changes to reset state when user presses ESC (only web)
  useEffect(() => {
    if (!isMobile) {
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement && fullscreenStreamUUID) {
          setFullScreenStreamUUID(null);
        }
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () =>
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
    }
  }, [fullscreenStreamUUID, setFullScreenStreamUUID]);

  // ---- LAYOUT CALCULATION ----

  const getLayoutItems = useCallback(() => {
    const items = [];

    // Add Watch Together card if active in room metadata
    try {
      const roomMetadata = metadata ? JSON.parse(metadata) : null;
      if (roomMetadata?.watchTogether?.url) {
        items.push({
          deviceUUID: "watch-together",
          streamUUID: "watch-together",
          name: "Watch Together",
          metadata: roomMetadata.watchTogether,
          isScreenShare: false,
          isLocal: false,
          stream: null,
          participant: null,
        });
      }
    } catch (e) {
      // Ignore parse errors
    }

    if (!participants || !Array.isArray(participants)) return items;

    participants.forEach((participant) => {
      const deviceUUID = participant.identity;
      const name = participant.name;
      const metadata =
        participant.metadata || participant.participantInfo.metadata || {};

      const isLocal = participant === room?.localParticipant;
      const videoStream = streams[deviceUUID];
      items.push({
        type: "user",
        deviceUUID,
        streamUUID: deviceUUID,
        name,
        metadata,
        stream: videoStream,
        participant,
        isScreenShare: false,
        isLocal,
      });

      // Screen shares
      if (participant.getTrackPublications) {
        const screenTracks = participant
          .getTrackPublications()
          .filter((tp) => tp.source === Track.Source.ScreenShare);
        screenTracks.forEach((tp) => {
          const screenStream = streams[tp.trackSid];
          items.push({
            type: "screen",
            deviceUUID,
            streamUUID: tp.trackSid,
            name: `${name} (Screen Share)`,
            metadata,
            participant,
            stream: screenStream,
            isScreenShare: true,
            isLocal,
          });
        });
      } else if (participant.tracks) {
        const screenTracks = participant.tracks.filter(
          (t) =>
            t.source === "SCREEN_SHARE" ||
            t.source === Track.Source.ScreenShare,
        );
        screenTracks.forEach((t) => {
          const screenStream = streams[t.sid];
          items.push({
            type: "screen",
            deviceUUID,
            streamUUID: t.sid,
            name: `${name} (Screen Share)`,
            metadata,
            participant,
            stream: screenStream,
            isScreenShare: true,
            isLocal,
          });
        });
      }
    });

    let filteredItems = items;
    if (pinnedStreamUUID) {
      filteredItems = items.filter(
        (item) => item.streamUUID === pinnedStreamUUID,
      );
    }

    return filteredItems;
  }, [participants, room, metadata, pinnedStreamUUID, streams]);

  const calculateLayout = useCallback(() => {
    const layoutItems = getLayoutItems();

    let totalElements = layoutItems.length;

    if (
      !containerDimensions.width ||
      !containerDimensions.height ||
      totalElements === 0
    ) {
      return { numColumns: 0, rectWidth: 0, rectHeight: 0, margin: MARGIN };
    }

    const { width, height } = containerDimensions;
    const isPortrait = height > width;

    let numColumns, numRows;

    if (totalElements === 1) {
      const availableWidth = width - 2 * MARGIN;
      const availableHeight = height - 2 * MARGIN;

      const rectWidthByHeight = availableHeight * ASPECT_RATIO;

      let rectWidth, rectHeight;
      if (rectWidthByHeight <= availableWidth) {
        rectHeight = availableHeight;
        rectWidth = rectHeight * ASPECT_RATIO;
      } else {
        rectWidth = availableWidth;
        rectHeight = rectWidth * (1 / ASPECT_RATIO);
      }

      return { numColumns: 1, rectWidth, rectHeight, margin: MARGIN };
    }

    if (totalElements === 2) {
      if (isSmallScreen) {
        numColumns = 1;
        numRows = 2;
      } else {
        if (isPortrait) {
          numColumns = 1;
          numRows = 2;
        } else {
          numColumns = 2;
          numRows = 1;
        }
      }
    } else if (isSmallScreen) {
      if (totalElements <= 4) {
        if (totalElements === 3 || totalElements === 4) {
          numColumns = 1;
          numRows = totalElements;
        }
      } else {
        numColumns = isPortrait ? 2 : 3;
        numRows = Math.ceil(totalElements / numColumns);
      }
    } else if (isPortrait && totalElements <= 3) {
      numColumns = 1;
      numRows = totalElements;
    } else {
      numColumns = Math.ceil(Math.sqrt(totalElements));
      numRows = Math.ceil(totalElements / numColumns);
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(totalElements / numColumns);
      }
    }
    const availableWidth = width - (numColumns + 1) * MARGIN;
    const availableHeight = height - (numRows + 1) * MARGIN;

    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO;

    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {
      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }

    const minWidth = isSmallScreen ? 80 : 50;
    const minHeight = isSmallScreen ? 80 / ASPECT_RATIO : 50 / ASPECT_RATIO;

    rectWidth = Math.max(minWidth, rectWidth * WIDTH_MULTIPLYER);
    rectHeight = Math.max(minHeight, rectHeight * HEIGHT_MULTIPLYER);
    return { rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, isSmallScreen, getLayoutItems]);

  const { rectWidth, rectHeight, margin } = calculateLayout();

  const layoutItems = getLayoutItems();

  return {
    layoutItems,
    rectWidth,
    rectHeight,
    margin,
    handlePin,
    handleFullScreen,
  };
};

export default useLayout;
