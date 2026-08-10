import React, { useState, useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Avatar from "@/src/components/ui/avatar/Avatar";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import useChatStore from "@/src/context/ChatContext";
import SettingRow from "@/src/components/features/settings/SettingsRow";
import Section from "@/src/components/features/settings/SettingsSection";
import useUserStore from "@/src/context/UserStore";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";
import { Role } from "@/src/types/chat";

const ChatSettings = () => {
  const { theme } = useContext(ThemeContext);
  const { chatUUIDorHandle, sub } = useLocalSearchParams();
  const { t } = useTranslation();

  const chat = useChatStore((state) =>
    state.chats.find((c) => c.uuid === chatUUIDorHandle),
  );
  const {
    name,
    profilePictureUUID,
    type: chatType,
    memberCount,
  } = useChatMetadata(chatUUIDorHandle as string, parseInt(sub as string));

  const isDM = chat?.type === "DM";

  // ── Local toggle states (example) ──
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  const membersCount = chat?.members?.length ?? 0;

  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const myMember = chat?.members?.find((m) => m.uuid === localUserUUID);
  const myRoleIDs = myMember?.roleIDs || [];
  const myRoles = (chat?.roles || []).filter((r) =>
    myRoleIDs.some((id) => Number(r.id) === Number(id)),
  ) as Role[];

  const canManageMembers =
    hasPermission(myRoles, PERMISSIONS.KICK_MEMBER) ||
    hasPermission(myRoles, PERMISSIONS.BAN_MEMBER) ||
    hasPermission(myRoles, PERMISSIONS.ASSIGN_ROLE);
  const canManageInvite = hasPermission(myRoles, PERMISSIONS.MANAGE_INVITE);
  const canManageChat = hasPermission(myRoles, PERMISSIONS.MANAGE_CHAT);

  return (
    <>
      <HeaderWithBackArrow title={t("chat.settings.title")} onBack={onBack} />

      <SettingsPageScrollview>
        <StatusMessage
          type="warning"
          translationKey="common.developerNote"
          closable={false}
        />
        {/* ── Profile header ── */}
        <View style={styles.header}>
          <Avatar
            uuid={profilePictureUUID || undefined}
            style={styles.profilePicture}
          />
          <Typography style={styles.chatName}>
            {name ?? (isDM ? "Chat" : "Group")}
          </Typography>
          <Typography style={styles.chatMeta}>
            {isDM
              ? t("chat.settings.directMessage")
              : t("chat.memberCount", { count: membersCount })}
          </Typography>
        </View>

        {/* ── Notifications ── */}
        <Section titleKey="chat.settings.notifications">
          <SettingRow
            iconName="Notification01Icon"
            labelKey="chat.settings.muteNotifications"
            type="SWITCH"
            isEnabled={muteNotifications}
            onToggle={setMuteNotifications}
          />
          <SettingRow
            iconName="Clock01Icon"
            labelKey="chat.settings.muteDuration"
            valueKey={muteNotifications ? "chat.settings.muteFor8h" : undefined}
            onPress={() => {}}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        {/* ── Appearance & behaviour ── */}
        <Section titleKey="chat.settings.chatOptions">
          <SettingRow
            iconName="Timer02Icon"
            labelKey="chat.settings.disappearingMessages"
            type="SWITCH"
            isEnabled={disappearingMessages}
            onToggle={setDisappearingMessages}
          />
        </Section>

        {/* ── Privacy ── */}
        {isDM && (
          <Section titleKey="chat.settings.privacy">
            <SettingRow
              iconName="Tick02Icon"
              labelKey="chat.settings.readReceipts"
              type="SWITCH"
              isEnabled={readReceipts}
              onToggle={setReadReceipts}
              style={{ borderBottomWidth: 0 }}
            />
          </Section>
        )}

        {/* ── Group-only settings ── */}
        {!isDM && (
          <Section titleKey="chat.settings.groupSettings">
            {canManageInvite && (
              <SettingRow
                iconName="UserAdd01Icon"
                labelKey="chat.settings.addMembers"
                onPress={() => {}}
              />
            )}
            {canManageMembers && (
              <SettingRow
                iconName="UserGroupIcon"
                labelKey="chat.settings.manageMembers"
                onPress={() => {}}
              />
            )}
            {canManageInvite && (
              <SettingRow
                iconName="LinkSquare01Icon"
                labelKey="chat.settings.inviteLink"
                onPress={() => {}}
              />
            )}
            {canManageChat && (
              <SettingRow
                iconName="PencilEdit01Icon"
                labelKey="chat.settings.editGroupInfo"
                onPress={() => {}}
                style={{ borderBottomWidth: 0 }}
              />
            )}
          </Section>
        )}

        {/* ── Danger zone (example only) ── */}
        {isDM && (
          <Section theme={theme} style={{ marginBottom: 40 }}>
            <SettingRow
              iconName="UnavailableIcon"
              labelKey="common.block"
              danger
              onPress={() => {}}
              style={{ borderBottomWidth: 0 }}
            />
          </Section>
        )}
      </SettingsPageScrollview>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    profilePicture: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 14,
    },
    chatName: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    chatMeta: {
      fontSize: 14,
      color: theme.subtitle,
      fontWeight: "500",
    },
  });

export default ChatSettings;
