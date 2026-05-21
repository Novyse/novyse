import React, { useContext, useState } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { ThemeContext, Theme } from "@/src/context/ThemeContext";
import Icon from "@/src/components/Icon";

interface PanelResizeHandleProps {
  panHandlers: object;
}

export default function PanelResizeHandle({ panHandlers }: PanelResizeHandleProps) {
  const { theme } = useContext(ThemeContext);
  const [hovered, setHovered] = useState(false);
  const styles = createStyles(theme);

  const webHover =
    Platform.OS === "web"
      ? {
          // @ts-ignore — web only
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        }
      : {};

  return (
    <View {...panHandlers} {...webHover} style={styles.hitArea}>
      {hovered && (
        <View pointerEvents="none" style={styles.pill}>
          <Icon name="ArrowLeft01Icon" size={12} color={theme.icon} />
        </View>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    hitArea: {
      position: "absolute",
      left: -12,
      top: 0,
      bottom: 0,
      width: 24,
      zIndex: 10,
      justifyContent: "center",
      alignItems: "flex-end",
      ...(Platform.OS === "web" && ({ cursor: "ew-resize" } as object)),
    },
    pill: {
      width: 14,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.backgroundMain,
      borderColor: theme.borderColor,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -2,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
    },
  });
}
