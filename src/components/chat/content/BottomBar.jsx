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
import Icon from "../../Icon";
import BlurredView from "../../BlurredView";

import RecordingBar from "./RecordingBar";

import useVoiceRecord from "../../../hooks/chat/useVoiceRecord";

const BottomBar = ({
  chat,
  newMessageText,
  isVoiceMessage,
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
}) => {
  const styles = createStyle(theme);
  const showInputBar =
    chat.uuid || !["GROUP", "CHANNEL", "FORUM"].includes(chat.type);

  const {
    isRecording,
    recorderState,
    handleStartRecording,
    handleStopAndSend,
    handleCancelRecording,
  } = useVoiceRecord(onSendMessage);

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
          <BlurredView style={styles.rightLeftButtons}>
            <Animated.View style={animatedStyle}>
              <Icon
                name="PlusSignIcon"
                onPress={isRecording ? null : onToggleMenu} // Disabilita click se registra
                style={[styles.icon, { opacity: isRecording ? 0.3 : 1 }]}
              />
            </Animated.View>
          </BlurredView>

          {/* 2. AREA CENTRALE: Switch tra TextInput e RecordingBar */}
          {isRecording ? (
            <RecordingBar
              duration={recorderState.durationMillis}
              onCancel={handleCancelRecording}
              theme={theme}
            />
          ) : (
            <BlurredView style={styles.textInputContainer}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                maxLength={2000}
                value={newMessageText}
                onChangeText={onTextChange}
                placeholder={"Message"}
                placeholderTextColor={theme.placeholderText}
                cursorColor={theme.placeholderText}
                onSubmitEditing={
                  Platform.OS === "web"
                    ? () => onSendMessage("message", newMessageText)
                    : undefined
                }
                onFocus={onInputFocus}
              />
              <Icon
                name="SmileIcon"
                style={styles.icon}
                onPress={onToggleEmoji}
              />
            </BlurredView>
          )}

          {/* 3. PULSANTE DESTRO: Cambia funzione dinamicamente */}
          <BlurredView style={styles.rightLeftButtons}>
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
          </BlurredView>
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
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 55,
      backgroundColor: theme.background,
      gap: 10,
    },
    textInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 100,
      paddingHorizontal: 5,
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
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    rightLeftButtons: {
      justifyContent: "center",
      alignItems: "center",
      width: 45,
      height: 45,
      alignItems: "center",
    },
    sendAudioButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#34C759",
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
