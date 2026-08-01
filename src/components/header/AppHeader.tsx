import React, { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BlurredView from "@/src/components/BlurredView";
import ChatHeaderBackdrop from "@/src/components/chat/content/header/ChatHeaderBackdrop";
import AppHeaderRow from "@/src/components/header/AppHeaderRow";
import {
  HEADER_INNER_PADDING,
  HEADER_ROW_HEIGHT,
  HEADER_SHELL_PADDING,
} from "@/src/components/header/constants";

interface AppHeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  /** Custom row content; overrides left/center/right when set. */
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Rendered below the blurred panel (e.g. status banner). */
  belowBlur?: React.ReactNode;
  expanded?: boolean;
  collapsed?: boolean;
  fullWidthBackdrop?: boolean;
  onLayout?: (height: number) => void;
  onPress?: () => void;
  style?: ViewStyle;
}

const AppHeader = ({
  left,
  center,
  right,
  children,
  footer,
  belowBlur,
  expanded = false,
  collapsed = false,
  fullWidthBackdrop = false,
  onLayout,
  onPress,
  style,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const [backdropHeight, setBackdropHeight] = useState(0);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      setBackdropHeight(height);
      onLayout?.(height);
    },
    [onLayout],
  );

  const isExpanded = expanded || !!footer;
  const borderRadius = isExpanded ? 15 : 100;
  const rowContent =
    children ??
    (collapsed ? (
      <View style={styles.collapsedRow}>{center ?? left ?? right}</View>
    ) : (
      <AppHeaderRow left={left} center={center} right={right} />
    ));

  return (
    <View
      style={[
        styles.root,
        fullWidthBackdrop ? styles.rootMobile : { top: insets.top },
        style,
      ]}
    >
      {fullWidthBackdrop && <ChatHeaderBackdrop height={backdropHeight} />}

      <View
        style={[
          styles.content,
          collapsed && styles.contentCollapsed,
          fullWidthBackdrop
            ? { paddingTop: insets.top }
            : { paddingTop: HEADER_SHELL_PADDING },
        ]}
        onLayout={handleContentLayout}
      >
        <Pressable onPress={onPress}>
          <BlurredView
            style={[
              styles.blurColumn,
              collapsed && styles.blurColumnCollapsed,
              { borderRadius: collapsed ? 25 : borderRadius },
            ]}
          >
            {rowContent}
            {footer}
          </BlurredView>
        </Pressable>
        {belowBlur}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 1,
  },
  rootMobile: {
    top: 0,
  },
  content: {
    width: "100%",
    paddingHorizontal: HEADER_SHELL_PADDING,
    paddingBottom: HEADER_SHELL_PADDING,
    gap: HEADER_SHELL_PADDING,
  },
  contentCollapsed: {
    alignItems: "center",
  },
  blurColumn: {
    flexDirection: "column",
    width: "100%",
    paddingHorizontal: HEADER_INNER_PADDING,
  },
  blurColumnCollapsed: {
    width: 50,
    height: 50,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedRow: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AppHeader;
