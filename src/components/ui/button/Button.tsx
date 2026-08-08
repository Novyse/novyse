import { useContext, useMemo } from "react";
import { StyleSheet, ViewStyle, TextStyle, StyleProp } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import {
  buttonDefaults,
  getButtonVariantStyle,
  resolveButtonTypographyVariant,
  type ButtonVariant,
} from "@/constants/button";
import type {
  TypographySize,
  TypographyVariant,
  TypographyWeight,
} from "@/constants/typography";

export interface ButtonProps {
  /** Button visual preset. Default: `primary`. */
  variant?: ButtonVariant;
  /** Typography variant for the label. Ignored on variants with a fixed text color (e.g. `danger`). */
  textVariant?: TypographyVariant;
  /** Typography size for the label. Default: `sm`. */
  size?: TypographySize;
  /** Typography weight for the label. Default: `semibold`. */
  weight?: TypographyWeight;
  text?: string;
  translationKey?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hoveredStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}

export default function Button({
  variant = buttonDefaults.variant,
  size = "md",
  weight = "semibold",
  text,
  translationKey,
  onPress,
  disabled = false,
  style,
  textStyle,
  hoveredStyle,
  pressedStyle,
}: ButtonProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles();

  const variantStyle = useMemo(
    () => getButtonVariantStyle(theme, variant),
    [theme, variant],
  );

  const resolvedTextVariant = useMemo(
    () => resolveButtonTypographyVariant(variantStyle),
    [variantStyle],
  );

  return (
    <HoverAndPressedButton
      style={[
        styles.button,
        { backgroundColor: variantStyle.backgroundColor },
        style,
      ]}
      hoveredStyle={[
        styles.hovered,
        { backgroundColor: variantStyle.hoveredBackgroundColor },
        hoveredStyle,
      ]}
      pressedStyle={[
        styles.pressed,
        { backgroundColor: variantStyle.pressedBackgroundColor },
        pressedStyle,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
        <Typography
          text={text}
          translationKey={translationKey}
          size={size}
          weight={weight}
          variant={resolvedTextVariant}
          style={[
            styles.label,
            textStyle,
          ]}
        />
    </HoverAndPressedButton>
  );
}

const createStyles = () =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 100,
      alignSelf: "flex-end",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      textAlign: "center",
    },
    hovered: {
      opacity: 0.9,
    },
    pressed: {
      opacity: 0.8,
    },
  });
