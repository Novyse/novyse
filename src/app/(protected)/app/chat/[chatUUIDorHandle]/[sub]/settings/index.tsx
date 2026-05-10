import React, { useState, useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import StatusMessage from "@/src/components/StatusMessage";
import Avatar from "@/src/components/Avatar";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import useChatStore from "@/src/context/ChatContext";
import SettingRow from "@/src/components/settings/SettingRow";
import Section from "@/src/components/settings/Section";

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
            theme={theme}
            style={styles.profilePicture}
          />
          <AppText style={styles.chatName}>
            {name ?? (isDM ? "Chat" : "Group")}
          </AppText>
          <AppText style={styles.chatMeta}>
            {isDM
              ? t("chat.settings.directMessage")
              : t("chat.memberCount", { count: membersCount })}
          </AppText>
        </View>

        {/* ── Notifications ── */}
        <Section titleKey="chat.settings.notifications">
          <SettingRow
            iconName="Notification01Icon"
            labelText={t("chat.settings.muteNotifications")}
            type="SWITCH"
            isEnabled={muteNotifications}
            onToggle={setMuteNotifications}
          />
          <SettingRow
            iconName="Clock01Icon"
            labelText={t("chat.settings.muteDuration")}
            value={muteNotifications ? t("chat.settings.muteFor8h") : undefined}
            onPress={() => {}}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        {/* ── Appearance & behaviour ── */}
        <Section titleKey="chat.settings.chatOptions">
          <SettingRow
            iconName="Timer02Icon"
            labelText={t("chat.settings.disappearingMessages")}
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
              labelText={t("chat.settings.readReceipts")}
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
            <SettingRow
              iconName="UserAdd01Icon"
              labelText={t("chat.settings.addMembers")}
              onPress={() => {}}
            />
            <SettingRow
              iconName="UserGroupIcon"
              labelText={t("chat.settings.manageMembers")}
              onPress={() => {}}
            />
            <SettingRow
              iconName="LinkSquare01Icon"
              labelText={t("chat.settings.inviteLink")}
              onPress={() => {}}
            />
            <SettingRow
              iconName="PencilEdit01Icon"
              labelText={t("chat.settings.editGroupInfo")}
              onPress={() => {}}
              style={{ borderBottomWidth: 0 }}
            />
          </Section>
        )}

        {/* ── Danger zone (example only) ── */}
        {isDM && (
          <Section theme={theme} style={{ marginBottom: 40 }}>
            <SettingRow
              iconName="UnavailableIcon"
              labelText={t("common.block")}
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
