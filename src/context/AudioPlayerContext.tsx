import * as React from "react";
import {
  useAudioPlayer as useAudioPlayerExpo,
  useAudioPlayerStatus,
  AudioModule,
} from "expo-audio";
import useUserStore from "./UserStore";

interface AudioInfo {
  chatUUID?: string;
  messageID?: string;
  senderUUID?: string;
  profilePictureUri?: string;
  timestamp?: string | number;
}

interface AudioPlayerContextType {
  isPlaying: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
  currentUri: string | null;
  audioInfo: AudioInfo;
  addInfo: (
    chatUUID: string,
    messageID: string,
    senderUUID: string,
    profilePictureUri: string,
    timestamp: string | number,
  ) => void;
  handlePlayPause: (uri?: string | null) => void;
  handleSeek: (value: number) => void;
  handleChangePlaybackRate: (playBackRateToSet?: number | null) => void;
  removeAudio: () => void;
}

export const AudioPlayerContext = React.createContext<
  AudioPlayerContextType | undefined
>(undefined);

const speeds = [1, 1.5, 2, 0.5];

interface AudioPlayerProviderProps {
  children: React.ReactNode;
}

export const AudioPlayerProvider = ({ children }: AudioPlayerProviderProps) => {
  const getUser = useUserStore((state) => state.getUser);
  const [currentUri, setCurrentUri] = React.useState<string | null>(null);

  const [audioInfo, setAudioInfo] = React.useState<AudioInfo>({});
  const [playbackRate, setPlaybackRate] = React.useState<number>(1);

  const player = useAudioPlayerExpo(null);
  const status = useAudioPlayerStatus(player);

  React.useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: "doNotMix",
          interruptionModeAndroid: "doNotMix",
          shouldDuckAndroid: true,
        } as any);
      } catch (error) {
        console.error("Error in audio sessionconfiguration:", error);
      }
    };

    configureAudioSession();
  }, []);

  React.useEffect(() => {
    if (status.didJustFinish) {
      player.setActiveForLockScreen(false);
      setCurrentUri(null);
    }
  }, [status.didJustFinish]);

  const addInfo = (
    chatUUID: string,
    messageID: string,
    senderUUID: string,
    profilePictureUri: string,
    timestamp: string | number,
  ) => {
    setAudioInfo({
      chatUUID,
      messageID,
      senderUUID,
      profilePictureUri,
      timestamp,
    });
  };

  const handlePlayPause = (uri: string | null = null) => {
    if (player.playing && currentUri === uri) {
      handlePause();
    } else {
      handlePlay(uri);
    }
  };

  const handlePlay = (uri: string | null) => {
    if (!uri) return;
    if (currentUri !== uri) {
      setCurrentUri(uri);
      player.replace(uri);
    }
    try {
      player.play();
      setPlaybackRate(player.playbackRate);

      const user = getUser(audioInfo.senderUUID || "");
      const displayName = user ? user.name : "Unknown User";

      player.setActiveForLockScreen(true, {
        title: displayName,
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

  const handleSeek = (value: number) => {
    if (status.duration > 0) {
      player.seekTo(value);
    }
  };
  // for future menu implementation (where you can choose a specific speed without cycling)
  const handleChangePlaybackRate = (
    playBackRateToSet: number | null = null,
  ) => {
    if (
      typeof playBackRateToSet === "number" &&
      Number.isFinite(playBackRateToSet)
    ) {
      player.setPlaybackRate(playBackRateToSet);
      setPlaybackRate(player.playbackRate);
      return;
    }

    const cycleSpeed = () => {
      const currentRate = player.playbackRate;
      const currentIndex = speeds.indexOf(currentRate);
      const nextIndex = (currentIndex + 1) % speeds.length;
      return speeds[nextIndex];
    };

    const newRate = cycleSpeed();
    player.setPlaybackRate(newRate);
    setPlaybackRate(newRate);
  };

  const removeAudio = () => {
    player.setActiveForLockScreen(false);
    player.remove();
    setCurrentUri(null);
  };

  const value: AudioPlayerContextType = {
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

export const useAudioPlayer = () => {
  const context = React.useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayer must be used within an AudioPlayerProvider",
    );
  }
  return context;
};
