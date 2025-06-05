import React, { useContext, useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import VocalBottomBarButton from "./VocalBottomBarButton";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  Call02Icon,
} from "@hugeicons/core-free-icons";

import methods from "../../utils/webrtc/methods";
const { self, get } = methods;

const SmallCommsMenu = () => {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  // Animated values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(50);
  const [isVisible, setIsVisible] = useState(true);

  // Stato per audio/video
  const [isAudioEnabled, setIsAudioEnabled] = useState(get.microphoneStatus());
  const [isVideoEnabled, setIsVideoEnabled] = useState(get.videoStatus());

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

  const animateOut = async () => {
    opacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.ease),
    });
    scale.value = withSpring(0.8);
    translateY.value = withSpring(50);

    // Aspetta che l'animazione finisca
    await new Promise(resolve => setTimeout(resolve, 200));
    setIsVisible(false);
  };

  const leaveComms = async () => {
    await animateOut();  // Prima anima l'uscita
    self.left();         // Poi esci dalla chiamata
  };
  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={theme?.floatingBarComponentsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
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
            onPress={leaveComms}
            iconName={Call02Icon}
            iconColor="red"
          />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      borderRadius: 13,
      margin: 10,
    },
    gradientBackground: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 13,
      width: '100%',
      alignItems: 'center',
    },
    menuItems: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
  });
}

export default SmallCommsMenu;