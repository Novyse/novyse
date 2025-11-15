import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Icon from "../../Icon";
import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import { Animated } from "react-native";

const BottomBar = ({
  chat,
  newMessageText,
  isVoiceMessage,
  rotationAnim,
  textInputRef,
  onTextChange,
  onSendMessage,
  onVoiceMessage,
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
      onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
    >
      {showInputBar ? (
        <>
          <Animated.View style={[styles.icon, animatedStyle]}>
            <Icon name="PlusSignIcon" onPress={onToggleMenu} />
          </Animated.View>

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
              placeholder={"New message"}
              placeholderTextColor={theme.placeholderText}
              onSubmitEditing={
                Platform.OS === "web" ? onSendMessage : undefined
              }
              onFocus={onInputFocus}
            />
            <Icon
              name="SmileIcon"
              style={styles.icon}
              onPress={onToggleEmoji}
            />
          </LinearGradient>

          {isVoiceMessage ? (
            <Icon
              name="Mic02Icon"
              onPress={onVoiceMessage}
              style={styles.icon}
            />
          ) : (
            <Icon name="SentIcon" onPress={onSendMessage} style={styles.icon} />
          )}
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
    },
    textInputContainer: {
      flex: 1,
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
      minWidth: 30
    },
    icon: {
      width: 35,
      height: 35,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
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
