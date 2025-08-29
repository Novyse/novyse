import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";
import SmartBackground from "../SmartBackground";
import VocalBottomBarButton from "./VocalBottomBarButton";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  Call02Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";

import methods from "../../utils/webrtc/methods";
const { self, get } = methods;

const BigFloatingCommsMenu = () => {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const router = useRouter();

  // Animated values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(50);
  const [isVisible, setIsVisible] = useState(true);

  // Stato per audio/video
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  useEffect(() => {
    // Load initial audio/video status
    const loadInitialStatus = async () => {
      setIsAudioEnabled(await get.microphoneStatus());
      setIsVideoEnabled(await get.videoStatus());
    };

    loadInitialStatus();

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
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
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
    await new Promise((resolve) => setTimeout(resolve, 200));
    setIsVisible(false);
  };

  const leaveComms = async () => {
    await animateOut(); // Prima anima l'uscita
    self.left(); // Poi esci dalla chiamata
  };

  const navigateToVocalView = () => {
    const commsId = get.commsId();
    if (commsId) {
      // Usa setParams per non ricaricare la pagina
      router.setParams({ chatId: commsId });

      // Imposta direttamente la vista vocal
      setTimeout(() => {
        if (window.setContentView) {
          window.setContentView("vocal");
        }
      }, 50);
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={navigateToVocalView}
        style={styles.pressableContainer}
      >
        <SmartBackground
          colors={theme?.floatingBarComponentsGradient}
          style={styles.gradientBackground}
        >
          <Animated.View style={styles.menuItems}>
            <VocalBottomBarButton
              onPress={toggleAudio}
              iconName={isAudioEnabled ? Mic02Icon : MicOff02Icon}
              iconColor={theme.icon}
            />
            <VocalBottomBarButton
              onPress={toggleVideo}
              iconName={isVideoEnabled ? Video02Icon : VideoOffIcon}
              iconColor={theme.icon}
            />
            <VocalBottomBarButton
              onPress={leaveComms}
              iconName={Call02Icon}
              iconColor={theme.error || "red"}
            />
          </Animated.View>
        </SmartBackground>
      </Pressable>
    </Animated.View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      zIndex: 999,
      alignItems: "center",
      bottom: 15,
      left: 15,
      right: 15,
      borderRadius: 13,
    },
    pressableContainer: {
      width: "100%",
      borderRadius: 13,
    },
    gradientBackground: {
      paddingHorizontal: 10,
      paddingVertical: 30,
      borderRadius: 13,
      width: "100%",
      alignItems: "center",
    },
    menuItems: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
  });
}

export default BigFloatingCommsMenu;
