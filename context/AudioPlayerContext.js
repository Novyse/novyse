import React, { createContext, useEffect, useState } from "react";
import {
  useAudioPlayer as useAudioPlayerExpo,
  useAudioPlayerStatus,
} from "expo-audio";

export const AudioPlayerContext = createContext();

export const AudioPlayerProvider = ({ children }) => {
  const [currentUri, setCurrentUri] = useState(null);

  const player = useAudioPlayerExpo(null);
  const status = useAudioPlayerStatus(player);

  const handlePlayPause = (uri = null) => {
    if (player.playing && currentUri === uri) {
      handlePause();
    } else {
      handlePlay(uri);
    }
  };

  const handlePlay = (uri) => {
    if (!uri) return;
    if (currentUri !== uri) {
      setCurrentUri(uri);
      player.replace(uri);
    }
    try {
      player.play();
    } catch (error) {
      console.error("Audio play error:", error);
    }
  };

  const handlePause = () => {
    player.pause();
  };

  // Da fixare seek e playback rate @SamueleOrazioDurante
  const handleSeek = (value) => {
    if (status.duration > 0) {
      player.seekTo(value);
    }
  };

  const handleChangePlaybackRate = (rate) => {
    player.setPlaybackRate(rate);
  };

  const value = {
    isPlaying: player.playing,
    playBackRate: player.playbackRate,
    currentTime: status.currentTime,
    duration: status.duration,
    didJustFinish: status.didJustFinish,
    currentUri,
    handlePlayPause,
    handleSeek,
    handleChangePlaybackRate,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
