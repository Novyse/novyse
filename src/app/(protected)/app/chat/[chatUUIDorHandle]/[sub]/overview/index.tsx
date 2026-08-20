import React, { useState, useContext, useMemo } from "react";
import { DateTime } from "luxon";
import { View, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/store/UserStore";
import SegmentedSwitch, {
  ToggleOption,
} from "@/src/components/ui/switch/SegmentedSwitch";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";
import Icon from "@/src/components/ui/icon/Icon";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import Avatar from "@/src/components/ui/avatar/Avatar";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import useChatStore from "@/src/store/ChatStore";
import { BadgeRenderer } from "@/src/components/features/badge/Badges";
import Divider from "@/src/components/ui/divider/Divider";
import SettingsSection from "@/src/components/features/settings/SettingsSection";
import SettingsRow from "@/src/components/features/settings/SettingsRow";

type GroupTab =
  | "members"
  | "media"
  | "files"
  | "links"
  | "music"
  | "voice"
  | "gifs";
type DMTab = "media" | "files" | "links" | "music" | "voice" | "gifs";

const ChatOverview = () => {
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
    onlineMembersCount,
  } = useChatMetadata(chatUUIDorHandle as string, parseInt(sub as string));

  const isDM = chat?.type === "DM";

  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const users = useUserStore((state) => state.users);

  const dmUser = useMemo(() => {
    if (!isDM || !chat?.members) return null;
    const other = chat.members.find(
      (m: any) => (m.uuid || m.userUUID) !== localUserUUID,
    );
    const targetId = other?.uuid;
    return targetId ? users[targetId] || other : null;
  }, [isDM, chat?.members, localUserUUID, users]);

  const [selectedGroupTab, setSelectedGroupTab] = useState<GroupTab>("members");
  const [selectedDMTab, setSelectedDMTab] = useState<DMTab>("media");

  const groupTabs: ToggleOption<GroupTab>[] = [
    { value: "members", label: "Members" },
    { value: "media", label: "Media" },
    { value: "files", label: "Files" },
    { value: "links", label: "Links" },
    { value: "music", label: "Music" },
    { value: "voice", label: "Voice" },
    { value: "gifs", label: "GIFs" },
  ];

  const dmTabs: ToggleOption<DMTab>[] = [
    { value: "media", label: "Media" },
    { value: "files", label: "Files" },
    { value: "links", label: "Links" },
    { value: "music", label: "Music" },
    { value: "voice", label: "Voice" },
    { value: "gifs", label: "GIFs" },
  ];

  const membersCount = chat?.members?.length || 0;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  const files = useMemo(() => {
    if (!chat?.messages) return [];
    return chat.messages
      .filter((msg: any) => msg.files && msg.files.length > 0)
      .flatMap((msg: any) => msg.files);
  }, [chat?.messages]);

  const renderDMUserInfo = () => {
    if (!dmUser) return null;

    return (
      <View style={styles.dmInfoContainer}>
        <View style={styles.dmInfoRow}>
          <View
            style={[
              styles.dmInfoIconContainer,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <Icon name="UserIcon" color={theme.primary} />
          </View>
          <View style={styles.dmInfoContent}>
            <Typography
              weight="semibold"
              translationKey="settings.modifyProfile.username"
            />
            <Typography
              weight="semibold"
              text={
                dmUser.handle
                  ? `@${dmUser.handle}`
                  : t("chat.overview.notSpecified")
              }
            />
          </View>
        </View>

        <View style={[styles.dmInfoRow, { borderBottomWidth: 0 }]}>
          <View
            style={[
              styles.dmInfoIconContainer,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <Icon name="InformationCircleIcon" color={theme.primary} />
          </View>
          <View style={styles.dmInfoContent}>
            <Typography
              weight="semibold"
              translationKey="settings.modifyProfile.biography"
            />
            <Typography
              weight="semibold"
              text={dmUser.biography || t("chat.overview.noDescriptionYet")}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderMembers = (chat: any) => {
    if (!chat?.members || chat.members.length === 0) {
      return (
        <Typography
          variant="subtitle"
          translationKey="chat.overview.noMembers"
        />
      );
    }

    const chatRoles = chat?.roles || [];

    return (
      <View style={styles.listContainer}>
        {chat.members.map((member: any, index: number) => {
          const mUUID = member.uuid || member.userUUID;
          const user = mUUID ? users[mUUID] || member : member;

          const memberRoleIDs = member.roleIDs ||
            member.role_ids ||
            member.roleIds || [2];
          const resolvedRoles = chatRoles.filter((r: any) =>
            memberRoleIDs.some((id: number) => Number(r.id) === Number(id)),
          );

          return (
            <>
              <Pressable
                key={mUUID || index}
                style={styles.memberItem}
                onPress={() => {
                  router.navigate(`/profile/${user.handle}`);
                }}
              >
                {user.profilePictureUUID ? (
                  <Avatar
                    uuid={user.profilePictureUUID || undefined}
                    isOnline={user.status === "ONLINE"}
                    style={styles.memberAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: theme.primary + "33" },
                    ]}
                  >
                    <Typography
                      text={(user.name || user.handle || "?")[0].toUpperCase()}
                    />
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Typography
                    weight="semibold"
                    text={
                      user.name || user.handle || t("chat.listItem.unknown")
                    }
                  />
                  <View style={styles.roleBadgesContainer}>
                    {resolvedRoles.map((role: any) => (
                      <BadgeRenderer key={role.id} badge={role} />
                    ))}
                  </View>
                </View>
                {member.joinedAt && (
                  <Typography
                    size="xs"
                    variant="subtitle"
                    text={DateTime.fromISO(
                      new Date(member.joinedAt).toISOString(),
                      {
                        zone: "utc",
                      },
                    )
                      .toLocal()
                      .toFormat("MMMM d, yyyy")}
                  />
                )}
              </Pressable>
              {index !== chat.members.length - 1 && <Divider />}
            </>
          );
        })}
      </View>
    );
  };

  const renderFiles = () => {
    if (files.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="Folder01Icon" size={48} color={theme.subtitle} />
          <Typography
            size="sm"
            variant="subtitle"
            translationKey="chat.overview.noFiles"
          />
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {files.map((file: any, index: number) => (
          <View key={file.id || index} style={styles.fileItem}>
            <Icon name="File01Icon" size={32} color={theme.primary} />
            <View style={styles.fileInfo}>
              <Typography
                weight="semibold"
                text={file.name || t("common.unnamedFile")}
              />
              <Typography
                size="xs"
                variant="subtitle"
                text={`${(file.size / 1024).toFixed(2)} KB`}
              />
            </View>
            <Icon
              name="Download01Icon"
              color={theme.subtitle}
              onPress={() => {}}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderGroupTabContent = (chat: any) => {
    if (selectedGroupTab === "members") return renderMembers(chat);
    return renderFiles();
  };

  const renderDMTabContent = () => {
    return renderFiles();
  };

  return (
    <>
      <HeaderWithBackArrow
        title={name || (isDM ? "Chat" : "Group")}
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Avatar
              uuid={profilePictureUUID || undefined}
              style={styles.profilePicture}
            />
            <Typography
              variant="subtitle"
              text={
                isDM ? name : t("chat.memberCount", { count: membersCount })
              }
            />
          </View>
        </View>

        {/* Info utente per le DM */}
        {isDM && renderDMUserInfo()}

        <View style={styles.tabsSection}>
          {isDM ? (
            <SegmentedSwitch
              options={dmTabs}
              value={selectedDMTab}
              onChange={(val) => setSelectedDMTab(val)}
            />
          ) : (
            <SegmentedSwitch
              options={groupTabs}
              value={selectedGroupTab}
              onChange={(val) => setSelectedGroupTab(val)}
            />
          )}
        </View>

        <View style={styles.mainContent}>
          {isDM ? renderDMTabContent() : renderGroupTabContent(chat)}
        </View>

        <SettingsSection>
          <SettingsRow
            iconName="Settings01Icon"
            labelKey="chat.overview.actions.settings"
            onPress={() =>
              router.push(
                `/app/chat/${chatUUIDorHandle}/${sub}/settings` as any,
              )
            }
          />
          <SettingsRow
            iconName="StarIcon"
            labelKey="chat.overview.actions.starred_messages"
            onPress={() => {}}
          />
          <SettingsRow
            iconName="Logout01Icon"
            danger
            labelKey="chat.overview.actions.leave"
            onPress={() => {}}
          />
        </SettingsSection>
      </SettingsPageScrollview>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      alignItems: "center",
      position: "relative",
    },
    profileSection: {
      alignItems: "center",
      marginBottom: 30,
    },
    profilePicture: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 15,
    },
    dmInfoContainer: {
      marginHorizontal: 20,
      marginBottom: 24,
      borderRadius: 16,
      backgroundColor: theme.backgroundMainGradient[0],
      overflow: "hidden",
    },
    dmInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dmInfoIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    dmInfoContent: {
      flex: 1,
    },
    tabsSection: {
      marginBottom: 20,
    },
    mainContent: {
      minHeight: 200,
      alignItems: "center",
    },
    listContainer: {
      width: "100%",
    },
    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    memberAvatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      marginRight: 15,
      justifyContent: "center",
      alignItems: "center",
    },
    memberInfo: {
      flex: 1,
    },
    roleBadgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    fileInfo: {
      flex: 1,
      marginLeft: 15,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
  });

export default ChatOverview;
