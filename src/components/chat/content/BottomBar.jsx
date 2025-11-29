import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import Icon from "../../Icon"; // Assicurati che il percorso sia corretto
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { WebBlobManager } from "@/src/utils/file";

import RecordingBar from "./RecordingBar"; // Importa il file creato sopra

const BottomBar = ({
  chat,
  newMessageText,
  isVoiceMessage, // Questo stato esterno indica se mostrare Mic o Send (quando c'è testo)
  rotationAnim,
  textInputRef,
  onTextChange,
  onSendMessage,
  onToggleMenu,
  onToggleEmoji,
  onInputFocus,
  onJoin,
  theme,
  setBottomBarHeight,
  onSendVoiceMessage,
}) => {
  const styles = createStyle(theme);
  const showInputBar =
    chat.uuid || !["GROUP", "CHANNEL", "FORUM"].includes(chat.type);

  // --- LOGICA AUDIO ---
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Cleanup
  useEffect(() => {
    return () => {
      // Ferma la registrazione se era in corso quando il componente si smonta
      if (isRecording) {
        audioRecorder.stop().catch((e) => {
          console.warn("Error during audio cleanup:", e);
        });
      }
    };
  }, [audioRecorder, isRecording]);

  // Avvio Registrazione (Click sul Mic)
  const handleStartRecording = async () => {
    try {
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permesso negato",
          "Serve il microfono per registrare audio."
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Errore start recording:", err);
      setIsRecording(false);
    }
  };

  const getAudioFileSize = async (uri) => {
    if (!uri) return 0;

    try {
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size; // in byte
      } else {
        // iOS & ANDROID: usa expo-file-system
        // const FileSystem = require("expo-file-system");
        // const info = await FileSystem.getInfoAsync(uri);
        // return info.size || 0;
      }
    } catch (err) {
      console.warn("Impossibile leggere dimensione file:", err);
      return 0;
    }
  };

  // Stop e Invia (Click sul pulsante Send durante rec)
  const handleStopAndSend = async () => {
    if (!isRecording) return;
  
    try {
      await audioRecorder.stop();
      // Questo è l'URI volatile (blob:...) che sparisce al refresh
      const tempUri = audioRecorder.uri; 
  
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
      if (onSendMessage && tempUri) {
        let finalFile = {
          name: "voice_message.ogg", // Nome di default per mobile
          uri: tempUri,
          size: 0,
          mimeType: "audio/ogg"
        };
  
        // --- LOGICA DI PERSISTENZA WEB ---
        if (Platform.OS === 'web') {
          // Generiamo un nome unico per evitare di sovrascrivere vecchi audio
          const uniqueName = `rec_${Date.now()}.ogg`;
          
          // SALVIAMO ORA: Prende il tempUri, lo scrive su DB e ci ridà i dati
          const savedRecord = await WebBlobManager.save(tempUri, uniqueName);
          
          // Sovrascriviamo l'oggetto finale con i dati del DB
          finalFile = {
            name: savedRecord.name,
            uri: savedRecord.uri,
            size: savedRecord.size,
            mimeType: "audio/ogg"
          };
        } else {
          // Logica Mobile (rimane invariata, calcoli solo la size)
          const sizeInBytes = await getAudioFileSize(tempUri);
          finalFile.size = sizeInBytes;
        }
  
        // Creiamo l'array come serviva a te
        const files = [ finalFile ];
  
        // Inviamo il messaggio con il file che ora è "sicuro" nel DB
        onSendMessage("message", "", files);
      }
    } catch (err) {
      console.error("Errore stop recording:", err);
    }
  };

  // Annulla (Swipe)
  const handleCancelRecording = async () => {
    if (!isRecording) return;
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log("Registrazione annullata");
    } catch (err) {
      console.error(err);
    }
  };

  // Animazione rotazione "+"
  const animatedStyle = {
    transform: [
      {
        rotate: rotationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "45deg"],
        }),
      },
    ],
  };

  return (
    <View
      style={styles.bottomBar}
      onLayout={(event) =>
        setBottomBarHeight &&
        setBottomBarHeight(event.nativeEvent.layout.height)
      }
    >
      {showInputBar ? (
        <>
          {/* 1. Icona Menu (+) */}
          <Animated.View style={[styles.icon, animatedStyle]}>
            <Icon
              name="PlusSignIcon"
              onPress={isRecording ? null : onToggleMenu} // Disabilita click se registra
              style={{ opacity: isRecording ? 0.3 : 1 }}
            />
          </Animated.View>

          {/* 2. AREA CENTRALE: Switch tra TextInput e RecordingBar */}
          {isRecording ? (
            <RecordingBar
              duration={recorderState.durationMillis}
              onCancel={handleCancelRecording}
              theme={theme}
            />
          ) : (
            <LinearGradient
              colors={theme.backgroundChatTextInputGradient}
              style={styles.textInputContainer}
            >
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                maxLength={2000}
                value={newMessageText}
                onChangeText={onTextChange}
                placeholder={"Scrivi un messaggio..."}
                placeholderTextColor={theme.placeholderText}
                onSubmitEditing={
                  Platform.OS === "web" ? () => onSendMessage("message", newMessageText) : undefined
                }
                onFocus={onInputFocus}
              />
              <Icon
                name="SmileIcon"
                style={styles.icon}
                onPress={onToggleEmoji}
              />
            </LinearGradient>
          )}

          {/* 3. PULSANTE DESTRO: Cambia funzione dinamicamente */}
          <View style={styles.rightButtonContainer}>
            {isRecording ? (
              // Caso A: Sta registrando

              <Icon
                name="SentIcon"
                style={styles.icon}
                onPress={handleStopAndSend}
              />
            ) : // Caso B: Non sta registrando
            newMessageText.length > 0 || !isVoiceMessage ? (
              // C'è testo o modalità testo -> Bottone INVIA TESTO
              <Icon
                name="SentIcon"
                onPress={() => onSendMessage("message", newMessageText)}
                style={styles.icon}
              />
            ) : (
              // Non c'è testo e modalità voce -> Bottone MICROFONO (Click per avviare)
              <Icon
                name="Mic02Icon"
                onPress={handleStartRecording}
                style={styles.icon}
              />
            )}
          </View>
        </>
      ) : (
        <Pressable onPress={onJoin} style={styles.joinButton}>
          <Text style={styles.joinButtonText}>
            Join{" "}
            {chat.type.charAt(0).toUpperCase() +
              chat.type.slice(1).toLowerCase()}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default BottomBar;

const createStyle = (theme) =>
  StyleSheet.create({
    bottomBar: {
      width: "100%",
      paddingVertical: 10,
      paddingHorizontal: 5,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 55,
      backgroundColor: theme.background, // Assicura che la barra abbia il colore di sfondo corretto
    },
    textInputContainer: {
      flex: 1, // Occupa lo spazio centrale
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 5,
      marginHorizontal: 5,
      minHeight: 45,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      outlineStyle: "none",
      alignSelf: "stretch",
      marginLeft: 10,
      minWidth: 30,
    },
    icon: {
      width: 35,
      height: 35,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
    },
    rightButtonContainer: {
      justifyContent: "center",
      alignItems: "center",
      width: 45,
    },
    sendAudioButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#34C759", // Verde "Invia" stile Whatsapp
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
    },
    joinButton: {
      backgroundColor: theme.backgroundJoinChatButton,
      paddingHorizontal: 30,
      paddingVertical: 13,
      borderRadius: 25,
      alignSelf: "center",
      marginHorizontal: "auto",
    },
    joinButtonText: {
      fontSize: 18,
      color: theme.text,
      fontWeight: "bold",
    },
  });
