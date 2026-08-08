import React, { useMemo, useContext } from "react";
import { Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import {
  typography,
  typographyDefaults,
  getTypographyColor,
  type TypographySize,
  type TypographyWeight,
  type TypographyVariant,
} from "@/constants/typography";

export interface TypographyProps extends RNTextProps {
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, unknown>;
  fontFamily?: string;
  children?: React.ReactNode;
  /** Explicit color override — takes priority over `variant`. */
  color?: string;
  /** Preset font size from the typography scale. Default: `md` (16). */
  size?: TypographySize;
  /** Preset font weight from the typography scale. Default: `regular`. */
  weight?: TypographyWeight;
  /** Semantic color preset mapped to theme tokens. Default: `default` (`theme.text`). */
  variant?: TypographyVariant;
}

const Typography = React.forwardRef<RNText, TypographyProps>(
  (
    {
      text,
      translationKey,
      translationOptions,
      children,
      style,
      fontFamily,
      color,
      size = typographyDefaults.size,
      weight = typographyDefaults.weight,
      variant = typographyDefaults.variant,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const { theme } = useContext(ThemeContext);

    const content = useMemo(() => {
      if (text !== undefined && text !== null) {
        return text;
      }
      if (translationKey) {
        return t(translationKey, translationOptions as Record<string, string>);
      }
      return children;
    }, [text, translationKey, translationOptions, t, children]);

    const resolvedStyle = useMemo<TextStyle>(
      () => ({
        fontSize: typography.sizes[size],
        fontWeight: typography.weights[weight],
        color: color ?? getTypographyColor(theme, variant),
        ...(fontFamily ? { fontFamily } : null),
      }),
      [size, weight, color, variant, theme, fontFamily],
    );

    return (
      <RNText ref={ref} style={[resolvedStyle, style]} selectable={false} {...rest}>
        {content as React.ReactNode}
      </RNText>
    );
  },
);

Typography.displayName = "Typography";

export default Typography;
