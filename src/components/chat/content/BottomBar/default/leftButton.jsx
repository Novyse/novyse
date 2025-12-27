import React, { useContext, useEffect, useRef } from "react";
import { StyleSheet, Animated } from "react-native";

import BlurredView from "@/src/components/BlurredView";

import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";

const LeftButton = ({
  isRecording,
  isFileMenuOpen = false,
  onToggleFileMenu,
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
      toValue: isFileMenuOpen || isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isFileMenuOpen, isRecording]);

  return (
    <BlurredView style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Icon
          name="PlusSignIcon"
          onPress={isRecording ? onCancelVocal : onToggleFileMenu}
          style={styles.icon}
        />
      </Animated.View>
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
