import React, { useEffect, useRef, useContext } from "react";
import { Animated, StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

interface RecordingDotProps {
  isRecording?: boolean;
}

const RecordingDot = ({ isRecording = false }: RecordingDotProps) => {
  const { theme } = useContext(ThemeContext);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;

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
        ]),
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

  return <Animated.View style={[styles(opacityAnim, theme).dot]} />;
};

const styles = (opacityAnim: Animated.Value, theme: any) =>
  StyleSheet.create({
    dot: {
      boxShadow: `0px 2px 3px ${theme.shadowColor}`,
      elevation: 3,
      width: 10,
      height: 10,
      borderRadius: 100,
      backgroundColor: theme.dangerText,
      opacity: opacityAnim as any,
    },
  });

export default RecordingDot;
