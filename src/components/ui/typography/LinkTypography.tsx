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
import Typography from "./Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import type { TypographySize, TypographyWeight } from "@/constants/typography";

const AnimatedTypography = Animated.createAnimatedComponent(Typography);

interface LinkTextProps {
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, any>;
  children?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  href?: string;
  style?: StyleProp<TextStyle>;
  activeOpacity?: number;
  size?: TypographySize;
  weight?: TypographyWeight;
  color?: string;
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
  size,
  weight,
  color,
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
      <AnimatedTypography
        text={text}
        translationKey={translationKey}
        translationOptions={translationOptions}
        size={size}
        weight={weight}
        color={color ?? theme.textLink}
        style={[
          styles.base,
          showUnderline && styles.underline,
          { opacity },
          style,
        ]}
        // @ts-ignore - onMouseEnter/onMouseLeave are web-only props
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </AnimatedTypography>
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
