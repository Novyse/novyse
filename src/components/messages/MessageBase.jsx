import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  useAnimatedReaction,
  useAnimatedProps,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";

import { useThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";
import useChatStore from "@/context/ChatContext";
import Icon from "../Icon";

import useMessageGestures from "@/src/hooks/chat/useMessageGestures";
import { getPlatform } from "@/src/utils/device/type";

import BlurredView from "../BlurredView";
import { getFileType } from "@/src/utils/storage/file/type";
import { defaultWaveform } from "@/src/utils/storage/file/media";

import MessageTimestamp from "./MessageTimestamp";
import Avatar from "../Avatar";

import MessageMedia from "./MessageMedia";
import MessageOther from "./MessageOther";
import MessageAudio from "./MessageAudio";
import MessageVoice from "./MessageVoice";
import MessageText from "./MessageText";
import MessageReply from "./MessageReply";

const REPLY_THRESHOLD = 60;
const MAX_SWIPE_DISTANCE = 90;
const CIRCLE_SIZE = 36;
const STROKE_WIDTH = 2;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const RightAction = ({ dragX, theme }) => {
  const hasTriggeredHaptic = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useAnimatedReaction(
    () => Math.abs(dragX.value),
    (drag) => {
      "worklet";
      if (drag >= REPLY_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        scheduleOnRN(triggerHaptic);
      } else if (drag < REPLY_THRESHOLD && hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = false;
      }
    },
  );

  const animatedCircleProps = useAnimatedProps(() => {
    const drag = Math.abs(dragX.value);
    const percentage = Math.min(drag / REPLY_THRESHOLD, 1);
    const strokeDashoffset = CIRCUMFERENCE * (1 - percentage);
    return { strokeDashoffset };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const drag = Math.abs(dragX.value);
    const opacity = interpolate(drag, [0, 20], [0, 1], "clamp");
    const scale = interpolate(drag, [0, REPLY_THRESHOLD], [0.7, 1.1], "clamp");
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={rightActionStyles.container}>
      <Reanimated.View style={[rightActionStyles.iconContainer, animatedStyle]}>
        <Svg
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          style={rightActionStyles.svg}
        >
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={theme.text}
            strokeWidth={STROKE_WIDTH}
            strokeOpacity={0.15}
            fill="transparent"
          />
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={theme.text}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>
        <Icon name="ArrowMoveUpLeftIcon" size={18} color={theme.text} />
      </Reanimated.View>
    </View>
  );
};

const rightActionStyles = StyleSheet.create({
  container: {
    width: MAX_SWIPE_DISTANCE,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 5,
  },
  iconContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
});

const MessageReplyWrapper = ({ replyTo, oldChatUUID, oldMessageID }) => {
  const chatStore = useChatStore();
  const replyMessage = chatStore.getMessage(replyTo?.chatUUID, replyTo?.messageID);

  if (!replyMessage) return null;

  return (
    <MessageReply
      senderName={replyMessage.sender_name}
      text={replyMessage.content}
      chatUUID={replyTo?.chatUUID}
      messageID={replyTo?.messageID}
      oldChatUUID={oldChatUUID}
      oldMessageID={oldMessageID}
    />
  );
};

const MessageBase = ({
  message,
  isSender,
  isSelected,
  isPinned,
  isEdited,
  isHighlighted,
  setTriggeredMessage,
  setTriggeredMessagePosition,
  selectedMessage,
  setSelectedMessage,
  onReply,
  onReaction,
}) => {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme);

  const {
    onMessageRightPress,
    onMessagePress,
    onMessageDoublePress,
    onMessageLongPress,
  } = useMessageGestures(
    setTriggeredMessage,
    setTriggeredMessagePosition,
    selectedMessage,
    setSelectedMessage,
    onReply,
    onReaction,
  );

  const swipeableRef = React.useRef(null);
  const {
    content,
    created_at,
    showSenderName,
    showAvatar,
    sender_name,
    files = [],
    replyTos,
  } = message;

  const highlightOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(400, withTiming(0.2, { duration: 600 })),
        withTiming(1, { duration: 400 }),
        withDelay(400, withTiming(0, { duration: 1000 })),
      );
    } else {
      highlightOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isHighlighted]);

  const animatedHighlightStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.primary || "#007AFF",
    opacity: highlightOpacity.value * 0.4,
    ...StyleSheet.absoluteFillObject,
  }));

  const groupBy = (array, callback) => {
    return array.reduce((acc, item) => {
      const key = callback(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const fileGroups = {
    voice: groupBy(files, (f) => getFileType(f.mimeType, f.name) === "VOICE"),
    audio: groupBy(files, (f) => getFileType(f.mimeType, f.name) === "AUDIO"),
    media: groupBy(files, (f) =>
      ["IMAGE", "VIDEO"].includes(getFileType(f.mimeType)),
    ),
    other: groupBy(files, (f) =>
      ["DOCUMENT", "CODE", "ARCHIVE", "OTHER"].includes(
        getFileType(f.mimeType),
      ),
    ),
  };

  const hasOnlyMedia =
    (!content || content.trim().length === 0) &&
    (fileGroups.media.true || []).length > 0;

  const sharedContent = (
    <View style={hasOnlyMedia ? styles.mediaContainer : styles.textContainer}>
      {replyTos && replyTos.length > 0 && (
        <View style={styles.replyTosContainer}>
          {replyTos.map((reply, index) => (
            <MessageReplyWrapper
              key={`${reply.chatUUID}-${reply.messageID}-${index}`}
              replyTo={reply}
              oldChatUUID={message.chatUUID}
              oldMessageID={message.id}
            />
          ))}
        </View>
      )}
      {fileGroups.media.true && <MessageMedia medias={fileGroups.media.true} />}
      {(fileGroups.other.true || []).map((f) => (
        <MessageOther key={f.uuid} fileRef={f.ref} uuid={f.uuid} mimeType={f.mimeType} size={f.size} name={f.name} />
      ))}
      <View style={{ width: "100%" }}>
        {(fileGroups.audio.true || []).map((f) => (
          <MessageAudio
            key={f.uuid}
            audioRef={f.ref}
            uuid={f.uuid}
            size={f.size}
            name={f.name}
            message={message}
            duration={f.duration}
          />
        ))}
      </View>
      <View style={{ width: "100%" }}>
        {(fileGroups.voice.true || []).map((f) => (
          <MessageVoice
            key={f.uuid}
            audioRef={f.ref}
            uuid={f.uuid}
            message={message}
            duration={f.duration}
            waveform={
              Array.isArray(f.waveform)
                ? f.waveform
                : JSON.parse(f.waveform || JSON.stringify(defaultWaveform))
            }
          />
        ))}
      </View>
      {content?.trim().length > 0 && (
        <View style={content.trim().length < 50 ? styles.textRow : null}>
          <MessageText text={content} />
          <MessageTimestamp
            time={created_at}
            isEdited={isEdited}
            isPendingEdit={!!message.pendingEditJobId}
            isPinned={isPinned}
          />
        </View>
      )}
      {!content?.trim() && (
        <MessageTimestamp
          time={created_at}
          isEdited={isEdited}
          isPendingEdit={!!message.pendingEditJobId}
          isPinned={isPinned}
        />
      )}
      {message.reactions && message.reactions.length > 0 && (
        <View style={styles.reactionsContainer}>
          {message.reactions.map((reactionObj, index) => {
            return (
              <Pressable
                key={`${reactionObj.emoji}-${index}`}
                style={styles.reactionPill}
                onPress={() => onReaction(message, reactionObj.emoji)}
              >
                <Text style={styles.reactionPillText}>
                  {reactionObj.emoji} {reactionObj.userUUIDs.length}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const blurredViewStyles = isSender
    ? [styles.senderBubble, showAvatar && styles.senderBubbleChained]
    : [styles.receiverBubble, showAvatar && styles.receiverBubbleWithAvatar];

  const messageContent = (
    <Pressable
      onPress={(e) => onMessagePress(e, message)}
      onLongPress={(e) => onMessageLongPress(e, message)}
      onContextMenu={(e) => {
        e.preventDefault();
        onMessageRightPress(e, message);
      }}
      onDoubleClick={(e) => onMessageDoublePress(e, message)}
      style={isSender ? styles.pressable : styles.pressableReceiver}
    >
      {!isSender && showAvatar && (
        <View style={styles.avatarWrapper}>
          <Avatar size={45} uuid={message.profile_picture_uuid} />
        </View>
      )}
      <BlurredView isBorderActive={false} style={blurredViewStyles}>
        {!isSender && (
          <View style={styles.senderNameWrapper}>
            {showSenderName && (
              <Text style={styles.senderName} numberOfLines={1}>
                {sender_name}
              </Text>
            )}
            {getPlatform() !== "mobile" && (
              <Text style={styles.replyText} onPress={() => onReply(message)}>
                Reply
              </Text>
            )}
          </View>
        )}
        {sharedContent}
        {isSelected && !isSmallScreen && (
          <View style={styles.selectedOverlay} />
        )}
      </BlurredView>
    </Pressable>
  );

  return (
    <>
      <View style={styles.container}>
        <Reanimated.View
          style={[animatedHighlightStyle, { zIndex: -1 }]}
          pointerEvents="none"
        />
        {isSmallScreen ? (
          <ReanimatedSwipeable
            ref={swipeableRef}
            friction={1}
            rightThreshold={REPLY_THRESHOLD}
            overshootRight={false}
            activeOffsetX={[-1, 1]}
            failOffsetY={[-30, 30]}
            animationOptions={{
              damping: 25,
              stiffness: 180,
              mass: 0.8,
              overshootClamping: true,
            }}
            renderRightActions={(_, dragX) => (
              <RightAction dragX={dragX} theme={theme} />
            )}
            onSwipeableWillOpen={() => {
              onReply(message);
              swipeableRef.current?.close();
            }}
          >
            {messageContent}
          </ReanimatedSwipeable>
        ) : (
          messageContent
        )}
      </View>
      {isSelected && isSmallScreen && <View style={styles.selectedOverlay} />}
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: { width: "100%", position: "relative" },
    pressable: { width: "100%", paddingHorizontal: 10 },
    pressableReceiver: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-end",
    },
    senderBubble: {
      marginVertical: 4,
      maxWidth: "80%",
      borderRadius: 18,
      alignSelf: "flex-end",
      overflow: "hidden",
    },
    senderBubbleChained: { borderBottomRightRadius: 4 },
    receiverBubble: {
      marginVertical: 4,
      marginLeft: 65,
      maxWidth: "80%",
      borderRadius: 18,
      alignSelf: "flex-start",
      overflow: "hidden",
    },
    receiverBubbleWithAvatar: { marginLeft: 5, borderBottomLeftRadius: 4 },
    textContainer: {
      flexDirection: "column",
      paddingHorizontal: 12,
      paddingBottom: 8,
      width: "100%",
    },
    mediaContainer: { flexDirection: "column", width: "100%" },
    replyTosContainer: {
      marginBottom: 4,
    },
    textRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
    },
    avatarWrapper: {
      marginLeft: 10,
      marginRight: 5,
      marginBottom: 5,
      width: 45,
      height: 45,
    },
    senderNameWrapper: {
      paddingHorizontal: 12,
      paddingTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    senderName: { fontWeight: "600", color: theme.text, flexShrink: 1 },
    replyText: { color: "#c5d1dddb", marginLeft: "auto" },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(174, 213, 255, 0.5)",
      zIndex: 1,
      pointerEvents: "none",
    },
    reactionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 4,
      gap: 4,
    },
    reactionPill: {
      backgroundColor: theme.backgroundSecondary || "rgba(255,255,255,0.1)",
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    reactionPillText: {
      fontSize: 12,
      color: theme.text,
    },
  });

export default React.memo(
  MessageBase,
  (prev, next) =>
    prev.message === next.message &&
    prev.isSender === next.isSender &&
    prev.isSelected === next.isSelected &&
    prev.selectedMessage === next.selectedMessage &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isPinned === next.isPinned &&
    prev.isEdited === next.isEdited,
);
