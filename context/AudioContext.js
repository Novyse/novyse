import React, { createContext, useContext, useRef } from 'react';
import { Platform } from 'react-native';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const audioRefs = useRef(new Map()); // Map per gestire tutti gli elementi audio
  // Funzione per aggiungere audio al componente
  const addAudio = (deviceUUID, stream) => {
    console.log(`[AudioContext] addAudio called for ${deviceUUID}:`, {
      platform: Platform.OS,
      hasStream: !!stream,
      audioTracksCount: stream ? stream.getAudioTracks().length : 0
    });

    if (Platform.OS !== 'web') {
      // Su mobile, l'audio viene gestito automaticamente da RTCView
      console.log(`[AudioContext] Platform is ${Platform.OS}, skipping manual audio element creation`);
      return;
    }

    try {
      // Rimuovi elemento audio esistente se presente
      removeAudio(deviceUUID);

      if (!stream || stream.getAudioTracks().length === 0) {
        console.warn(`[AudioContext] No audio tracks found for ${deviceUUID}`);
        return;
      }

      // Crea nuovo elemento audio
      const audioElement = document.createElement("audio");
      audioElement.id = `audio-${deviceUUID}`;
      audioElement.autoplay = true;
      audioElement.muted = false;
      audioElement.style.display = "none";
      
      // Crea stream solo con tracce audio
      const audioStream = new MediaStream(stream.getAudioTracks());
      audioElement.srcObject = audioStream;
      
      // Aggiungi al DOM e salva riferimento
      document.body.appendChild(audioElement);
      audioRefs.current.set(deviceUUID, audioElement);

      console.log(`[AudioContext] Audio element created and added to DOM for participant ${deviceUUID}:`, {
        elementId: audioElement.id,
        audioTracksInStream: audioStream.getAudioTracks().length,
        elementInDom: !!document.getElementById(audioElement.id)
      });
    } catch (error) {
      console.error(`[AudioContext] Error adding audio for ${deviceUUID}:`, error);
    }
  };
  // Funzione per rimuovere audio del partecipante alla vocal chat
  const removeAudio = (deviceUUID) => {
    console.log(`[AudioContext] removeAudio called for ${deviceUUID}`);
    
    if (Platform.OS !== 'web') {
      console.log(`[AudioContext] Platform is ${Platform.OS}, skipping audio element removal`);
      return;
    }

    const audioElement = audioRefs.current.get(deviceUUID);
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.srcObject = null;
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
        audioRefs.current.delete(deviceUUID);
        console.log(`[AudioContext] Audio element removed from DOM for participant ${deviceUUID}`);
      } catch (error) {
        console.error(`[AudioContext] Error removing audio for ${deviceUUID}:`, error);
      }
    } else {
      console.log(`[AudioContext] No audio element found to remove for participant ${deviceUUID}`);
    }
  };
  // Funzione per pulire tutti gli audio
  const clearAllAudio = () => {
    console.log(`[AudioContext] clearAllAudio called`);
    
    if (Platform.OS !== 'web') {
      console.log(`[AudioContext] Platform is ${Platform.OS}, skipping audio cleanup`);
      return;
    }

    audioRefs.current.forEach((audioElement, deviceUUID) => {
      removeAudio(deviceUUID);
    });
    audioRefs.current.clear();
    console.log(`[AudioContext] All audio elements cleared`);
  };

  // Debug function to check current audio elements
  const debugAudioElements = () => {
    if (Platform.OS !== 'web') {
      console.log(`[AudioContext] Platform is ${Platform.OS}, no audio elements to debug`);
      return;
    }

    console.log(`[AudioContext] DEBUG - Current audio elements:`, {
      audioRefsCount: audioRefs.current.size,
      audioElementsInDom: document.querySelectorAll('audio').length,
      participants: Array.from(audioRefs.current.keys())
    });
    
    // Check each audio element in detail
    audioRefs.current.forEach((audioElement, deviceUUID) => {
      console.log(`[AudioContext] Audio element for ${deviceUUID}:`, {
        id: audioElement.id,
        muted: audioElement.muted,
        paused: audioElement.paused,
        hasStream: !!audioElement.srcObject,
        tracksCount: audioElement.srcObject ? audioElement.srcObject.getAudioTracks().length : 0,
        inDom: !!document.getElementById(audioElement.id)
      });
    });
  };

  const value = {
    addAudio,
    removeAudio,
    clearAllAudio,
    debugAudioElements
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioContext;