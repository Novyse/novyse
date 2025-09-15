import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createAudioPlayer } from "expo-audio";
import { ThemeContext } from "@/context/ThemeContext";
import Slider from "@react-native-community/slider";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { PlayIcon, PauseIcon } from "@hugeicons/core-free-icons";

const audioSource = require("../../../assets/audio/vocalMessagesTest.mp3");

const AudioMessage = () => {
  const playerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setPlayerReady] = useState(false);

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  useEffect(() => {
    const newPlayer = createAudioPlayer(audioSource);
    // Salva l'istanza nel ref per farla sopravvivere ai re-render
    playerRef.current = newPlayer;

    const listener = newPlayer.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        setPlayerReady(true);
        setPosition(status.currentTime || 0);
        setDuration(status.duration || 0);
        setIsPlaying(status.playing);

        if (status.didJustFinish) {
          // Quando finisce, torna all'inizio senza scaricare
          playerRef.current?.seekTo(0);
        }
      }
      if (status.error) {
        console.error("[AudioMessage] Errore di riproduzione:", status.error);
      }
    });

    // Funzione di cleanup
    return () => {
      // Rimuovi il listener e il player quando il componente viene smontato
      listener.remove();
      playerRef.current?.remove();
    };
  }, []); // L'array vuoto assicura che venga eseguito solo una volta

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (error) {
      console.error("[AudioMessage] Errore play/pause:", error);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(value);
  }, []);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === null) return "00:00";
    const seconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={!isPlayerReady}
        style={styles.playPauseButton}
      >
        <HugeiconsIcon
          icon={isPlaying ? PauseIcon : PlayIcon}
          size={24}
          color={isPlayerReady ? theme.icon : "#a9a9a9"}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          onSlidingComplete={handleSeek}
          disabled={!isPlayerReady}
          minimumTrackTintColor="#0088cc"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#0088cc"
        />
        <Text style={styles.durationText}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
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
    durationText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
      marginTop: 4,
    },
  });
}

export default React.memo(AudioMessage);