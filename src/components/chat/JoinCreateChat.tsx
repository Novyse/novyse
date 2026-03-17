import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Avatar from "@/src/components/Avatar";
import useChatHandlers from "@/src/hooks/chat/useChatHandlers";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";

import { useThemeContext } from "@/context/ThemeContext";

interface JoinCreateChatProps {
  chat: any;
  sub: string;
  setSelectedHandle: (handle: string | null) => void;
  setSelectedChatUUID: (uuid: string | null) => void;
}

const JoinCreateChat = ({
  chat,
  sub,
  setSelectedHandle,
  setSelectedChatUUID,
}: JoinCreateChatProps) => {
  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { handleJoin, isJoining } = useChatHandlers(chat, sub);

  const isUser = chat?.type === "USER";

  const handleProceed = () => {
    handleJoin(setSelectedHandle, setSelectedChatUUID);
  };

  const handleCancel = () => {
    setSelectedChatUUID(null);
    setSelectedHandle(null);
    router.push("/app");
  };

  const displayName = useMemo(() => {
    if (!chat) return "";
    if (isUser) {
      return chat.name ? `${chat.name}`.trim() : chat.handle;
    }
    return chat.name || chat.handle;
  }, [chat, isUser]);

  const title = isUser
    ? "Start DM"
    : `Join ${chat?.type ? chat.type.charAt(0).toUpperCase() + chat.type.slice(1).toLowerCase() : "Chat"}`;

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow title={title} onBack={handleCancel} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Avatar
            uuid={chat?.profilePictureUUID}
            size={120}
            theme={theme}
            style={styles.avatar}
          />

          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.handle}>@{chat?.handle}</Text>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={"white"}
            />
            <Text style={styles.infoText}>
              {isUser
                ? "Create a new direct message conversation with this user."
                : "This is a public chat. Join to see messages and participate."}
            </Text>
          </View>

          <View style={styles.extraInfoContainer}>
            <View style={styles.extraInfoItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={theme.textSecondary}
              />
              <Text style={styles.extraInfoText}>
                {isUser
                  ? "(WIP) End-to-End Encrypted conversation. Your data remains secure."
                  : "Messages in public channels are visible to all members."}
              </Text>
            </View>
            <View style={styles.extraInfoItem}>
              <Ionicons
                name="notifications-off-outline"
                size={20}
                color={theme.textSecondary}
              />
              <Text style={styles.extraInfoText}>
                You can always mute notifications or leave the chat later.
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <HoverAndPressedButton
              onPress={handleProceed}
              disabled={isJoining}
              style={[styles.button, styles.primaryButton]}
              pressedStyle={styles.buttonPressed}
            >
              <Text style={styles.primaryButtonText}>
                {isJoining ? "Processing..." : title}
              </Text>
            </HoverAndPressedButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    content: {
      width: "100%",
      maxWidth: 400,
      alignItems: "center",
    },
    avatar: {
      marginBottom: 24,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 8,
      textAlign: "center",
    },
    handle: {
      fontSize: 18,
      color: theme.textSecondary,
      marginBottom: 32,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundMainGradient[0],
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      width: "100%",
    },
    infoText: {
      flex: 1,
      color: "white",
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 12,
    },
    extraInfoContainer: {
      width: "100%",
      marginBottom: 32,
      gap: 16,
      paddingHorizontal: 8,
    },
    extraInfoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    extraInfoText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    buttonContainer: {
      width: "100%",
      gap: 12,
    },
    button: {
      width: "100%",
      paddingVertical: 18,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonPressed: {
      opacity: 0.8,
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default JoinCreateChat;
