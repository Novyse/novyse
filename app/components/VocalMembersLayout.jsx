import React, { useState, useCallback, useContext } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import UserCard from "./UserCard";
import multiPeerWebRTCManager from "../utils/webrtcMethods";

import utils from "../utils/webrtc/utils";
const { get } = utils;

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 4;

const VocalMembersLayout = ({ profiles, activeStreams = {}, videoStreamKeys = {} }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const { theme } = useContext(ThemeContext);
  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);

  // Calcolo ottimizzato del layout considerando anche le screen share
  const calculateLayout = useCallback(() => {
    // Calcola il numero totale di elementi da visualizzare (utenti + screen shares)
    let totalElements = profiles.length;
    profiles.forEach(profile => {
      if (profile.active_screen_share && Array.isArray(profile.active_screen_share)) {
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
      // Su Android, metti 2 persone in colonna; su altre piattaforme, in riga
      if (Platform.OS === 'android') {
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
    const availableWidth = width - (MARGIN * 4); // Margine extra per evitare overflow
    const availableHeight = height - (MARGIN * 4); // Margine extra per evitare overflow

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO;
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO);

    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }
    rectWidth = Math.max(50, rectWidth * 0.9); // Riduci leggermente per evitare overflow
    rectHeight = Math.max(50 / ASPECT_RATIO, rectHeight * 0.9); // Riduci leggermente per evitare overflow

    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, profiles]);

  const { numColumns, rectWidth, rectHeight, margin } = calculateLayout();
  // Render function for screen shares
  const renderScreenShare = (profile, shareId) => {
    const activeStream = activeStreams[shareId];
    
    // Crea un profilo temporaneo per lo screen share
    const screenShareProfile = {
      ...profile,
      from: shareId,
      handle: profile.handle || profile.from || 'Unknown'
    };    return (
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
      />    );
  };  // Render function for user profiles
  const renderProfile = (profile) => {
    const participantId = profile.from;
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
      />
    );
  };
  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[
        styles.grid, 
        { 
          width: containerDimensions.width,
        }
      ]}>
        {profiles.length > 0 ? (
          <>
            {/* Render user profiles */}
            {profiles.map(renderProfile)}
            
            {/* Render screen shares */}
            {profiles.map(profile => {
              if (profile.active_screen_share && Array.isArray(profile.active_screen_share)) {
                return profile.active_screen_share.map(shareId => 
                  renderScreenShare(profile, shareId)
                );
              }
              return null;
            })}
          </>
        ) : (
          <Text style={styles.emptyChatText}>Nessun utente nella chat 😔</Text>
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
    justifyContent: Platform.OS === 'web' ? 'center' : 'space-around', // Su web ora centrato
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