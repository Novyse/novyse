import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

const RecordingDot = ({ isRecording = false }) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation;

    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      opacityAnim.setValue(1);
      opacityAnim.stopAnimation();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, opacityAnim]);

  return <Animated.View style={[styles(opacityAnim).dot]} />;
};

const styles = (opacityAnim) =>
  StyleSheet.create({
    dot: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
      width: 10,
      height: 10,
      borderRadius: 100,
      backgroundColor: "#FF3B30",
      opacity: opacityAnim,
    },
  });

export default RecordingDot;
