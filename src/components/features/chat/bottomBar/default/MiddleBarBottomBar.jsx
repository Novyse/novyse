import { useContext, useEffect, useRef } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import { EnrichedMarkdownTextInput } from "react-native-enriched-markdown";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";
import { Duration } from "luxon";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/layout/BlurredView";
import RecordingDot from "@/src/components/features/chat/bottomBar/RecordingDot";
import SpeechIndicator from "@/src/components/features/chat/bottomBar/SpeechIndicator";
import { getPlatform } from "@/src/utils/device/type";
import { toDroppedFile } from "@/src/components/ui/input/WebDropZone";
import { handleChatShortcuts } from "@/src/utils/shortcut/chatShortcuts";
import Platform from "@/src/utils/device/type";
import { getMarkdownStyle } from "@/constants/markdownStyles";

const MiddleBarBottomBar = ({
  chatType,
  newMessageText,
  textInputRef,
  onTextChange,
  onInputFocus,
  isEmojiPickerVisible,
  onToggleEmoji,
  onSendMessage,
  onFileAppend,
  isRecording,
  isPaused,
  recorderState,
  handleTogglePause,
  handleStopAndDraft,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  replyingTo,
  onPressArrowUp,
  onStartMention,
  onChangeMention,
  onEndMention,
  isScreenRecording,
}) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const isNativeEnriched =
    getPlatform() === "mobile" && !!EnrichedMarkdownTextInput;

  const lastValueRef = useRef(newMessageText);

  useEffect(() => {
    if (isNativeEnriched && textInputRef?.current) {
      if (newMessageText !== lastValueRef.current) {
        textInputRef.current.setValue(newMessageText || "");
        lastValueRef.current = newMessageText;
      }
    }
  }, [newMessageText]);

  const handleTextChange = (text) => {
    lastValueRef.current = text;
    onTextChange?.(text);
  };

  // Web/Desktop: auto-resize textarea to fit content
  useEffect(() => {
    if (Platform !== "web" && Platform !== "desktop") return;

    const node = textInputRef?.current;
    const domNode = node && (node instanceof HTMLElement ? node : node._node);
    if (!domNode) return;

    const textarea =
      domNode.tagName === "TEXTAREA"
        ? domNode
        : domNode.querySelector("textarea");
    if (!textarea) return;

    // Measure true scrollHeight then cap to max (max 5-6 lines)
    const MAX_INPUT_HEIGHT = 130;
    textarea.style.height = "auto";
    const desired = textarea.scrollHeight;
    textarea.style.height = `${Math.min(desired, MAX_INPUT_HEIGHT)}px`;
    textarea.style.overflowY = desired > MAX_INPUT_HEIGHT ? "auto" : "hidden";
  }, [textInputRef, newMessageText]);

  // Web/Desktop: intercept CTRL+V to paste files from clipboard
  useEffect(() => {
    if (Platform !== "web" && Platform !== "desktop") return;

    const node = textInputRef?.current;
    const domNode = node && (node instanceof HTMLElement ? node : node._node);
    if (!domNode) return;

    const handlePaste = async (e) => {
      const clipboardData = e.clipboardData || e.nativeEvent?.clipboardData;

      // 1. Synchronous attempt (Chrome, Firefox, Safari, Edge on Windows)
      const syncFiles = clipboardData?.files?.length
        ? Array.from(clipboardData.files)
        : Array.from(clipboardData?.items || [])
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter(Boolean);

      if (syncFiles.length > 0) {
        e.preventDefault();
        onFileAppend?.(syncFiles.map(toDroppedFile));
        return;
      }

      // 2. Asynchronous fallback
      if (navigator.clipboard?.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          const files = [];
          for (const item of clipboardItems) {
            // Skip pure text items to let the browser handle text pasting naturally
            if (
              item.types.every(
                (t) =>
                  t === "text/plain" || t === "text/html" || t === "text/rtf",
              )
            ) {
              continue;
            }

            for (const type of item.types) {
              const blob = await item.getType(type);
              if (blob) {
                const ext =
                  type.split("/")[1]?.split("+")[0]?.split(".")?.pop() || "bin";
                const filename = blob.name || `file.${ext}`;
                const file = new File([blob], filename, { type });
                files.push(file);
              }
            }
          }
          if (files.length > 0) {
            onFileAppend?.(files.map(toDroppedFile));
          }
        } catch (err) {
          // Silently ignore
        }
      }
    };

    domNode.addEventListener("paste", handlePaste);
    return () => domNode.removeEventListener("paste", handlePaste);
  }, [textInputRef, onFileAppend]);

  return (
    <>
      {!isRecording ? (
        <BlurredView style={styles.container}>
          {isNativeEnriched ? (
            <EnrichedMarkdownTextInput
              ref={textInputRef}
              style={styles.textInput}
              maxLength={2000}
              multiline={true}
              numberOfLines={1}
              defaultValue={newMessageText}
              onChangeMarkdown={handleTextChange}
              placeholder={t("chat.bottomBar.placeholder")}
              placeholderTextColor={theme.placeholderText}
              cursorColor={theme.placeholderText}
              markdownStyle={getMarkdownStyle(theme)}
              onFocus={onInputFocus}
              mentionIndicators={chatType !== "DM" ? ["@"] : []}
              onStartMention={onStartMention}
              onChangeMention={onChangeMention}
              onEndMention={onEndMention}
              onKeyPress={(e) => {
                const key = e.nativeEvent?.key || e.key;
                const isShift = e.nativeEvent?.shiftKey || e.shiftKey;
                if (key === "Enter" && getPlatform() !== "mobile") {
                  if (!isShift) {
                    e.preventDefault();
                    onSendMessage("message", newMessageText.trimStart());
                    return;
                  }
                }
                handleChatShortcuts(e, {
                  editingMessage,
                  replyingTo,
                  onCancelEdit,
                  onCancelReply,
                  onPressArrowUp,
                  isInputEmpty: newMessageText === "",
                });
              }}
            />
          ) : (
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              maxLength={2000}
              multiline={true}
              numberOfLines={1}
              value={newMessageText}
              onChangeText={handleTextChange}
              placeholder={t("chat.bottomBar.placeholder")}
              placeholderTextColor={theme.placeholderText}
              cursorColor={theme.placeholderText}
              onFocus={onInputFocus}
              onKeyPress={(e) => {
                const key = e.nativeEvent?.key || e.key;
                const isShift = e.nativeEvent?.shiftKey || e.shiftKey;
                if (key === "Enter" && getPlatform() !== "mobile") {
                  if (!isShift) {
                    e.preventDefault();
                    onSendMessage(
                      "message",
                      newMessageText.trimStart().trimEnd(),
                    );
                    return;
                  }
                }
                handleChatShortcuts(e, {
                  editingMessage,
                  replyingTo,
                  onCancelEdit,
                  onCancelReply,
                  onPressArrowUp,
                  isInputEmpty: newMessageText === "",
                });
              }}
            />
          )}

          <Icon
            name={
              Platform === "mobile" && isEmojiPickerVisible
                ? "KeyboardIcon"
                : "SmileIcon"
            }
            style={styles.icon}
            onPress={onToggleEmoji}
          />
        </BlurredView>
      ) : (
        <View style={styles.recordingWrapper}>
          <BlurredView style={styles.recordingContainer}>
            <View style={styles.recordState}>
              <RecordingDot isRecording={!isPaused} />

              <Typography
                size="sm"
                style={styles.durationText}
                text={Duration.fromMillis(
                  recorderState?.durationMillis || 0,
                ).toFormat("m:ss.SSS")}
              />
            </View>

            {/* Voice/Screen Activity */}
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
        </View>
      )}
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    recordingWrapper: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "flex-end",
    },
    container: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      borderRadius: 25,
      paddingHorizontal: 5,
      minHeight: 45,
      maxHeight: 150,
    },
    recordingContainer: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 22.5,
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
      textAlignVertical: "center",
      paddingTop: Platform === "web" ? 10 : 10,
      paddingBottom: Platform === "web" ? 10 : 10,
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    durationText: {
      marginHorizontal: 10,
      fontFamily: "monospace",
      fontVariant: ["tabular-nums"],
      minWidth: 70,
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
    },
  });

export default MiddleBarBottomBar;
