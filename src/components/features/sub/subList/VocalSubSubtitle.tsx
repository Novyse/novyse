import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import useCommsData from "@/src/hooks/comms/useCommsData";
import useUserStore from "@/src/store/UserStore";
import Avatar from "@/src/components/ui/avatar/Avatar";

const VocalSubSubtitle = ({ chatUUID, subId, defaultPreview }) => {
  const { participants } = useCommsData(chatUUID, subId);
  const getUser = useUserStore((state) => state.getUser);

  const styles = createStyle();

  if (!participants || participants.length === 0) {
    return (
      <Typography
        size="sm"
        variant="subtitle"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        <Typography size="sm" variant="subtitle" text={defaultPreview || ""} />
      </Typography>
    );
  }

  const avatars = participants.slice(0, 3);

  return (
    <View style={styles.reactionAvatars}>
      {avatars.map((p) => {
        const uUUID = p.identity || p.participantInfo?.identity;
        const user = getUser(uUUID);
        return (
          <View key={uUUID} style={[styles.reactionAvatarContainer]}>
            <Avatar uuid={user?.profilePictureUUID} size={18} />
          </View>
        );
      })}
      {participants.length > 3 && (
        <Typography
          size="sm"
          variant="subtitle"
          numberOfLines={1}
          ellipsizeMode="tail"
          text={`+${participants.length - 3}`}
        />
      )}
    </View>
  );
};

function createStyle() {
  return StyleSheet.create({
    reactionAvatars: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    reactionAvatarContainer: {
      borderRadius: 999,
    },
  });
}

export default VocalSubSubtitle;
