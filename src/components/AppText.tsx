import React, { useMemo } from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { useTranslation } from "react-i18next";

export interface AppTextProps extends RNTextProps {
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, any>;
  fontFamily?: string;
  children?: React.ReactNode;
}

const AppText = React.forwardRef<RNText, AppTextProps>(
  (
    {
      text,
      translationKey,
      translationOptions,
      children,
      style,
      fontFamily,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation();

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
          style,
        ]}
        {...rest}
      >
        {content as any}
      </RNText>
    );
  },
);

export default AppText;
