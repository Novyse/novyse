import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { createAudioPlayer } from "expo-audio";
import { ThemeContext } from "@/context/ThemeContext";
import Slider from "@react-native-community/slider";
import Icon from "../Icon";

import useFiles from "@/src/hooks/chat/useFiles";

const MessageAudio = ({ audioUri, s3Url, uuid }) => {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setPlayerReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  const { name, size, mimeType, state, loading, error } = useFiles(audioUri, s3Url, uuid);

  const formatFileSize = (size) => {
    if (!size || isNaN(size)) return "0 B";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    return (size / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  };

  useEffect(() => {
    if (!audioUri) return;

    // Crea il player con l'URI dinamico
    const newPlayer = createAudioPlayer(audioUri);
    playerRef.current = newPlayer;

    const listener = newPlayer.addListener("playbackStatusUpdate", (status) => {
      // Verifica se il file è caricato o se c'è un errore
      if (status.isLoaded || status.playing) {
        // Aggiunto check playing per robustezza
        setPlayerReady(true);

        // Recupera la posizione corrente (default 0)
        setPosition(status.currentTime || 0);

        // LOGICA MIGLIORATA PER LA DURATA:
        // 1. Prova a prendere la durata dallo status
        // 2. Se è 0 o mancante, prova a chiederla direttamente al player
        // 3. Mantieni la vecchia durata se quella nuova è 0 (per evitare sfarfallii)
        let currentDuration = status.duration || newPlayer.duration || 0;

        // Se la durata è > 0, aggiorna lo stato
        if (currentDuration > 0) {
          setDuration(currentDuration);
        }

        setIsPlaying(status.playing);

        if (status.didJustFinish) {
          playerRef.current?.seekTo(0);
          setIsPlaying(false);
          setPosition(0); // Reset visivo posizione
        }
      }

      if (status.error) {
        console.error("[MessageAudio] Errore di riproduzione:", status.error);
      }
    });

    return () => {
      listener.remove();
      playerRef.current?.remove();
    };
  }, [audioUri]);

  const handlePlaybackRateChange = useCallback(() => {
    if (!playerRef.current) return;
    try {
      const currentIndex = playbackRates.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % playbackRates.length;
      const newRate = playbackRates[nextIndex];
      setPlaybackRate(newRate);
      playerRef.current.setPlaybackRate(newRate);
    } catch (error) {
      console.error("[MessageAudio] Errore cambio playback rate:", error);
    }
  }, [playbackRate]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (error) {
      console.error("[MessageAudio] Errore play/pause:", error);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(value);
    setPosition(value); // Aggiornamento ottimistico UI
  }, []);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === null) return "00:00";

    // Arrotonda per difetto per evitare millesimi di secondo
    const seconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePlayPause}
        disabled={!isPlayerReady}
        style={styles.playPauseButton}
      >
        <Icon
          name={isPlaying ? "PauseIcon" : "PlayIcon"}
          style={{ width: 15, height: 15, tintColor: "#fff" }}
        />
      </Pressable>
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1} // Evita bug visivi se durata è 0
          value={position}
          onSlidingComplete={handleSeek}
          disabled={!isPlayerReady}
          minimumTrackTintColor="#0088cc"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#0088cc"
        />
        <View style={styles.textContainer}>
          <Text style={styles.durationText} selectable={false}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
          <Text style={styles.sizeText} selectable={false}>
            {formatFileSize(size)}
          </Text>
          <Pressable
            onPress={handlePlaybackRateChange}
            disabled={!isPlayerReady}
            style={styles.playbackRateButton}
          >
            <Text style={styles.playbackRateText} selectable={false}>
              {playbackRate}x
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      width: "100%",
    },
    playPauseButton: {
      padding: 8,
      borderRadius: 50,
      backgroundColor: "#0088cc",
      marginRight: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    progressContainer: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
    },
    slider: {
      flex: 1,
      height: 30,
    },
    textContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    durationText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
    },
    sizeText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
    },
    playbackRateButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: "#0088cc",
    },
    playbackRateText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "bold",
    },
  });
}

export default React.memo(MessageAudio);
