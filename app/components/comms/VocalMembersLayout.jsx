import React, { useState, useCallback, useContext, useEffect } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserCard from "./UserCard";

import methods from "../../utils/webrtc/methods";
const { get, check, self } = methods;

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

const VocalMembersLayout = ({ commsData = {}, activeStreams = {} }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const { theme } = useContext(ThemeContext);

  // ---- Pinning State ----
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
  }, [commsData]);

  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []); // Funzione per pinnare/unpinnare un utente
  const handlePinUser = useCallback(
    (userId) => {
      // Controlla se l'utente è nella chat vocale
      if (!check.isInComms()) {
        console.info("Non puoi pinnare utenti se non sei nella chat vocale");
        return;
      }

      setIsTogglingPin(true);
      console.debug(
        `Toggling pin for user ${userId}, current pinned: ${pinnedUserId}`
      );

      // Use pin utils to toggle pin state
      const success = self.togglePin(userId);
      if (!success) {
        console.warn(`Failed to toggle pin for user ${userId}`);
      } else {
        // Update local state to reflect the change immediately
        const newPinnedUser = get.pinnedUser();
        console.info(
          `Pin toggle successful, new pinned user: ${newPinnedUser}`
        );
        setPinnedUserId(newPinnedUser);
      }
    },
    [isTogglingPin, pinnedUserId]
  );

  // ---- Pinning State ----

  // ---- LAYOUT CALCULATION ----

  // Calcolo ottimizzato del layout considerando anche le screen share
  const calculateLayout = useCallback(() => {
    // Se c'è un utente pinnato, calcola layout per un singolo elemento
    if (pinnedUserId) {
      if (!containerDimensions.width || !containerDimensions.height) {
        return { numColumns: 1, rectWidth: 0, rectHeight: 0, margin: MARGIN };
      }

      const { width, height } = containerDimensions;
      const availableWidth = width - 2 * MARGIN;
      const availableHeight = height - 2 * MARGIN;

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

    let totalElements = Object.keys(commsData).length;

    // Conta anche le screen shares
    Object.values(commsData).forEach((userData) => {
      if (
        userData.activeScreenShares &&
        userData.activeScreenShares.length > 0
      ) {
        totalElements += userData.activeScreenShares.length;
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
    // Migliorata la rilevazione di schermi piccoli
    const isSmallScreen = width < 700 || Platform.OS === "android";

    let numColumns, numRows;

    // Caso speciale: un solo utente (stesso comportamento del pinned)
    if (totalElements === 1) {
      const availableWidth = width - 2 * MARGIN;
      const availableHeight = height - 2 * MARGIN;

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

    // Logica per 2 utenti - sempre uno sopra l'altro per schermi piccoli
    if (totalElements === 2) {
      if (isSmallScreen) {
        // Schermi piccoli: sempre uno sopra l'altro
        numColumns = 1;
        numRows = 2;
      } else {
        // Schermi grandi: comportamento precedente
        if (isPortrait) {
          numColumns = 1;
          numRows = 2;
        } else {
          numColumns = 2;
          numRows = 1;
        }
      }
    }
    // Logica migliorata per schermi piccoli con più elementi
    else if (isSmallScreen) {
      if (totalElements <= 4) {
        // Per 3-4 elementi su schermi piccoli, preferisci layout verticali
        if (totalElements === 3) {
          numColumns = isPortrait ? 1 : 2;
          numRows = isPortrait ? 3 : 2;
        } else {
          // 4 elementi
          numColumns = 2;
          numRows = 2;
        }
      } else {
        // Per più di 4 elementi, usa un layout più compatto
        numColumns = isPortrait ? 2 : 3;
        numRows = Math.ceil(totalElements / numColumns);
      }
    }
    // Logica per l'orientamento verticale (portrait) con più di 2 elementi su schermi grandi
    else if (isPortrait && totalElements <= 3) {
      numColumns = 1;
      numRows = totalElements;
    } else {
      // Per altri casi (schermi grandi), usa un layout bilanciato
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

    // Dimensioni minime più adatte per schermi piccoli
    const minWidth = isSmallScreen ? 80 : 50;
    const minHeight = isSmallScreen ? 80 / ASPECT_RATIO : 50 / ASPECT_RATIO;

    rectWidth = Math.max(minWidth, rectWidth * WIDTH_MULTIPLYER);
    rectHeight = Math.max(minHeight, rectHeight * HEIGHT_MULTIPLYER);
    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, commsData, pinnedUserId, activeStreams]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();

  // ---- LAYOUT CALCULATION ----

  const renderRectangle = (
    participantUUID,
    streamUUID,
    isSpeaking,
    handle,
    isScreenShare,
    stream
  ) => {
    return (
      <UserCard
        streamUUID={streamUUID}
        isLocal={participantUUID === get.myPartecipantId()}
        isSpeaking={isSpeaking}
        width={rectWidth}
        height={rectHeight}
        margin={margin}
        handle={handle}
        isScreenShare={isScreenShare}
        stream={stream}
        isPinned={
          pinnedUserId === (isScreenShare ? streamUUID : participantUUID)
        }
        onPin={() =>
          handlePinUser(isScreenShare ? streamUUID : participantUUID)
        }
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
        {Object.keys(commsData).length > 0 ? (
          <>
            {console.log("comms data: ", commsData, "activeStreams: ", activeStreams)}
            {Object.entries(commsData).map(([participantUUID, commData]) => {
              const components = [];

              // Estrae i dati richiesti del partecipante
              const handle = commData.userData?.handle;
              const isSpeaking = commData.userData?.isSpeaking;

              if (!activeStreams) {
                activeStreams = {};
              }

              const userActiveStream = activeStreams[participantUUID] || {};
              let mainStream = null;

              if (Object.keys(userActiveStream).length > 0) {
                const streamKeys = Object.keys(userActiveStream);
                const firstStreamKey = streamKeys[0];

                if (firstStreamKey) {
                  mainStream = userActiveStream[firstStreamKey];
                }
              }

              // Main profile object - solo se non c'è pin o se questo è quello pinnato
              if (!pinnedUserId || pinnedUserId === participantUUID) {
                components.push(
                  <View key={`main-${participantUUID}`}>
                    {renderRectangle(
                      participantUUID,
                      participantUUID,
                      isSpeaking,
                      handle,
                      false,
                      mainStream
                    )}
                  </View>
                );
              }

              // Estrae gli stream UIDs dagli activeScreenShares
              const streamUIDs = commData.activeScreenShares;

              if (streamUIDs && streamUIDs.length > 0) {
                streamUIDs.forEach((streamUUID) => {
                  if (!pinnedUserId || pinnedUserId === streamUUID) {
                    const screenShareStream =
                      userActiveStream[streamUUID] || null;

                    components.push(
                      <View
                        key={`screenShare-${participantUUID}-${streamUUID}`}
                      >
                        {renderRectangle(
                          participantUUID,
                          streamUUID,
                          false,
                          handle,
                          true,
                          screenShareStream
                        )}
                      </View>
                    );
                  }
                });
              }
              return components;
            })}
          </>
        ) : (
          <Text style={styles.emptyChatText}>Non c'è nessuno qui</Text>
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
