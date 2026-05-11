import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Avatar from "@/src/components/Avatar";
import useChatHandlers from "@/src/hooks/chat/useChatHandlers";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";

import { useThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/Icon";

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
  const { t } = useTranslation();
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
    ? t("chat.joinCreate.startDm")
    : `${t("chat.joinCreate.join")} ${chat?.type ? chat.type.charAt(0).toUpperCase() + chat.type.slice(1).toLowerCase() : t("chat.joinCreate.joinChat")}`;

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

          <AppText style={styles.title} text={displayName} />
          <AppText style={styles.handle} text={`@${chat?.handle}`} />

          <View style={styles.infoBox}>
            <Icon name="InformationCircleIcon"/>
            <AppText
              style={styles.infoText}
              translationKey={
                isUser
                  ? "chat.joinCreate.joinUserDesc"
                  : "chat.joinCreate.joinChatDesc"
              }
            />
          </View>

          <View style={styles.extraInfoContainer}>
            <View style={styles.extraInfoItem}>
              <Icon name="ShieldTickIcon" size={20} />
              <AppText
                style={styles.extraInfoText}
                translationKey={
                  isUser
                    ? "chat.joinCreate.securityWip"
                    : "chat.joinCreate.publicChannelDesc"
                }
              />
            </View>
            <View style={styles.extraInfoItem}>
              <Icon name="NotificationOff02Icon" size={20} />
              <AppText
                style={styles.extraInfoText}
                translationKey="chat.joinCreate.notificationMuteDesc"
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <HoverAndPressedButton
              onPress={handleProceed}
              disabled={isJoining}
              style={[styles.button, styles.primaryButton]}
              pressedStyle={styles.buttonPressed}
            >
              <AppText
                style={styles.primaryButtonText}
                text={isJoining ? t("chat.joinCreate.processing") : title}
              />
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
      color: theme.text,
      marginBottom: 8,
      textAlign: "center",
    },
    handle: {
      fontSize: 18,
      color: theme.icon,
      marginBottom: 32,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundMain,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      width: "100%",
    },
    infoText: {
      flex: 1,
      color: theme.text,
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
      color: theme.icon,
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
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default JoinCreateChat;
