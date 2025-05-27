import React, { createContext, useContext, useRef } from 'react';
import { Platform } from 'react-native';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const audioRefs = useRef(new Map()); // Map per gestire tutti gli elementi audio

  // Funzione per aggiungere audio al componente
  const addAudio = (participantId, stream) => {
    if (Platform.OS !== 'web') {
      // Su mobile, l'audio viene gestito automaticamente da RTCView
      return;
    }

    try {
      // Rimuovi elemento audio esistente se presente
      removeAudio(participantId);

      if (!stream || stream.getAudioTracks().length === 0) {
        console.warn(`[AudioContext] No audio tracks found for ${participantId}`);
        return;
      }

      // Crea nuovo elemento audio
      const audioElement = document.createElement("audio");
      audioElement.id = `audio-${participantId}`;
      audioElement.autoplay = true;
      audioElement.muted = false;
      audioElement.style.display = "none";
      
      // Crea stream solo con tracce audio
      const audioStream = new MediaStream(stream.getAudioTracks());
      audioElement.srcObject = audioStream;
      
      // Aggiungi al DOM e salva riferimento
      document.body.appendChild(audioElement);
      audioRefs.current.set(participantId, audioElement);

      console.log(`[AudioContext] Audio added for participant ${participantId}`);
    } catch (error) {
      console.error(`[AudioContext] Error adding audio for ${participantId}:`, error);
    }
  };

  // Funzione per rimuovere audio del partecipante alla vocal chat
  const removeAudio = (participantId) => {
    if (Platform.OS !== 'web') {
      return;
    }

    const audioElement = audioRefs.current.get(participantId);
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.srcObject = null;
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
        audioRefs.current.delete(participantId);
        console.log(`[AudioContext] Audio removed for participant ${participantId}`);
      } catch (error) {
        console.error(`[AudioContext] Error removing audio for ${participantId}:`, error);
      }
    }
  };

  // Funzione per pulire tutti gli audio
  const clearAllAudio = () => {
    if (Platform.OS !== 'web') {
      return;
    }

    audioRefs.current.forEach((audioElement, participantId) => {
      removeAudio(participantId);
    });
    audioRefs.current.clear();
  };

  const value = {
    addAudio,
    removeAudio,
    clearAllAudio
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