import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";

import AppText from "@/src/components/ui/text/AppText";
import AppHeader from "@/src/components/features/header/AppHeader";
import { headerIconButtonStyle } from "@/src/components/features/header/AppHeaderRow";
import Icon from "@/src/components/ui/icon/Icon";
import { ThemeContext } from "@/src/context/ThemeContext";

interface HeaderWithBackArrowProps {
  title?: string;
  translationKey?: string;
  onBack?: () => void;
}

const HeaderWithBackArrow = ({
  title,
  translationKey,
  onBack,
}: HeaderWithBackArrowProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const titleNode = translationKey ? (
    <AppText
      style={styles.titleText}
      translationKey={translationKey}
      numberOfLines={1}
    />
  ) : title ? (
    <AppText style={styles.titleText} text={title} numberOfLines={1} />
  ) : null;

  return (
    <AppHeader
      left={
        onBack ? (
          <Icon
            name="ArrowLeft02Icon"
            onPress={onBack}
            style={headerIconButtonStyle.iconButton}
          />
        ) : undefined
      }
      center={titleNode}
      right={<View style={headerIconButtonStyle.iconButton} />}
    />
  );
};

const createStyle = (theme: { text: string }) =>
  StyleSheet.create({
    titleText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      textAlign: "center",
    },
  });

export default HeaderWithBackArrow;
