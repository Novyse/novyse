import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, Dimensions } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';

let RTCView;
if (Platform.OS === 'web') {
  RTCView = require('react-native-webrtc-web-shim').RTCView;
} else {
  RTCView = require('react-native-webrtc').RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 4;

const VocalMembersLayout = ({ profiles, WebRTC }) => {
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

  // Calcolo ottimizzato del layout
  const calculateLayout = useCallback(() => {
    if (
      !containerDimensions.width ||
      !containerDimensions.height ||
      profiles.length === 0
    ) {
      return { numColumns: 0, rectWidth: 0, rectHeight: 0, margin: MARGIN };
    }

    const { width, height } = containerDimensions;
    const isPortrait = height > width; // Determina l'orientamento

    let numColumns, numRows;

    // Logica per l'orientamento verticale (portrait)
    if (isPortrait && profiles.length <= 2) {
      // Per 1 o 2 utenti in verticale, usa una colonna (uno sopra l'altro)
      numColumns = 1;
      numRows = profiles.length;
    } else {
      // Per altri casi, usa un layout bilanciato
      numColumns = Math.ceil(Math.sqrt(profiles.length));
      numRows = Math.ceil(profiles.length / numColumns);
      // In portrait, se ci sono poche righe, riduci il numero di colonne per sfruttare l'altezza
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(profiles.length / numColumns);
      }
    }

    // Calcola lo spazio disponibile (tenendo conto di margini)
    const availableWidth = width - (numColumns + 1) * MARGIN;
    const availableHeight = height - (numRows + 1) * MARGIN;

    // Calcola la larghezza e altezza dei rettangoli rispettando il rapporto 16:9
    const maxRectWidth = availableWidth / numColumns;
    const maxRectHeight = availableHeight / numRows;
    const rectWidthByHeight = maxRectHeight * ASPECT_RATIO; // Larghezza basata su altezza
    const rectHeightByWidth = maxRectWidth * (1 / ASPECT_RATIO); // Altezza basata su larghezza

    // Scegli la dimensione che rispetta il rapporto e massimizza lo spazio
    let rectWidth, rectHeight;
    if (rectWidthByHeight <= maxRectWidth) {
      rectHeight = maxRectHeight;
      rectWidth = rectHeight * ASPECT_RATIO;
    } else {
      rectWidth = maxRectWidth;
      rectHeight = rectWidth * (1 / ASPECT_RATIO);
    }

    return { numColumns, rectWidth, rectHeight, margin: MARGIN };
  }, [containerDimensions, profiles.length]);

  const { rectWidth, rectHeight, margin } = calculateLayout();

  const renderProfile = (profile) => (
    <Pressable
      key={profile.from}
      style={[
        styles.profile,
        {
          width: rectWidth,
          height: rectHeight,
          margin: margin / 2,
        },
      ]}
    >
      <View style={styles.videoContainer}>
        {profile.from === WebRTC.myId && WebRTC.localStream ? (
          Platform.OS === 'web' ? (
            <>
              <RTCView
                stream={WebRTC.localStream}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          ) : (
            <>
              <RTCView
                streamURL={WebRTC.localStream.toURL()}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          )
        ) : WebRTC.remoteStreams[profile.from] ? (
          Platform.OS === 'web' ? (
            <>
              <RTCView
                stream={WebRTC.remoteStreams[profile.from]}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          ) : (
            <>
              <RTCView
                streamURL={WebRTC.remoteStreams[profile.from].toURL()}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          )
        ) : (
          <Text style={styles.profileText}>{profile.handle}</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[styles.grid, { width: containerDimensions.width }]}>
        {profiles.length > 0 ? (
          profiles.map(renderProfile)
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  profile: {
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 10,
  },
  profileText: {
    color: 'white',
    fontSize: 16,
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 5,
    borderRadius: 5,
  },
  emptyChatText: {
    color: 'white',
    fontSize: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 8,
    borderRadius: 8,
  },
});

export default VocalMembersLayout;