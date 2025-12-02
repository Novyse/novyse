import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { ThemeContext } from "@/context/ThemeContext";
import Slider from "@react-native-community/slider";
import Icon from "../Icon";
import storage from "@/src/utils/storage/file";

const MessageAudio = ({ audioRef, uuid, mimeType, size }) => {
  const [playableUri, setPlayableUri] = useState(null);

  // 1. Risolvi l'URI in modo asincrono
  useEffect(() => {
    let isMounted = true;
    const resolveUri = async () => {
      if (!audioRef) return;
      try {
        const resolved = await storage.read(audioRef);
        if (isMounted && resolved) {
          setPlayableUri(resolved);
        }
      } catch (error) {
        console.error("Errore URI:", error);
      }
    };
    resolveUri();
    return () => {
      isMounted = false;
    };
  }, [audioRef]);

  // 2. Inizializza il player
  const player = useAudioPlayer(playableUri);
  const status = useAudioPlayerStatus(player);
  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  // 3. LOGICA DI SICUREZZA PER LA DURATA
  // Se la durata è null, undefined, Infinity o NaN, usiamo 0.
  const isValidDuration =
    status.duration && Number.isFinite(status.duration) && status.duration > 0;
  const safeDuration = isValidDuration ? status.duration : 0;

  // Lo stato "Ready" è vero solo se caricato E se abbiamo una durata valida (opzionale: o se sta facendo buffering)
  const isReady = playableUri && status.isLoaded;

  const handlePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (value) => {
    // Evita seek se la durata non è ancora calcolata
    if (safeDuration > 0) {
      player.seekTo(value);
    }
  };

  // Funzione formattazione "corazzata" contro errori
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "00:00";

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (size) => {
    if (!size) return "0 B";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (
      (size / Math.pow(1024, i)).toFixed(2) + " " + ["B", "KB", "MB", "GB"][i]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePlayPause}
        disabled={!isReady}
        style={styles.playPauseButton}
      >
        {!isReady ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon
            name={player.playing ? "PauseIcon" : "PlayIcon"}
            style={{ width: 15, height: 15, tintColor: "#fff" }}
          />
        )}
      </Pressable>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          // Se la durata è invalida, mettiamo 1 per evitare crash, ma lo slider non si muoverà correttamente finché non è caricato
          maximumValue={safeDuration > 0 ? safeDuration : 1}
          value={status.currentTime}
          onSlidingComplete={handleSeek}
          // Disabilita lo slider se la durata è Infinity o 0
          disabled={!isReady || !isValidDuration}
          minimumTrackTintColor="#0088cc"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#0088cc"
        />
        <View style={styles.textContainer}>
          <Text style={styles.durationText}>
            {/* Qui mostriamo 00:00 se safeDuration è 0/Infinity */}
            {formatTime(status.currentTime)} / {formatTime(safeDuration)}
          </Text>
          <Text style={styles.sizeText}>{formatFileSize(size)}</Text>

          <Pressable
            onPress={() =>
              player.setPlaybackRate(player.playbackRate === 1 ? 1.5 : 1)
            }
            style={styles.playbackRateButton}
            disabled={!isReady}
          >
            <Text style={styles.playbackRateText}>{player.playbackRate}x</Text>
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
      width: 32,
      height: 32, // Importante fissare dim per evitare salti col loader
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
      fontVariant: ["tabular-nums"], // Mantiene i numeri fermi evitando sfarfallii
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
