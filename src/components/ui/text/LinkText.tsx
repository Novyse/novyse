import { useState, useContext } from "react";
import {
  Animated,
  GestureResponderEvent,
  Linking,
  StyleProp,
  StyleSheet,
  TextStyle,
  Pressable,
} from "react-native";
import AppText from "./AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

const AnimatedAppText = Animated.createAnimatedComponent(AppText);

interface LinkTextProps {
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, any>;
  children?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  href?: string;
  style?: StyleProp<TextStyle>;
  activeOpacity?: number;
}

export default function LinkText({
  text,
  translationKey,
  translationOptions,
  children,
  onPress,
  href,
  style,
  activeOpacity = 0.4,
}: LinkTextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { theme } = useContext(ThemeContext);
  const opacity = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.timing(opacity, {
      toValue: activeOpacity,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (href) {
      Linking.openURL(href);
    }
    onPress?.(e);
  };

  const showUnderline = isHovered || isPressed;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="link"
    >
      <AnimatedAppText
        text={text}
        translationKey={translationKey}
        translationOptions={translationOptions}
        style={[
          styles.base,
          showUnderline && styles.underline,
          { opacity },
          style,
          { color: theme.textLink },
        ]}
        // @ts-ignore - onMouseEnter/onMouseLeave are web-only props
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </AnimatedAppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    textDecorationLine: "none",
    cursor: "pointer",
  } as TextStyle,
  underline: {
    textDecorationLine: "underline",
  },
});
