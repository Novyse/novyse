import React, { useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import { useActiveChatStore } from "@/context/ActiveChatContext";
import useUserStore from "@/context/UserContext";
import ToggleSelector, { ToggleOption } from "@/src/components/ToggleSelector";
import Icon from "@/src/components/Icon";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import Avatar from "@/src/components/Avatar";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

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
  const { chatUUIDorHandle } = useLocalSearchParams();
  const chat = useActiveChatStore((state) => state.activeChatData);
  const { name, profilePictureUUID } = useChatMetadata(
    chatUUIDorHandle as string,
  );

  const isDM = chat?.type === "DM";

  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const users = useUserStore((state) => state.users);

  const dmUser = useMemo(() => {
    if (!isDM || !chat?.members) return null;
    const other = chat.members.find(
      (m: any) => (m.uuid || m.userUUID) !== localUserUUID,
    );
    const targetId = other?.uuid || other?.userUUID;
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
            <Text style={styles.dmInfoLabel}>Username</Text>
            <Text style={styles.dmInfoValue}>
              {dmUser.handle ? `@${dmUser.handle}` : "Non specificato"}
            </Text>
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
            <Text style={styles.dmInfoLabel}>Description</Text>
            <Text style={styles.dmInfoValue}>
              {dmUser.description || "No description yet"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMembers = () => {
    if (!chat?.members || chat.members.length === 0) {
      return <Text style={styles.emptyText}>No members found</Text>;
    }

    return (
      <View style={styles.listContainer}>
        {chat.members.map((member: any, index: number) => {
          const mUUID = member.uuid || member.userUUID;
          const user = mUUID ? users[mUUID] || member : member;

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
                  theme={theme}
                  style={styles.memberAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: theme.primary + "33" },
                  ]}
                >
                  <Text style={{ color: theme.primary, fontWeight: "600" }}>
                    {(user.name || user.handle || "?")[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {user.name || user.handle || "Member"}
                </Text>
                <Text style={styles.memberRole}>{member.role || "Member"}</Text>
              </View>
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
          <Icon name="Folder01Icon" size={48} color={theme.subtitle2} />
          <Text style={styles.emptyText}>No files shared yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {files.map((file: any, index: number) => (
          <View key={file.id || index} style={styles.fileItem}>
            <Icon name="File02Icon" size={32} color={theme.primary} />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>
                {file.name || "File senza nome"}
              </Text>
              <Text style={styles.fileSize}>
                {(file.size / 1024).toFixed(2)} KB
              </Text>
            </View>
            <Icon
              name="Download01Icon"
              color={theme.subtitle2}
              onPress={() => {}}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderGroupTabContent = () => {
    if (selectedGroupTab === "members") return renderMembers();
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
              theme={theme}
              style={styles.profilePicture}
            />
            <Text style={styles.membersLabel}>
              {isDM ? name : `${membersCount} Members`}
            </Text>
          </View>
        </View>

        {/* Info utente per le DM */}
        {isDM && renderDMUserInfo()}

        <View style={styles.tabsSection}>
          {isDM ? (
            <ToggleSelector
              options={dmTabs}
              value={selectedDMTab}
              onChange={(val) => setSelectedDMTab(val)}
            />
          ) : (
            <ToggleSelector
              options={groupTabs}
              value={selectedGroupTab}
              onChange={(val) => setSelectedGroupTab(val)}
            />
          )}
        </View>

        <View style={styles.mainContent}>
          {isDM ? renderDMTabContent() : renderGroupTabContent()}
        </View>

        <View style={styles.actions}>
          {!isDM && (
            <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: theme.primary + "15" },
                ]}
              >
                <Icon name="Settings01Icon" color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.primary }]}>
                Settings
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {}}
            disabled
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF4D4D15" },
              ]}
            >
              <Icon
                name={isDM ? "UnavailableIcon" : "Logout01Icon"}
                color="#FF4D4D"
              />
            </View>
            <Text style={[styles.actionText, { color: "#FF4D4D" }]}>
              {isDM ? "Block" : "Leave"}
            </Text>
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
      color: theme.subtitle2,
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
      borderBottomWidth: 1,
      borderBottomColor: theme.border || "rgba(255,255,255,0.05)",
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
      color: theme.subtitle2,
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
      borderBottomColor: theme.border || "rgba(255,255,255,0.05)",
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
      color: theme.subtitle2,
      marginTop: 2,
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      backgroundColor: "rgba(0,0,0,0.02)",
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
      color: theme.subtitle2,
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
      color: theme.subtitle2,
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
