import React, { useMemo, useContext } from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

export interface TypographyProps extends RNTextProps {
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, any>;
  fontFamily?: string;
  children?: React.ReactNode;
  color?: string;
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
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const {theme} = useContext(ThemeContext);

    const content = useMemo(() => {
      if (text !== undefined && text !== null) {
        return text;
      }
      if (translationKey) {
        return t(translationKey, translationOptions as any);
      }
      return children;
    }, [text, translationKey, translationOptions, t, children]);

    return (
      <RNText
        ref={ref}
        style={[
          fontFamily ? { fontFamily } : undefined,
          { color: color || theme.text },
          style,
        ]}
        selectable={false}
        {...rest}
      >
        {content as any}
      </RNText>
    );
  },
);

export default Typography;
