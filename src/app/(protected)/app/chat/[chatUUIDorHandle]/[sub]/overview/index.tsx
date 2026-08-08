import React, { useState, useContext, useMemo } from "react";
import { DateTime } from "luxon";
import { View, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";
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
import useChatStore from "@/src/context/ChatContext";
import { BadgeRenderer } from "@/src/components/features/badge/Badges";

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
              style={styles.dmInfoLabel}
              translationKey="settings.modifyProfile.username"
            />
            <Typography
              style={styles.dmInfoValue}
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
              style={styles.dmInfoLabel}
              translationKey="settings.modifyProfile.biography"
            />
            <Typography
              style={styles.dmInfoValue}
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
          style={styles.emptyText}
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
                  <Typography style={{ color: theme.primary, fontWeight: "600" }}>
                    {(user.name || user.handle || "?")[0].toUpperCase()}
                  </Typography>
                </View>
              )}
              <View style={styles.memberInfo}>
                <Typography style={styles.memberName}>
                  {user.name || user.handle || t("chat.listItem.unknown")}
                </Typography>
                <View style={styles.roleBadgesContainer}>
                  {resolvedRoles.map((role: any) => (
                    <BadgeRenderer key={role.id} badge={role} />
                  ))}
                </View>
              </View>
              {member.joinedAt && (
                <Typography style={styles.memberJoinedAt}>
                  {DateTime.fromISO(new Date(member.joinedAt).toISOString(), {
                    zone: "utc",
                  })
                    .toLocal()
                    .toFormat("MMMM d, yyyy")}
                </Typography>
              )}
            </Pressable>
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
            style={styles.emptyText}
            translationKey="chat.overview.noFiles"
          />
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {files.map((file: any, index: number) => (
          <View key={file.id || index} style={styles.fileItem}>
            <Icon name="File02Icon" size={32} color={theme.primary} />
            <View style={styles.fileInfo}>
              <Typography style={styles.fileName}>
                {file.name || t("common.unnamedFile")}
              </Typography>
              <Typography
                style={styles.fileSize}
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
            <Typography style={styles.membersLabel}>
              {isDM ? name : t("chat.memberCount", { count: membersCount })}
            </Typography>
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(
                `/app/chat/${chatUUIDorHandle}/${sub}/settings` as any,
              )
            }
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: theme.primary + "15" },
              ]}
            >
              <Icon name="Settings01Icon" color={theme.primary} />
            </View>
            <Typography
              style={[styles.actionText, { color: theme.primary }]}
              translationKey="common.settings"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {}}
            disabled
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: theme.backgroundDanger + "15" },
              ]}
            >
              <Icon
                name={isDM ? "UnavailableIcon" : "Logout01Icon"}
                color={theme.iconDanger}
              />
            </View>
            <Typography
              style={[styles.actionText, { color: theme.iconDanger }]}
              translationKey={isDM ? "common.block" : "common.leave"}
            />
          </TouchableOpacity>
        </View>
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
    backButton: {
      position: "absolute",
      top: 50,
      left: 20,
      zIndex: 10,
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
    groupName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 5,
    },
    membersLabel: {
      fontSize: 16,
      color: theme.subtitle,
      fontWeight: "500",
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
    dmInfoLabel: {
      fontSize: 12,
      color: theme.subtitle,
      marginBottom: 2,
    },
    dmInfoValue: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.text,
    },
    tabsSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    mainContent: {
      paddingHorizontal: 20,
      minHeight: 200,
    },
    listContainer: {
      width: "100%",
    },
    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
    memberName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    memberRole: {
      fontSize: 14,
      color: theme.subtitle,
      marginTop: 2,
    },
    roleBadgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
    },
    roleBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },
    memberJoinedAt: {
      fontSize: 12,
      color: theme.subtitle,
      opacity: 0.7,
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
    fileName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    fileSize: {
      fontSize: 13,
      color: theme.subtitle,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyText: {
      marginTop: 15,
      fontSize: 15,
      color: theme.subtitle,
      textAlign: "center",
    },
    actions: {
      marginTop: 30,
      paddingHorizontal: 20,
      gap: 15,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      borderRadius: 16,
      backgroundColor: theme.backgroundMainGradient[0],
    },
    actionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    actionText: {
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default ChatOverview;
