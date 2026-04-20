import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

import { ThemeContext } from "@/context/ThemeContext";

import Avatar from "@/src/components/Avatar";
import Badges from "@/src/components/badge/Badges";

interface ProfileHeaderProps {
  uuid: string;
  name: string;
  surname: string;
  username: string;
  profilePictureUUID?: string;
  isOnline?: boolean;
  onEditAvatar?: () => void;
}

export default function ProfileHeader({
  uuid,
  name,
  surname,
  username,
  profilePictureUUID,
  isOnline = false,
  onEditAvatar = undefined,
}: ProfileHeaderProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.profileHeader}>
      <Avatar
        uuid={profilePictureUUID}
        size={120}
        theme={theme}
        isOnline={isOnline}
        onEdit={onEditAvatar}
        // style={styles.avatar}
      />

      <AppText style={styles.nameSurnameText} text={`${name} ${surname || ""}`} />
      <AppText style={styles.usernameText} text={`@${username}`} />

      <Badges userUUID={uuid} />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    profileHeader: {
      alignItems: "center",
      marginTop: -60,
      paddingHorizontal: 20,
    },
    avatarContainer: {
      position: "relative",
    },
    editAvatarBtn: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: theme.backgroundCard,
      borderRadius: 999,
      padding: 6,
    },
    avatar: {
      borderColor: "#123367",
      borderWidth: 5,
      backgroundColor: "#123367",
    },
    nameSurnameText: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      marginBottom: 4,
    },
    usernameText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 16,
    },
    badgesRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 30,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    badgeText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 6,
    },
  });
