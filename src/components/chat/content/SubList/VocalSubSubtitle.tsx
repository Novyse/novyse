import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import useCommsData from "@/src/hooks/comms/useCommsData";
import useUserStore from "@/src/context/UserContext";
import Avatar from "@/src/components/Avatar";

const VocalSubSubtitle = ({
  chatUUID,
  subId,
  theme,
  defaultPreview,
  listStyles,
}) => {
  const { participants } = useCommsData(chatUUID, subId);
  const getUser = useUserStore((state) => state.getUser);

  const styles = useMemo(() => createStyle(theme), [theme]);

  if (!participants || participants.length === 0) {
    return (
      <AppText style={listStyles.preview} numberOfLines={1}>
        {defaultPreview || ""}
      </AppText>
    );
  }

  const avatars = participants.slice(0, 3);

  return (
    <View style={styles.reactionAvatars}>
      {avatars.map((p, i) => {
        const uUUID = p.identity || p.participantInfo?.identity;
        const user = getUser(uUUID);
        return (
          <View key={uUUID} style={[styles.reactionAvatarContainer]}>
            <Avatar uuid={user?.profilePictureUUID} size={18}/>
          </View>
        );
      })}
      {participants.length > 3 && (
        <AppText
          style={styles.reactionPillText}
          text={`+${participants.length - 3}`}
        />
      )}
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    reactionAvatars: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    reactionAvatarContainer: {
      borderRadius: 999,
    },
    reactionPillText: {
      fontSize: 12,
      color: theme.subtitle,
      marginLeft: 4,
    },
  });
}

export default VocalSubSubtitle;
