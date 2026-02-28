import React, { createContext, useEffect, useState } from "react";
import {
  useAudioPlayer as useAudioPlayerExpo,
  useAudioPlayerStatus,
  AudioModule,
} from "expo-audio";

export const AudioPlayerContext = createContext();

const speeds = [1, 1.5, 2, 0.5];

export const AudioPlayerProvider = ({ children }) => {
  const [currentUri, setCurrentUri] = useState(null);

  const [audioInfo, setAudioInfo] = useState({});
  const [playbackRate, setPlaybackRate] = useState(1);

  const player = useAudioPlayerExpo(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: "doNotMix",
          interruptionModeAndroid: "doNotMix",
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error("Error in audio sessionconfiguration:", error);
      }
    };

    configureAudioSession();
  });

  useEffect(() => {
    if (status.didJustFinish) {
      player.setActiveForLockScreen(false);
      setCurrentUri(null);
    }
  }, [status.didJustFinish]);

  const addInfo = (
    chatUUID,
    messageID,
    senderName,
    senderUUID,
    profilePictureUri,
    timestamp,
  ) => {
    setAudioInfo({
      chatUUID,
      messageID,
      senderName,
      senderUUID,
      profilePictureUri,
      timestamp,
    });
  };

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
      setPlaybackRate(player.playbackRate);
      player.setActiveForLockScreen(true, {
        title: audioInfo.senderName,
        artist: "Voice Message",
        albumTitle: "Novyse",
        artworkUrl: audioInfo.profilePictureUri,
      });
    } catch (error) {
      console.error("Audio play error:", error);
    }
  };

  const handlePause = () => {
    player.pause();
  };

  const handleSeek = (value) => {
    if (status.duration > 0) {
      player.seekTo(value);
    }
  };

  const handleChangePlaybackRate = (playBackRateToSet = null) => {
    // for future menu implementation (where you can choose a specific speed without cycling)
    if (playBackRateToSet) {
      player.setPlaybackRate(playBackRateToSet);
      setPlaybackRate(player.playbackRate);
      return;
    }

    const cycleSpeed = () => {
      const nextIndex =
        (speeds.indexOf(player.playbackRate) + 1) % speeds.length;
      return speeds[nextIndex];
    };

    const newRate = cycleSpeed();
    player.setPlaybackRate(newRate);
    setPlaybackRate(player.playbackRate);
  };

  const removeAudio = () => {
    player.setActiveForLockScreen(false);
    player.remove();
    setCurrentUri(null);
  };

  const value = {
    isPlaying: player.playing,
    playbackRate,
    currentTime: status.currentTime,
    duration: status.duration,
    didJustFinish: status.didJustFinish,
    currentUri,
    audioInfo,
    addInfo,
    handlePlayPause,
    handleSeek,
    handleChangePlaybackRate,
    removeAudio,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
