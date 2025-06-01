import React, { useState, useCallback, useContext, useEffect } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserCard from "./UserCard";

import utils from "../../utils/webrtc/utils";
const { get, check, pin } = utils;

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 10;
const HEIGHT_MULTIPLYER = 1;
const WIDTH_MULTIPLYER = 1;

const VocalMembersLayout = ({
  profiles,
  activeStreams = {},
  videoStreamKeys = {},
}) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  // State to track pin changes
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [isTogglingPin, setIsTogglingPin] = useState(false);

  // Sync pin state from WebRTC manager
  useEffect(() => {
    const currentPinnedUser = get.pinnedUser();
    if (currentPinnedUser !== pinnedUserId) {
      setPinnedUserId(currentPinnedUser);
    }
  }, [pinnedUserId]);

  // Update pin state when profiles change (new users join/leave)
  useEffect(() => {
    const currentPinnedUser = get.pinnedUser();
    setPinnedUserId(currentPinnedUser);
  }, [profiles]);

  const { theme } = useContext(ThemeContext);

  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []); // Funzione per pinnare/unpinnare un utente
  const handlePinUser = useCallback(
    (userId) => {
      
      // Controlla se l'utente è nella chat vocale
      if (!check.isInComms()) {
        console.log("Non puoi pinnare utenti se non sei nella chat vocale");
        return;
      }

      setIsTogglingPin(true);
      console.log(
        `Toggling pin for user ${userId}, current pinned: ${pinnedUserId}`
      );

      // Use pin utils to toggle pin state
      const success = pin.toggle(userId);
      if (!success) {
        console.warn(`Failed to toggle pin for user ${userId}`);
      } else {
        // Update local state to reflect the change immediately
        const newPinnedUser = get.pinnedUser();
        console.log(`Pin toggle successful, new pinned user: ${newPinnedUser}`);
        setPinnedUserId(newPinnedUser);
      }

      // Reset the toggle flag after a short delay to prevent rapid clicks
      setTimeout(() => {
        setIsTogglingPin(false);
      }, 200);
    },
    [isTogglingPin, pinnedUserId]
  );

  // Calcolo ottimizzato del layout considerando anche le screen share
  const calculateLayout = useCallback(() => {
    // Se c'è un utente pinnato, calcola layout per un singolo elemento
    if (pinnedUserId) {
      if (!containerDimensions.width || !containerDimensions.height) {
        return { numColumns: 1, rectWidth: 0, rectHeight: 0, margin: MARGIN };
      }

      const { width, height } = containerDimensions;
      const availableWidth = width - MARGIN;
      const availableHeight = height - MARGIN;

      // Calcola dimensioni per occupare tutto lo spazio disponibile rispettando il rapporto 16:9
      const rectWidthByHeight = availableHeight * ASPECT_RATIO;
      const rectHeightByWidth = availableWidth * (1 / ASPECT_RATIO);

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

    // Calcola il numero totale di elementi da visualizzare (utenti + screen shares)
    let totalElements = profiles.length;
    profiles.forEach((profile) => {
      if (
        profile.active_screen_share &&
        Array.isArray(profile.active_screen_share)
      ) {
        totalElements += profile.active_screen_share.length;
      }
    });

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
    // Logica specifica per 2 persone
    if (totalElements === 2) {
      // Su schermi piccoli (mobile) o Android, metti 2 persone in colonna
      if (Platform.OS === "android" || isPortrait || width < 600) {
        numColumns = 1;
        numRows = 2;
      } else {
        numColumns = 2;
        numRows = 1;
      }
    }
    // Logica per l'orientamento verticale (portrait) con più di 2 elementi
    else if (isPortrait && totalElements <= 3) {
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
    // Calcola lo spazio disponibile con margini generosi per evitare overflow
    const availableWidth = width - MARGIN;
    const availableHeight = height - MARGIN;

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO;
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO);

    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {
      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }
    rectWidth = Math.max(50, rectWidth * WIDTH_MULTIPLYER);
    rectHeight = Math.max(50 / ASPECT_RATIO, rectHeight * HEIGHT_MULTIPLYER);
    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, profiles, pinnedUserId]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();

  // Render function for screen shares
  const renderScreenShare = (profile, shareId) => {
    // Se c'è un utente pinnato e non è questo screen share, non renderizzarlo
    if (pinnedUserId && pinnedUserId !== shareId) {
      return null;
    }

    const activeStream = activeStreams[shareId];

    // Crea un profilo temporaneo per lo screen share
    const screenShareProfile = {
      ...profile,
      from: shareId,
      handle: profile.handle || profile.from || "Unknown",
    };

    return (
      <UserCard
        key={shareId}
        profile={screenShareProfile}
        activeStream={activeStream}
        isSpeaking={false} // Screen share non ha speaking status
        width={rectWidth}
        height={rectHeight}
        margin={margin}
        isScreenShare={true}
        videoStreamKey={videoStreamKeys[shareId]}
        isPinned={pinnedUserId === shareId}
        onPin={() => handlePinUser(shareId)}
        pinDisabled={!check.isInComms()} // Disabilita il pin se non sei in comms
      />
    );
  };

  // Render function for user profiles
  const renderProfile = (profile) => {
    const participantId = profile.from;
    // Se c'è un utente pinnato e non è questo utente, non renderizzarlo
    if (pinnedUserId && pinnedUserId !== participantId) {
      return null;
    }

    const activeStream = activeStreams[participantId];
    const isSpeaking = profile.is_speaking || false; // Usa il parametro is_speaking dal profilo

    return (
      <UserCard
        key={participantId}
        profile={profile}
        activeStream={activeStream}
        isSpeaking={isSpeaking}
        width={rectWidth}
        height={rectHeight}
        margin={margin}
        isScreenShare={false}
        videoStreamKey={videoStreamKeys[participantId]}
        isPinned={pinnedUserId === participantId}
        onPin={() => handlePinUser(participantId)}
        pinDisabled={!check.isInComms()} // Disabilita il pin se non sei in comms
      />
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View
        style={[
          styles.grid,
          {
            width: containerDimensions.width,
          },
        ]}
      >
        {profiles.length > 0 ? (
          <>
            {profiles.map(renderProfile)}
            {profiles.map((profile) => {
              if (
                profile.active_screen_share &&
                Array.isArray(profile.active_screen_share)
              ) {
                return profile.active_screen_share.map((shareId) =>
                  renderScreenShare(profile, shareId)
                );
              }
              return null;
            })}
          </>
        ) : (
          <Text style={styles.emptyChatText}>Nessun utente nella chat</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: Platform.OS === "web" ? "center" : "space-around", // Su web ora centrato
    alignItems: "flex-start",
    padding: 0, // Nessun padding per la griglia
    rowGap: 0,
    columnGap: 0,
  },
  emptyChatText: {
    color: "white",
    fontSize: 20,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: 8,
    margin: 0,
    borderRadius: 8,
    alignContent: "center",
  },
});

export default VocalMembersLayout;
