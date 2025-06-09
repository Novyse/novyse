import React, { useState, useCallback, useContext, useEffect } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserCard from "./UserCard";

import methods from "../../utils/webrtc/methods";
const { get, check, pin, handle } = methods;

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 4;
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

    // Count screen shares from activeStreams
    const screenShareCount = Object.keys(activeStreams).filter(
      (streamUUID) => activeStreams[streamUUID].streamType === "screenshare"
    ).length;

    // Calcola il numero totale di elementi da visualizzare (utenti + screen shares)
    let totalElements = profiles.length + screenShareCount;

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
      // Su schermi piccoli (mobile) o portrait, metti 2 persone in colonna
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
      // Per altri casi, usa un layout bilanciato
      numColumns = Math.ceil(Math.sqrt(totalElements));
      numRows = Math.ceil(totalElements / numColumns);
      // In portrait, se ci sono poche righe, riduci il numero di colonne per sfruttare l'altezza
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(totalElements / numColumns);
      }
    }

    // Calcola lo spazio disponibile (tenendo conto di margini)
    const availableWidth = width - (numColumns + 1) * MARGIN;
    const availableHeight = height - (numRows + 1) * MARGIN;

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO;
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO);

    // Scegli la dimensione che rispetta il rapporto e massimizza lo spazio
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
  }, [containerDimensions, profiles, pinnedUserId, activeStreams]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout(); // Render function for screen shares
  const renderScreenShare = (streamKey, streamUUID, streamData) => {
    // Debug logging for screen share rendering
    console.log(`[VocalMembersLayout] renderScreenShare called with:`, {
      streamKey, // Should be the user's original from ID
      streamUUID, // Should be the processed screen share UUID
      streamKeyLength: streamKey ? streamKey.length : 0,
      streamUUIDLength: streamUUID ? streamUUID.length : 0,
      streamKeyType: typeof streamKey,
      streamUUIDType: typeof streamUUID,
      hasStreamData: !!streamData,
      streamType: streamData?.streamType,
      hasUserData: !!streamData?.userData,
      userDataFrom: streamData?.userData?.from,
      areKeysEqual: streamKey === streamUUID, // This should be FALSE
    }); // Se c'è un utente pinnato e non è questo screen share, non renderizzarlo
    if (pinnedUserId && pinnedUserId !== streamUUID) {
      return null;
    }

    // Get user info from streamData.userData
    const userProfile = streamData.userData;
    if (!userProfile) {
      console.warn(
        `[VocalMembersLayout] No userData found for screen share ${streamKey}`
      );
      return null;
    } // Create a screen share profile
    const screenShareProfile = {
      ...userProfile,
      from: streamKey, // Use the original user ID (from) as the identifier
      streamUUID: streamUUID, // Keep the processed streamUUID
      handle: userProfile?.handle
        ? `${userProfile.handle} (Screen)`
        : `Screen Share`,
    };

    return (
      <UserCard
        streamUUID={streamUUID} // Pass the processed streamUUID
        profile={screenShareProfile}
        isLocal={userProfile.from === get.myPartecipantId()}
        activeStream={streamData}
        isSpeaking={false} // Screen share non ha speaking status
        width={rectWidth}
        height={rectHeight}
        margin={margin}
        isScreenShare={true}
        videoStreamKey={videoStreamKeys[streamUUID]} // Use streamUUID for video key
        isPinned={pinnedUserId === streamUUID} // Use streamUUID for pin check
        onPin={() => handlePinUser(streamUUID)} // Use streamUUID for pin action
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
        streamUUID={participantId}
        profile={profile}
        isLocal={participantId === get.myPartecipantId()}
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
        {profiles.length > 0 ||
        Object.values(activeStreams).some(
          (streamData) => streamData.streamType === "screenshare"
        ) ? (
          <>
            {profiles.map((profile) => (
              <React.Fragment key={`profile-${profile.from}`}>
                {renderProfile(profile)}
              </React.Fragment>
            ))}
            {(() => {
              // Debug logging for activeStreams
              const screenShareEntries = Object.entries(activeStreams).filter(
                ([streamUUID, streamData]) =>
                  streamData.streamType === "screenshare"
              );

              console.log(`[VocalMembersLayout] Screen share entries:`, {
                totalActiveStreams: Object.keys(activeStreams).length,
                screenShareCount: screenShareEntries.length,
                allStreamKeys: Object.keys(activeStreams),
                screenShareEntries: screenShareEntries.map(([key, data]) => ({
                  key,
                  keyLength: key ? key.length : 0,
                  keyType: typeof key,
                  streamType: data?.streamType,
                  hasUserData: !!data?.userData,
                })),
              });
              return screenShareEntries.map(([streamUUID, streamData]) => {
                // Use streamUUID as the unique key for screen shares, not the user's from ID
                return (
                  <React.Fragment key={`screenshare-${streamUUID}`}>
                    {renderScreenShare(
                      streamData.userData?.from,
                      streamUUID,
                      streamData
                    )}
                  </React.Fragment>
                );
              });
            })()}
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
    justifyContent: "center",
    alignContent: "center",
    padding: 0,
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
