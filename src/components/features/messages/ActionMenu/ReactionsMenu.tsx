import React, { useState, useRef } from "react";
import { StyleSheet, Animated, View } from "react-native";
import { EmojiPicker } from "@/src/components/features/chat/content/emoji/EmojiPicker";
import BlurredView from "@/src/components/layout/BlurredView";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurredView);

interface ReactionMenuProps {
  onReaction: (emoji: string) => void;
}

const ReactionMenu: React.FC<ReactionMenuProps> = ({ onReaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const animHeight = useRef(new Animated.Value(44)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  const handleExpand = () => {
    setIsExpanded(true);

    animHeight.setValue(44);
    animOpacity.setValue(0);
    animScale.setValue(0.9);

    Animated.parallel([
      Animated.spring(animHeight, {
        toValue: 306,
        damping: 17,
        stiffness: 130,
        useNativeDriver: false,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.spring(animScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const styles = createStyle( animHeight, animOpacity, animScale);

  return (
    <View style={styles.wrapper}>
      <View style={styles.placeholder} />
      <AnimatedBlurView style={styles.container}>
        {isExpanded ? (
          <EmojiPicker mode="full" onSelectEmoji={onReaction} />
        ) : (
          <EmojiPicker
            mode="quick"
            onSelectEmoji={onReaction}
            onExpandMenu={handleExpand}
            defaultWidth={175}
          />
        )}
      </AnimatedBlurView>
    </View>
  );
};

export default ReactionMenu;

const createStyle = (
  animHeight: Animated.Value,
  animOpacity: Animated.Value,
  animScale: Animated.Value,
) =>
  StyleSheet.create({
    wrapper: {
      width: 175,
      position: "relative",
      zIndex: 2000,
    },
    placeholder: {
      width: 175,
      marginBottom: 10,
      height: 44,
    },
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      width: 175,
      zIndex: 2000,
      overflow: "hidden",
      borderRadius: 25,
      height: animHeight,
      opacity: animOpacity,
      transform: [{ scale: animScale }],
    },
  });
