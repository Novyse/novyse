import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';
import UserProfileAvatar from './UserProfileAvatar';

let RTCView;
if (Platform.OS === 'web') {
  RTCView = require('react-native-webrtc-web-shim').RTCView;
} else {
  RTCView = require('react-native-webrtc').RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;
const MARGIN = 4;
// Memorizzazione dello stato speaking per evitare re-render continui
const speakingCache = new Map();

// CSS Animation template per web
const PULSE_ANIMATION = `
  @keyframes pulse {
    0% {
      box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6);
      border-color: #00FF00;
    }
    50% {
      box-shadow: inset 0 0 25px rgba(0, 255, 0, 1), 0 0 30px rgba(0, 255, 0, 0.8);
      border-color: #22FF22;
    }
    100% {
      box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6);
      border-color: #00FF00;
    }
  }
`;

const VocalMembersLayout = ({ profiles, WebRTC, streamUpdateTrigger }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [forceUpdate, setForceUpdate] = useState(0);
  const { theme } = useContext(ThemeContext);
  // useRef per tracciare i render e prevenire re-render frequenti
  const renderedVideos = useRef(new Map());

  // Add CSS animation for web platform - only once per session
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Check if animation already exists
      const existingStyle = document.getElementById('vocal-speaking-animation');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'vocal-speaking-animation';
        style.textContent = PULSE_ANIMATION;
        document.head.appendChild(style);
      }
    }
  }, []); // Solo una volta per componente

  // Handler per il layout
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);

  // Ascolta i cambiamenti nello stream per forzare re-render
  useEffect(() => {
    const handleStreamUpdate = () => {
      setForceUpdate(prev => prev + 1);
    };

    if (WebRTC) {
      WebRTC.onStreamUpdate = handleStreamUpdate;
    }

    return () => {
      if (WebRTC && WebRTC.onStreamUpdate) {
        WebRTC.onStreamUpdate = null;
      }
    };
  }, [WebRTC]);

  // Aggiorna quando streamUpdateTrigger cambia (da VocalContent)
  useEffect(() => {
    if (streamUpdateTrigger > 0) {
      setForceUpdate(prev => prev + 1);
    }
  }, [streamUpdateTrigger]);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [profiles]);

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

  const { rectWidth, rectHeight, margin } = calculateLayout();  const renderProfile = (profile) => {
    // Determina se c'è un video attivo per questo profilo
    let hasVideo = false;
    let activeStream = null;

    if (profile.from === WebRTC?.myId && WebRTC?.localStream) {
      const videoTracks = WebRTC.localStream.getVideoTracks();
      const hasActiveTracks = videoTracks.length > 0 && videoTracks.some(track => track.enabled && track.readyState === 'live');
      
      if (hasActiveTracks) {
        hasVideo = true;
        activeStream = WebRTC.localStream;
      }
    } else if (WebRTC?.remoteStreams?.[profile.from]) {
      const videoTracks = WebRTC.remoteStreams[profile.from].getVideoTracks();
      const hasActiveTracks = videoTracks.length > 0 && videoTracks.some(track => track.enabled && track.readyState === 'live');

      if (hasActiveTracks) {
        hasVideo = true;
        activeStream = WebRTC.remoteStreams[profile.from];
      }
    }    // Check if user is currently speaking (dopo aver determinato video/stream)
    // Usa lo speakingCache per evitare re-render non necessari
    const currentSpeakingState = WebRTC?.isUserSpeaking ? WebRTC.isUserSpeaking(profile.from) : false;
    let isSpeaking = currentSpeakingState;
    
    // Usa una cache per evitare re-render inutili del video quando lo stato cambia
    if (hasVideo && activeStream) {
      const prevState = speakingCache.get(profile.from);
      if (prevState !== undefined && prevState === currentSpeakingState) {
        // Nessun cambiamento, usa lo stesso stato
        isSpeaking = prevState;
      } else {
        // Aggiorna la cache solo quando lo stato cambia realmente
        speakingCache.set(profile.from, currentSpeakingState);
      }
    } else {
      // Per i non-video, aggiorna sempre lo stato
      speakingCache.set(profile.from, currentSpeakingState);
    }    // Nota: rimuoviamo l'ottimizzazione che restituiva null perché causa errori di rendering
    const speakingKey = `${profile.from}-${isSpeaking}`;
    if (!speakingCache.has(speakingKey)) {
      speakingCache.set(speakingKey, isSpeaking);
    }return (
      <Pressable
        key={`${profile.from}-${hasVideo}-${activeStream ? 'stream' : 'no-stream'}`}
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
          {hasVideo && activeStream ? (
            <View style={styles.videoOverlay}>
              {Platform.OS === 'web' ? (                <RTCView
                  // Usa una key stabile per evitare re-render non necessari
                  key={`video-${profile.from}-permanent`}
                  stream={activeStream}
                  style={styles.videoStyle}
                  muted={true}
                  objectFit="cover" // Assicurati che il video sia sempre correttamente dimensionato
                />
              ) : (
                <RTCView
                  // Usa una key stabile per evitare re-render non necessari
                  key={`video-${profile.from}-permanent`}
                  streamURL={activeStream.toURL()}
                  style={styles.videoStyle}
                  muted={true}
                  objectFit="cover" // Assicurati che il video sia sempre correttamente dimensionato
                />
              )}
              <Text style={styles.profileText}>{profile.handle}</Text>
            </View>
          ) : (
            <UserProfileAvatar
              key={`avatar-${profile.from}-stable`}
              userHandle={profile.handle}
              profileImageUri={profile.profileImage || null}
              containerWidth={rectWidth}
              containerHeight={rectHeight}
            />
          )}          {/* Speaking border overlay - usa un componente separato permanente */}
          <View 
            key={`speaking-indicator-${profile.from}`}
            style={[
              styles.speakingOverlayContainer,
              isSpeaking && styles.speakingOverlay,              Platform.OS === 'web' && isSpeaking && { 
                animationName: 'pulse',
                animationDuration: '1.5s',
                animationIterationCount: 'infinite'
              }
            ]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[styles.grid, { width: containerDimensions.width }]}>
        {profiles.length > 0 ? (
          profiles.map(renderProfile)
        ) : (
          <View style={styles.emptyChatContainer}>
            <Text style={styles.emptyChatText}>Nessun utente nella chat</Text>
          </View>
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
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  speakingOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    pointerEvents: 'none',
    zIndex: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 0,
  },
  speakingOverlay: {
    borderWidth: 2,
    borderColor: '#00FF00',
    opacity: 1,
    ...(Platform.OS === 'web' && {
      boxShadow: 'inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6)',
    }),
    ...(Platform.OS === 'ios' && {
      shadowColor: '#00FF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    }),
    ...(Platform.OS === 'android' && {
      elevation: 10,
      shadowColor: '#00FF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    }),
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  videoOverlay: {
    flex: 1,
  },
  videoStyle: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    objectFit: 'cover',
    resizeMode: 'cover',
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
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
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