import React, { useContext, useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Pressable, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import Icon from "@/src/components/ui/icon/Icon";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import { HEADER_ROW_HEIGHT } from "@/constants/headers";

interface CommsHeaderProps {
  connected: boolean;
  roomName: string;
  participantsCount?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SingleWave = ({
  width,
  phaseOffset = 0,
  speed = 2000,
  opacity = 0.6,
  peakHeight = 25,
  frequency = 2.4,
}: {
  width: number;
  phaseOffset?: number;
  speed?: number;
  opacity?: number;
  peakHeight?: number;
  frequency?: number;
}) => {
  const wavePhase = useSharedValue(0);

  useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(wavePhase);
  }, [speed, wavePhase]);

  const animatedProps = useAnimatedProps(() => {
    const waveWidth = width * 0.7;
    const startX = (width - waveWidth) / 2;
    const baseline = HEADER_ROW_HEIGHT;
    const p = wavePhase.value + phaseOffset;
    const segments = 56;
    let d = `M ${startX} ${baseline}`;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + waveWidth * t;
      const envelope = Math.sin(t * Math.PI);
      const spatial1 = Math.sin(t * Math.PI * frequency);
      const spatial2 = Math.sin(t * Math.PI * frequency * 1.8);
      const wave =
        spatial1 * Math.sin(p) * 0.72 + spatial2 * Math.sin(p + 1.1) * 0.38;
      const y = baseline - wave * peakHeight * envelope;
      d += ` L ${x} ${y}`;
    }

    d += ` L ${startX + waveWidth} ${baseline} L ${startX} ${baseline} Z`;

    return { d, opacity };
  }, [width, phaseOffset, opacity, peakHeight, frequency]);

  return <AnimatedPath animatedProps={animatedProps} fill="url(#waveGradient)" />;
};

const CommsHeader: React.FC<CommsHeaderProps> = ({
  connected,
  roomName,
  participantsCount = 0,
}) => {
  const { theme } = useContext(ThemeContext);
  const { room, isSpeakingMap } = useCommsContext();
  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const setContentView = useActiveChatStore((state) => state.setContentView);

  const localIdentity = room?.localParticipant?.identity;
  const isSpeaking = localIdentity ? isSpeakingMap.get(localIdentity) : false;

  const [headerWidth, setHeaderWidth] = useState(0);
  const speakingProgress = useSharedValue(0);

  useEffect(() => {
    speakingProgress.value = withTiming(isSpeaking ? 1 : 0, {
      duration: isSpeaking ? 600 : 700,
      easing: isSpeaking ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    });
  }, [isSpeaking, speakingProgress]);

  const waveOverlayStyle = useAnimatedStyle(() => ({
    opacity: speakingProgress.value,
  }));

  const chatUUID = roomName?.split("_")[0] ?? "";
  const sub = roomName?.split("_")[1] ?? "";
  const {
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    join,
    leave,
  } = useCommsAction(chatUUID, sub);

  const handlePress = () => {
    if (selectedChatUUID === chatUUID) {
      setContentView("vocal");
      return;
    }
    setSelectedChatUUID(chatUUID);
  };

  const onHeaderLayout = (event: LayoutChangeEvent) => {
    setHeaderWidth(event.nativeEvent.layout.width);
  };

  if (!connected && !roomName) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onHeaderLayout}>
      {headerWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.waveSvgContainer, waveOverlayStyle]}
        >
          <Svg height={HEADER_ROW_HEIGHT} width={headerWidth}>
            <Defs>
              <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0%"
                  stopColor={theme.iconSuccess}
                  stopOpacity="0.9"
                />
                <Stop
                  offset="60%"
                  stopColor={theme.iconSuccess}
                  stopOpacity="0.4"
                />
                <Stop
                  offset="100%"
                  stopColor={theme.iconSuccess}
                  stopOpacity="0.05"
                />
              </LinearGradient>
            </Defs>
            <SingleWave
              width={headerWidth}
              phaseOffset={0}
              speed={2600}
              opacity={0.28}
              peakHeight={16}
              frequency={2.1}
            />
            <SingleWave
              width={headerWidth}
              phaseOffset={Math.PI * 0.7}
              speed={1800}
              opacity={0.5}
              peakHeight={22}
              frequency={2.6}
            />
            <SingleWave
              width={headerWidth}
              phaseOffset={Math.PI * 1.4}
              speed={1400}
              opacity={0.7}
              peakHeight={19}
              frequency={3.0}
            />
          </Svg>
        </Animated.View>
      )}

      <AppHeaderRow
        style={styles.headerRow}
        left={
          <Pressable onPress={handlePress} style={styles.headerLeft}>
            <Icon
              name="UserGroupIcon"
              onPress={handlePress}
              style={headerIconButtonStyle.iconButton}
            />
            <Typography
              weight="semibold"
              numberOfLines={1}
              ellipsizeMode="tail"
              translationKey="chat.comms.participantsInCall"
              translationOptions={{ count: participantsCount }}
            />
          </Pressable>
        }
        right={
          connected ? (
            <>
              <Icon
                name={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
                style={headerIconButtonStyle.iconButton}
                onPress={toggleVideo}
              />
              <Icon
                name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                style={headerIconButtonStyle.iconButton}
                onPress={toggleAudio}
              />
              <Icon
                name="Call02Icon"
                color={theme.iconDanger}
                hoverColor={theme.iconDanger}
                style={headerIconButtonStyle.iconButton}
                onPress={leave}
              />
            </>
          ) : (
            <Icon
              name="Call02Icon"
              color={theme.iconSuccess}
              hoverColor={theme.iconSuccess}
              style={headerIconButtonStyle.iconButton}
              onPress={() => join()}
            />
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
  },
  waveSvgContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  headerRow: {
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
});

export default CommsHeader;
