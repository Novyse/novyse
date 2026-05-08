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
import { ThemeContext } from "@/context/ThemeContext";

const AnimatedAppText = Animated.createAnimatedComponent(AppText);

interface TextLinkProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  href?: string;
  style?: StyleProp<TextStyle>;
  activeOpacity?: number;
}

export default function TextLink({
  children,
  onPress,
  href,
  style,
  activeOpacity = 0.4,
}: TextLinkProps) {
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
        style={[
          styles.base,
          showUnderline && styles.underline,
          { opacity },
          style,
          {color: theme.textLink}
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
