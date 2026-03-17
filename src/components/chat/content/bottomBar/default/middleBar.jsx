import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Duration } from "luxon";

import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import BlurredView from "@/src/components/BlurredView";
import RecordingDot from "@/src/components/RecordingDot";
import SpeechIndicator from "@/src/components/SpeechIndicator";
import { getPlatform } from "@/src/utils/device/type";

const MiddleBar = ({
  newMessageText,
  textInputRef,
  onTextChange,
  onInputFocus,
  onToggleEmoji,
  onSendMessage,
  isRecording,
  isPaused,
  recorderState,
  handleTogglePause,
  handleStopAndDraft,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <>
      {!isRecording ? (
        <BlurredView style={styles.container}>
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
              getPlatform() != "mobile"
                ? () => onSendMessage("message", newMessageText)
                : undefined
            }
            onFocus={onInputFocus}
          />
          <Icon name="SmileIcon" style={styles.icon} onPress={onToggleEmoji} />
        </BlurredView>
      ) : (
        <BlurredView style={styles.container}>
          <View style={styles.recordState}>
            <RecordingDot isRecording={!isPaused} />

            <Text style={styles.durationText}>
              {Duration.fromMillis(recorderState?.durationMillis || 0).toFormat(
                "m:ss.SSS",
              )}
            </Text>
          </View>

          {/* Voice Activity */}
          <View style={styles.speechContainer}>
            <SpeechIndicator audioLevel={recorderState.metering} />
          </View>

          <View style={styles.actionsContainer}>
            {/* Stop and Draft button */}
            <Icon
              name="Add01Icon"
              style={styles.pauseResumeIcon}
              onPress={handleStopAndDraft}
            />

            {/* Pause/Resume button */}
            {!isPaused ? (
              <Icon
                name="PauseIcon"
                style={styles.pauseResumeIcon}
                onPress={handleTogglePause}
              />
            ) : (
              <Icon
                name="PlayIcon"
                style={styles.pauseResumeIcon}
                onPress={handleTogglePause}
              />
            )}
          </View>
        </BlurredView>
      )}
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 100,
      paddingHorizontal: 5,
      height: 45,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      outlineStyle: "none",
      alignSelf: "stretch",
      marginLeft: 10,
      minWidth: 45,
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    durationText: {
      color: theme.text,
      fontSize: 16,
      marginHorizontal: 10,
    },
    pauseResumeIcon: {
      height: 45,
      width: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    recordState: {
      height: 45,
      alignItems: "center",
      flexDirection: "row",
      marginLeft: 10,
    },
    actionsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    speechContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    }
  });

export default MiddleBar;
