import { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { ThemeContext } from "@/src/context/ThemeContext";

import Avatar from "@/src/components/ui/avatar/Avatar";
import Badges from "@/src/components/features/badge/Badges";

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

      <View style={styles.nameSurnameContainer}>
        {name && <Typography size="xxl" weight="semibold" text={name} />}
        {surname && <Typography size="xxl" weight="semibold" text={surname} />}
      </View>

      <Typography size="sm" text={`@${username}`} />

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
      gap: 15,
    },
    avatar: {
      borderColor: theme.backgroundMain,
      borderWidth: 5,
      backgroundColor: theme.backgroundMain,
    },
    nameSurnameContainer: {
      flexDirection: "row",
      gap: 10,
    },
  });
