import { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
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
            />

            <Typography size="xxl" weight="semibold" text={displayName} />
            <Typography size="lg" weight="semibold" text={`@${chat?.handle}`} />
          </View>

          <View style={styles.infoBox}>
            <View style={styles.iconSlot}>
              <Icon name="InformationCircleIcon" size={20} />
            </View>
            <View style={styles.textSlot}>
              <Typography
                size="sm"
                translationKey={
                  isUser
                    ? "chat.joinCreate.joinUserDesc"
                    : "chat.joinCreate.joinChatDesc"
                }
              />
            </View>
          </View>

          <View style={styles.extraInfoContainer}>
            <View style={styles.extraInfoItem}>
              <View style={styles.iconSlot}>
                <Icon name="Shield01Icon" size={20} />
              </View>
              <View style={styles.textSlot}>
                <Typography
                  size="sm"
                  translationKey={
                    isUser
                      ? "chat.joinCreate.securityWip"
                      : "chat.joinCreate.publicChannelDesc"
                  }
                />
              </View>
            </View>
            <View style={styles.extraInfoItem}>
              <View style={styles.iconSlot}>
                <Icon name="NotificationOff01Icon" size={20} />
              </View>
              <View style={styles.textSlot}>
                <Typography
                  size="sm"
                  translationKey="chat.joinCreate.notificationMuteDesc"
                />
              </View>
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
      padding: 25,
    },
    content: {
      width: "100%",
      maxWidth: 400,
      gap: 25
    },
    userInfo: {
      alignContent: "center",
      alignItems: "center",
      flex: 1,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      backgroundColor: theme.backgroundMain,
      padding: 15,
      borderRadius: 25,
      width: "100%",
    },
    extraInfoContainer: {
      width: "100%",
      gap: 25,
      paddingHorizontal: 15,
    },
    extraInfoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    iconSlot: {
      flexShrink: 0,
    },
    textSlot: {
      flex: 1,
      minWidth: 0,
    },
  });

export default CreateOrJoinChatPanel;
