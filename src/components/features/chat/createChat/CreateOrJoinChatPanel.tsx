import { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import Avatar from "@/src/components/ui/avatar/Avatar";
import useChatHandlers from "@/src/hooks/chat/useChatHandlers";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import Button from "@/src/components/ui/button/Button";

import { useThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface CreateOrJoinChatPanelProps {
  chat: any;
  sub: string;
  setSelectedHandle: (handle: string | null) => void;
  setSelectedChatUUID: (uuid: string | null) => void;
}

const CreateOrJoinChatPanel = ({
  chat,
  sub,
  setSelectedHandle,
  setSelectedChatUUID,
}: CreateOrJoinChatPanelProps) => {
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
          <View style={styles.userInfo}>
            <Avatar
              uuid={chat?.profilePictureUUID}
              size={120}
              style={styles.avatar}
            />

            <AppText style={styles.title} text={displayName} />
            <AppText style={styles.handle} text={`@${chat?.handle}`} />
          </View>

          <View style={styles.infoBox}>
            <Icon name="InformationCircleIcon" />
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
              <Icon name="Shield01Icon" size={20} />
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

          <Button
            onPress={handleProceed}
            disabled={isJoining}
            translationKey={isJoining ? "chat.joinCreate.processing" : title}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
    },
    userInfo: {
      alignContent: "center",
      alignItems: "center",
      flex: 1
    },
    avatar: {
      marginBottom: 25,
    },
    title: {
      fontSize: 25,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 10,
      textAlign: "center",
    },
    handle: {
      fontSize: 18,
      color: theme.icon,
      marginBottom: 30,
      textAlign: "center",
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundMain,
      padding: 15,
      borderRadius: 25,
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
      marginBottom: 30,
      gap: 15,
      paddingHorizontal: 10,
    },
    extraInfoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    extraInfoText: {
      flex: 1,
      color: theme.icon,
      fontSize: 13,
      lineHeight: 18,
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });

export default CreateOrJoinChatPanel;
