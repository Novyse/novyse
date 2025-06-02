import React, { useContext, useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue,
  Easing
} from 'react-native-reanimated';
import VocalBottomBarButton from "./VocalBottomBarButton";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  ComputerScreenShareIcon,
} from "@hugeicons/core-free-icons";
import utils from "../../utils/webrtc/utils";
const { self, check } = utils;

const BigFloatingCommsMenu = ({
  onScreenShare = () => {},
}) => {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  // Animated values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(50);

  // Stato per audio/video
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  useEffect(() => {
    // Trigger entrance animation when component mounts
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withSpring(1, {
      mass: 1,
      damping: 12,
      stiffness: 100,
    });
    translateY.value = withSpring(0, {
      mass: 1,
      damping: 12,
      stiffness: 100,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
    };
  });

  // Funzioni per toggle
  const toggleAudio = async () => {
    setIsAudioEnabled(await self.toggleAudio());
  };
  const toggleVideo = async () => {
    setIsVideoEnabled(await self.toggleVideo());
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.View style={styles.menuItems}>
        <VocalBottomBarButton
          onPress={toggleAudio}
          iconName={isAudioEnabled ? Mic02Icon : MicOff02Icon}
          iconColor="#fff"
        />
        <VocalBottomBarButton
          onPress={toggleVideo}
          iconName={isVideoEnabled ? Video02Icon : VideoOffIcon}
          iconColor="#fff"
        />
        <VocalBottomBarButton
          onPress={onScreenShare}
          iconName={ComputerScreenShareIcon}
          iconColor="#fff"
        />
      </Animated.View>
    </Animated.View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      zIndex: 999,
      alignItems: "center",
      bottom: 10,
      left: 10,
      right: 10,
      backgroundColor: theme.bigFloatingCommsMenu,
      paddingHorizontal: 10,
      paddingVertical: 30,
      borderRadius: 13,
    },
    menuItems: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
  });
}

export default BigFloatingCommsMenu;