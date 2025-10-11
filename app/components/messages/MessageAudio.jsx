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

const audioSource = require("../../../assets/audio/vocalMessagesTest.mp3");

const MessageAudio = () => {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setPlayerReady] = useState(false);
  // Add state for playback rate
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  useEffect(() => {
    const newPlayer = createAudioPlayer(audioSource);
    playerRef.current = newPlayer;

    const listener = newPlayer.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        setPlayerReady(true);
        setPosition(status.currentTime || 0);
        setDuration(status.duration || 0);
        setIsPlaying(status.playing);

        if (status.didJustFinish) {
          playerRef.current?.seekTo(0);
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
  }, []);

  // Function to handle playback rate change
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
  }, []);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === null) return "00:00";
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
        <Icon name={isPlaying ? "PauseIcon" : "PlayIcon"} />
      </Pressable>
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
        <View style={styles.textContainer}>
          <Text style={styles.durationText} selectable={false}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
          <Pressable
            onPress={handlePlaybackRateChange}
            disabled={!isPlayerReady}
            style={styles.playbackRateButton}
          >
            <Text style={styles.playbackRateText} selectable={false}>{playbackRate}x</Text>
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
