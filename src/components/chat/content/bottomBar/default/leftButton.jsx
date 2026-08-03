import React, { useContext, useEffect, useRef } from "react";
import { StyleSheet, Animated, Pressable } from "react-native";

import BlurredView from "@/src/components/BlurredView";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

const LeftButton = ({
  isRecording,
  isAttachMenuOpen = false,
  onToggleAttachMenu,
  onCancelVocal,
}) => {
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);

  // Animazione rotazione "+"
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const animatedStyle = {
    transform: [
      {
        rotate: rotationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "45deg"],
        }),
      },
    ],
  };

  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: isAttachMenuOpen || isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isAttachMenuOpen, isRecording]);

  return (
    <BlurredView style={styles.container}>
      <Pressable onPress={isRecording ? onCancelVocal : onToggleAttachMenu}>
        <Animated.View style={animatedStyle}>
          <Icon name="PlusSignIcon" style={styles.icon} />
        </Animated.View>
      </Pressable>
    </BlurredView>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      justifyContent: "center",
      alignItems: "center",
      width: 45,
      height: 45,
      alignItems: "center",
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default LeftButton;
