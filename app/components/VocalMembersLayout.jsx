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
      box-shadow: inset 0 0 15px #00FF00, 0 0 20px #00FF00;
      border-color: #00FF00;
    }
    50% {
      box-shadow: inset 0 0 25px #22FF22, 0 0 30px #22FF22;
      border-color: #22FF22;
    }
    100% {
      box-shadow: inset 0 0 15px #00FF00, 0 0 20px #00FF00;
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

  // Funzione per ottenere tutti gli stream attivi (webcam + screen shares)
  const getAllActiveStreams = useCallback(() => {
    const streams = [];
    
    console.log('[VocalMembersLayout] Debug - WebRTC object:', {
      myId: WebRTC?.myId,
      localStream: !!WebRTC?.localStream,
      screenStreams: WebRTC?.screenStreams ? Object.keys(WebRTC.screenStreams) : [],
      remoteStreams: WebRTC?.remoteStreams ? Object.keys(WebRTC.remoteStreams) : [],
      remoteScreenStreams: WebRTC?.remoteScreenStreams ? Object.keys(WebRTC.remoteScreenStreams) : []
    });

    // Safety check: ensure WebRTC and profiles are available
    if (!WebRTC || !profiles || !Array.isArray(profiles)) {
      console.warn('[VocalMembersLayout] Missing WebRTC or profiles data');
      return streams;
    }

    // Aggiungi sempre l'utente locale (webcam principale)
    const localProfile = profiles.find(p => p && p.from === WebRTC?.myId);
    if (localProfile && WebRTC?.localStream) {
      streams.push({
        type: 'webcam',
        profile: localProfile,
        stream: WebRTC?.localStream,
        streamId: `local-webcam-${WebRTC?.myId}`,
        canClose: false, // La webcam principale non può essere chiusa
      });
    }
    
    // Aggiungi screen shares locali
    if (WebRTC?.screenStreams && localProfile) {
      Object.entries(WebRTC.screenStreams).forEach(([streamId, stream]) => {
        if (stream && stream.getVideoTracks().length > 0) { // Only add if stream has active video tracks
          streams.push({
            type: 'screenshare',
            profile: localProfile,
            stream: stream,
            streamId: `local-screen-${streamId}`,
            canClose: true,
          });
        }
      });
    }

    // Aggiungi stream remoti (webcam + screen shares)
    profiles.forEach(profile => {
      // Enhanced safety check for profile validity
      if (!profile || !profile.from || profile.from === WebRTC?.myId) {
        return; // Skip invalid profiles or own profile
      }
      
      // Webcam remota
      if (WebRTC?.remoteStreams?.[profile.from]) {
        const remoteStream = WebRTC.remoteStreams[profile.from];
        // Only add if stream has active tracks
        if (remoteStream && (remoteStream.getAudioTracks().length > 0 || remoteStream.getVideoTracks().length > 0)) {
          streams.push({
            type: 'webcam',
            profile: profile,
            stream: remoteStream,
            streamId: `remote-webcam-${profile.from}`,
            canClose: false,
          });
        }
      }

      // Screen shares remote
      if (WebRTC?.remoteScreenStreams?.[profile.from]) {
        Object.entries(WebRTC.remoteScreenStreams[profile.from]).forEach(([streamId, stream]) => {
          // Only add if stream exists and has active video tracks
          if (stream && stream.getVideoTracks().length > 0) {
            streams.push({
              type: 'screenshare',
              profile: profile,
              stream: stream,
              streamId: `remote-screen-${profile.from}-${streamId}`,
              canClose: false, // Gli stream remoti non possono essere chiusi dal client locale
            });
          }
        });
      }
    });

    console.log('[VocalMembersLayout] Total streams found:', streams.length, streams.map(s => ({ type: s.type, streamId: s.streamId, handle: s.profile?.handle })));
    
    return streams;
  }, [profiles, WebRTC, WebRTC?.screenStreams, forceUpdate]);

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
    const allStreams = getAllActiveStreams();
    const totalStreams = allStreams.length;

    if (
      !containerDimensions.width ||
      !containerDimensions.height ||
      totalStreams === 0
    ) {
      return { numColumns: 0, rectWidth: 0, rectHeight: 0, margin: MARGIN };
    }

    const { width, height } = containerDimensions;
    const isPortrait = height > width; // Determina l'orientamento

    let numColumns, numRows;

    // Logica per l'orientamento verticale (portrait)
    if (isPortrait && totalStreams <= 2) {
      // Per 1 o 2 stream in verticale, usa una colonna (uno sopra l'altro)
      numColumns = 1;
      numRows = totalStreams;
    } else {
      // Per altri casi, usa un layout bilanciato
      numColumns = Math.ceil(Math.sqrt(totalStreams));
      numRows = Math.ceil(totalStreams / numColumns);
      // In portrait, se ci sono poche righe, riduci il numero di colonne per sfruttare l'altezza
      if (isPortrait && numRows < 3 && numColumns > 1) {
        numColumns = Math.max(1, Math.floor(numColumns / 2));
        numRows = Math.ceil(totalStreams / numColumns);
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
  }, [containerDimensions, getAllActiveStreams]);

  const { rectWidth, rectHeight, margin } = calculateLayout();

  // Funzione per chiudere uno screen share locale
  const handleCloseScreenShare = (streamId) => {
    if (WebRTC?.removeScreenShareStream) {
      // Estrai l'ID vero dello stream dal streamId
      const actualStreamId = streamId.replace('local-screen-', '');
      WebRTC.removeScreenShareStream(actualStreamId);
    }
  };

  const renderStream = (streamData) => {
    // Enhanced safety check - ensure streamData exists and has required properties
    if (!streamData || !streamData.profile || !streamData.stream) {
      console.warn(`[VocalMembersLayout] Skipping invalid stream data:`, streamData);
      return null;
    }
    
    const { type, profile, stream, streamId, canClose } = streamData;
    
    // Additional safety check: if profile is undefined, skip rendering this stream
    if (!profile || !profile.handle) {
      console.warn(`[VocalMembersLayout] Skipping stream ${streamId} - profile is invalid:`, profile);
      return null;
    }
    
    let hasVideo = false;
    let activeStream = null;

    // Controlla se il stream ha video attivo
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      const hasActiveTracks = videoTracks.length > 0 && videoTracks.some(track => track.enabled && track.readyState === 'live');
      
      if (hasActiveTracks) {
        hasVideo = true;
        activeStream = stream;
      }
    }

    const currentSpeakingState = WebRTC?.isUserSpeaking ? WebRTC.isUserSpeaking(profile.from) : false;
    let isSpeaking = currentSpeakingState;
    
    if (hasVideo && activeStream) {
      const prevState = speakingCache.get(profile.from);
      if (prevState !== undefined && prevState === currentSpeakingState) {
        isSpeaking = prevState;
      } else {
        speakingCache.set(profile.from, currentSpeakingState);
      }
    } else {
      speakingCache.set(profile.from, currentSpeakingState);
    }

    const speakingKey = `${profile.from}-${isSpeaking}`;
    if (!speakingCache.has(speakingKey)) {
      speakingCache.set(speakingKey, isSpeaking);
    }

    // Determina l'etichetta da mostrare
    const getStreamLabel = () => {
      if (type === 'screenshare') {
        return `${profile.handle} (Screen)`;
      }
      return profile.handle;
    };

    return (
      <Pressable
        key={streamId}
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
              {Platform.OS === 'web' ? (
                <RTCView
                  key={`video-${streamId}`}
                  stream={activeStream}
                  style={[styles.videoStyle, { objectFit: 'cover' }]} // Fix per warning objectFit
                  muted={true}
                />
              ) : (
                <RTCView
                  key={`video-${streamId}`}
                  streamURL={activeStream.toURL()}
                  style={styles.videoStyle}
                  muted={true}
                  objectFit="cover"
                />
              )}
              <Text style={styles.profileText}>{getStreamLabel()}</Text>
              {/* Bottone di chiusura per screen shares locali */}
              {canClose && (
                <Pressable
                  style={styles.closeButton}
                  onPress={() => handleCloseScreenShare(streamId)}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <UserProfileAvatar
                key={`avatar-${streamId}`}
                userHandle={profile.handle}
                profileImageUri={profile.profileImage || null}
                containerWidth={rectWidth}
                containerHeight={rectHeight}
              />
              {/* Mostra il bottone di chiusura anche quando non c'è video per screen shares */}
              {canClose && type === 'screenshare' && (
                <Pressable
                  style={styles.closeButton}
                  onPress={() => handleCloseScreenShare(streamId)}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              )}
            </View>
          )}
          <View 
            key={`speaking-indicator-${streamId}`}
            style={[
              styles.speakingOverlayContainer,
              isSpeaking && type === 'webcam' && styles.speakingOverlay, // Solo webcam ha il speaking indicator
              Platform.OS === "web" && isSpeaking && type === 'webcam' && {
                animationName: "pulse",
                animationDuration: "1.5s",
                animationIterationCount: "infinite",
              },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[styles.grid, { width: containerDimensions.width }]}>
        {getAllActiveStreams().length > 0 ? (
          getAllActiveStreams().map(renderStream)
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
    borderColor: "#00FF00",
    opacity: 1,
    ...(Platform.OS === "web" && {
      boxShadow: `inset 0 0 15px #00FF00, 0 0 20px #00FF00`,
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
  closeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  avatarContainer: {
    flex: 1,
    position: 'relative',
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