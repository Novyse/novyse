import { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";

import { ThemeContext } from "@/src/context/ThemeContext";

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
        isOnline={isOnline}
        onEdit={onEditAvatar}
        // style={styles.avatar}
      />

      <AppText
        style={styles.nameSurnameText}
        text={`${name} ${surname || ""}`}
      />
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
    avatar: {
      borderColor: theme.backgroundMain,
      borderWidth: 5,
      backgroundColor: theme.backgroundMain,
    },
    nameSurnameText: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 4,
    },
    usernameText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 15,
    },
  });
