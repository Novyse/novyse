import React, { useRef, useEffect, useContext } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import Avatar from "@/src/components/ui/avatar/Avatar";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";
import ReactionParticles from "./ReactionParticles";

interface ReactionPillProps {
  reactionObj: {
    emoji: string;
    userUUIDs: string[];
  };
  message: any;
  onReaction: (message: any, emoji: string) => void;
  messageMountedAt: number;
}

export const ReactionPill = ({
  reactionObj,
  message,
  onReaction,
  messageMountedAt,
}: ReactionPillProps) => {
  const { theme } = useContext(ThemeContext);
  const getUser = useUserStore((state) => state.getUser);

  const particleRef = useRef<any>(null);
  const countRef = useRef<number>(reactionObj.userUUIDs.length);
  const messageIdRef = useRef<string>(message.id);

  useEffect(() => {
    if (messageIdRef.current !== message.id) return;

    const messageAge = Date.now() - messageMountedAt;
    if (messageAge > 600) {
      const timer = setTimeout(() => {
        particleRef.current?.trigger(reactionObj.emoji, 24, 12);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messageMountedAt, reactionObj.emoji]);

  useEffect(() => {
    if (messageIdRef.current !== message.id) {
      // View was recycled for a different message
      messageIdRef.current = message.id;
      countRef.current = reactionObj.userUUIDs.length;
      return;
    }

    const prevCount = countRef.current;
    const currentCount = reactionObj.userUUIDs.length;
    if (currentCount > prevCount) {
      particleRef.current?.trigger(reactionObj.emoji, 24, 12);
    }
    countRef.current = currentCount;
  }, [reactionObj.userUUIDs.length, reactionObj.emoji, message.id]);

  const avatars = reactionObj.userUUIDs.slice(0, 2);
  const styles = createStyles(theme);

  return (
    <Pressable
      style={styles.reactionPill}
      onPress={() => onReaction(message, reactionObj.emoji)}
    >
      <AppText style={styles.reactionPillText} text={reactionObj.emoji} />
      <View style={styles.reactionAvatars}>
        {avatars.map((uUUID, i) => (
          <View
            key={uUUID}
            style={[
              styles.reactionAvatarContainer,
              i > 0 && styles.reactionAvatarOverlap,
            ]}
          >
            <Avatar
              uuid={getUser(uUUID)?.profilePictureUUID}
              size={16}
            />
          </View>
        ))}
      </View>
      {reactionObj.userUUIDs.length > 2 && (
        <AppText
          style={styles.reactionPillText}
          text={`+${reactionObj.userUUIDs.length - 2}`}
        />
      )}
      <ReactionParticles ref={particleRef} />
    </Pressable>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    reactionPill: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: theme.borderColor,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    reactionPillText: {
      fontSize: 12,
      color: theme.text,
    },
    reactionAvatars: {
      flexDirection: "row",
      alignItems: "center",
    },
    reactionAvatarContainer: {
      borderRadius: 999,
    },
    reactionAvatarOverlap: {
      marginLeft: -8,
    },
  });

export default ReactionPill;
